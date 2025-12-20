import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,

  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Clock3,
  RefreshCw,
  ExternalLink,
  Loader2,
  InfoIcon,
} from "lucide-react";
import type { HomestayApplication } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PaymentInitiationResponse = {
  success: boolean;
  paymentUrl: string;
  merchantCode: string;
  encdata: string;
  checksum: string;
  appRefNo: string;
  totalAmount: number;
  actualAmount: number;
  isTestMode: boolean;
  isConfigured: boolean;
  message?: string;
};

type HimkoshTransaction = {
  id: string;
  appRefNo: string;
  transactionStatus: string | null;
  status: string | null;
  statusCd: string | null;
  echTxnId: string | null;
  bankCIN: string | null;
  totalAmount: number;
  merchantCode: string | null;
  deptId: string | null;
  serviceCode: string | null;
  ddo: string | null;
  head1: string | null;
  amount1: number | null;
  periodFrom: string | null;
  periodTo: string | null;
  challanPrintUrl: string | null;
  initiatedAt: string | null;
  respondedAt: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  paymentDate: string | null;
};

const PAYMENT_ALLOWED_STATUSES = new Set(["draft", "payment_pending", "verified_for_payment"]);
const FINAL_TRANSACTION_STATES = new Set(["success", "failed", "verified"]);
const HIMKOSH_PORTAL_URL =
  "https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx";

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getStatusMeta = (transaction: HimkoshTransaction | null) => {
  const status = transaction?.transactionStatus ?? null;
  const baseDescription =
    transaction?.status ??
    "Awaiting confirmation from HimKosh. Keep the payment window open until you see the success screen.";

  switch (status) {
    case "success":
      return {
        label: "Payment successful",
        description:
          transaction?.status ??
          "HimKosh confirmed the payment. The certificate will unlock once reconciliation completes.",
        badgeVariant: "default" as const,
      };
    case "verified":
      return {
        label: "Payment verified",
        description:
          transaction?.status ??
          "Payment double-verified with HimKosh. You may download the certificate from the application view.",
        badgeVariant: "default" as const,
      };
    case "failed":
      return {
        label: "Payment failed",
        description:
          transaction?.status ??
          "The gateway reported a failure. If money was deducted, share the HimKosh reference to reconcile manually.",
        badgeVariant: "destructive" as const,
      };
    case "initiated":
    case "redirected":
      return {
        label: "Awaiting HimKosh confirmation",
        description: baseDescription,
        badgeVariant: "secondary" as const,
      };
    case null:
      return {
        label: "No payment recorded",
        description: "Click “Proceed to Payment” to initiate a HimKosh transaction.",
        badgeVariant: "outline" as const,
      };
    default:
      return {
        label: status.replace(/_/g, " "),
        description: baseDescription,
        badgeVariant: "secondary" as const,
      };
  }
};

export default function HimKoshPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [paymentData, setPaymentData] = useState<PaymentInitiationResponse | null>(null);

  const { data: applicationData, isLoading: appLoading } = useQuery<{
    application: HomestayApplication;
  }>({
    queryKey: ["/api/applications", id],
    enabled: !!id,
  });
  const application = applicationData?.application;

  const {
    data: transactionData,
    isFetching: transactionsFetching,
  } = useQuery<{ transactions: HimkoshTransaction[] }>({
    queryKey: ["/api/himkosh/application", id, "transactions"],
    enabled: !!id,
  });

  const transactions = transactionData?.transactions ?? [];
  const latestTransaction = transactions[0] ?? null;

  const envTestMode = (() => {
    const raw = import.meta.env.VITE_HIMKOSH_TEST_MODE;
    if (typeof raw !== "string") {
      return false;
    }
    const normalized = raw.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return normalized === "true" || normalized === "1" || normalized === "yes";
  })();

  const applicationStatus = (application?.status ?? "").toLowerCase().trim();
  const isPaidPendingSubmit = applicationStatus === "paid_pending_submit";
  const applicationAllowsPayment = PAYMENT_ALLOWED_STATUSES.has(applicationStatus);

  const transactionStatus = latestTransaction?.transactionStatus ?? null;
  const paymentInProgress =
    !!latestTransaction && !FINAL_TRANSACTION_STATES.has(transactionStatus ?? "");
  // For draft applications, we only consider it "succeeded" if the app status moved out of draft.
  // Otherwise, even if we have a success txn, we might need to retry (e.g. callback failed).
  const paymentSucceeded =
    (transactionStatus === "success" || transactionStatus === "verified") &&
    applicationStatus !== "draft";
  const paymentFailed = transactionStatus === "failed";

  const showTestMode = !!paymentData?.isTestMode;

  const totalFee = Number.parseFloat(application?.totalFee ?? "0") || 0;
  const referenceAmount = paymentData?.actualAmount ?? totalFee;
  const gatewayAmount = paymentData?.totalAmount ?? referenceAmount;

  const statusMeta = useMemo(
    () => getStatusMeta(latestTransaction),
    [latestTransaction],
  );
  const lastUpdateIso =
    latestTransaction?.respondedAt ??
    latestTransaction?.verifiedAt ??
    latestTransaction?.updatedAt ??
    latestTransaction?.initiatedAt ??
    latestTransaction?.createdAt;
  const lastUpdate = formatDateTime(lastUpdateIso);

  const canRefreshStatus =
    !!latestTransaction &&
    !!latestTransaction.appRefNo &&
    !FINAL_TRANSACTION_STATES.has(transactionStatus ?? "");

  const appRefNo = latestTransaction?.appRefNo ?? paymentData?.appRefNo ?? "—";
  const himgrn = latestTransaction?.echTxnId ?? null;
  const bankRef = latestTransaction?.bankCIN ?? null;
  const challanUrl = latestTransaction?.challanPrintUrl ?? null;

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/himkosh/initiate", {
        applicationId: id,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setPaymentData(data as PaymentInitiationResponse);
      queryClient.invalidateQueries({
        queryKey: ["/api/himkosh/application", id, "transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id] });

      if (!data.isConfigured) {
        toast({
          title: "Test Mode",
          description:
            "HimKosh integration is using placeholder credentials. Treasury responses will be for testing only.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (appRef: string) => {
      const response = await apiRequest("POST", `/api/himkosh/verify/${appRef}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/himkosh/application", id, "transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id] });
      toast({
        title: "Verification queued",
        description: "Double verification requested. Status will refresh once HimKosh responds.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Unable to contact HimKosh verification service.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/himkosh/application/${id}/reset`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/himkosh/application", id, "transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id] });
      setPaymentData(null);
      toast({
        title: "Payment attempt cancelled",
        description: "You can initiate a fresh HimKosh transaction now.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to cancel attempt",
        description: error.message || "Could not reset the pending payment attempt.",
        variant: "destructive",
      });
    },
  });

  const manualSubmitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/applications/${id}/submit`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id] });
      toast({
        title: "Application Submitted",
        description: "Your application has been successfully submitted for processing.",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  // Auto-submit form when payment data is ready and configured
  useEffect(() => {
    if (paymentData && formRef.current && paymentData.isConfigured) {
      formRef.current.submit();
    }
  }, [paymentData]);

  // Poll for status while payment is in progress
  useEffect(() => {
    if (!paymentInProgress) {
      return;
    }

    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ["/api/himkosh/application", id, "transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id] });
    }, 15000);

    return () => clearInterval(interval);
  }, [id, paymentInProgress, latestTransaction?.id]);

  // Refresh application info once payment succeeds
  useEffect(() => {
    if (paymentSucceeded) {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id] });
    }
  }, [paymentSucceeded, id]);

  if (appLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-lg text-muted-foreground">Loading payment details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This application is not available or you do not have access.
          </AlertDescription>
        </Alert>
        <Button onClick={() => setLocation("/dashboard")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const paymentButtonDisabled =
    initiateMutation.isPending ||
    paymentInProgress ||
    paymentSucceeded ||
    !applicationAllowsPayment;

  let paymentButtonLabel = "Proceed to Payment";
  if (initiateMutation.isPending) paymentButtonLabel = "Initiating…";
  else if (!applicationAllowsPayment && !paymentSucceeded && !paymentInProgress)
    paymentButtonLabel = "Payment Disabled";
  else if (paymentInProgress) paymentButtonLabel = "Payment In Progress";
  else if (paymentSucceeded) paymentButtonLabel = "Payment Completed";
  else if (paymentFailed) paymentButtonLabel = "Retry Payment";

  const paymentInfoMessage =
    !applicationAllowsPayment && !paymentSucceeded && !paymentInProgress
      ? "This application is not currently marked as payment pending. Officers must enable payment before you can retry."
      : null;

  return (
    <div className="bg-background">
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Complete Payment via HimKosh</h1>
          <p className="text-muted-foreground mt-2">
            Application #{application.applicationNumber} — {application.propertyName}
          </p>
        </div>

        {paymentSucceeded && (
          isPaidPendingSubmit ? (
            <Alert className="border-blue-200 bg-blue-50 text-blue-900">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="flex flex-col gap-3">
                  <p>
                    Payment confirmed by HimKosh (Ref:{" "}
                    <span className="font-semibold">{himgrn ?? "N/A"}</span>).
                  </p>
                  <p className="font-medium">
                    One final step: Please click below to submit your application for processing.
                  </p>
                  <div className="mt-2">
                    <Button
                      onClick={() => manualSubmitMutation.mutate()}
                      disabled={manualSubmitMutation.isPending}
                    >
                      {manualSubmitMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Submit Application Now
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50 text-green-900">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Payment recorded by HimKosh. Treasury reference{" "}
                {himgrn ? (
                  <span className="font-semibold">{himgrn}</span>
                ) : (
                  "will appear once reconciliation completes"
                )}
                {bankRef ? (
                  <>
                    {" "}
                    (Bank CIN <span className="font-semibold">{bankRef}</span>)
                  </>
                ) : null}
                . Download the certificate from the application overview once it is generated.
              </AlertDescription>
            </Alert>
          )
        )}

        {paymentFailed && (
          <Alert className="border-red-200 bg-red-50 text-red-900">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The last payment attempt failed. Please retry below. If money was deducted, share the
              HimKosh reference with support to reconcile manually.
            </AlertDescription>
          </Alert>
        )}

        {paymentInProgress && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-900">
            <Clock3 className="h-4 w-4" />
            <AlertDescription>
              Payment request{" "}
              <span className="font-semibold">{appRefNo}</span> is in progress. Complete the
              HimKosh flow in the opened tab; this page will update once treasury responds.
            </AlertDescription>
          </Alert>
        )}

        {paymentInfoMessage && (
          <Alert className="bg-blue-50 border-blue-200 text-blue-900">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{paymentInfoMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Fee Breakdown
              </CardTitle>
              <CardDescription>Registration fee calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge variant="outline" className="uppercase">
                    {application.category}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Rooms</span>
                  <span className="font-medium">{application.totalRooms}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Certificate Validity</span>
                  <Badge variant="secondary">
                    {application.certificateValidityYears || 1}{" "}
                    {(application.certificateValidityYears || 1) === 1 ? "Year" : "Years"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Base Fee (Annual)</span>
                  <span>₹{Number.parseFloat(application.baseFee || "0").toLocaleString("en-IN")}</span>
                </div>
                {application.certificateValidityYears && application.certificateValidityYears > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      Total for {application.certificateValidityYears} Years
                    </span>
                    <span>
                      ₹{Number.parseFloat(application.totalBeforeDiscounts || "0").toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {Number.parseFloat(application.totalDiscount || "0") > 0 && (
                  <>
                    <Separator />
                    <div className="text-xs font-medium text-muted-foreground">
                      Discounts Applied:
                    </div>
                    {Number.parseFloat(application.validityDiscount || "0") > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm">3-Year Lump Sum (10%)</span>
                        <span>
                          -₹{Number.parseFloat(application.validityDiscount || "0").toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {Number.parseFloat(application.femaleOwnerDiscount || "0") > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm">Women Entrepreneur (5%)</span>
                        <span>
                          -₹{Number.parseFloat(application.femaleOwnerDiscount || "0").toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {Number.parseFloat(application.pangiDiscount || "0") > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm">Pangi Sub-Division (50%)</span>
                        <span>
                          -₹{Number.parseFloat(application.pangiDiscount || "0").toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <Separator />
                <div className="flex justify-between items-center text-base font-semibold">
                  <span>Total Amount</span>
                  <span>₹{totalFee.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/40 bg-primary/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Government Payment Gateway
              </CardTitle>
              <CardDescription>Secure payment via HimKosh Cyber Treasury</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-primary/30 bg-background p-4 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">
                      HimKosh • HP Cyber Treasury Portal
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Official payment gateway of Himachal Pradesh Government for secure online transactions.
                  </p>
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      Credit / Debit Cards
                    </span>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      UPI (GPay, PhonePe)
                    </span>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      Net Banking
                    </span>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      Wallets & More
                    </span>
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium text-sm mb-2">Quick steps:</div>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Click “Proceed to Payment”.</li>
                    <li>A new HimKosh tab opens automatically.</li>
                    <li>Complete the payment using your preferred method.</li>
                    <li>Keep this page open; it updates once HimKosh responds.</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (paymentData && paymentData.isConfigured) {
                    // POPUP WINDOW STRATEGY (Requested by User):
                    // 1. Open a "sized" popup window first. Chrome treats these as "Apps" and is less aggressive.
                    const width = 1024;
                    const height = 800;
                    const left = (window.screen.width - width) / 2;
                    const top = (window.screen.height - height) / 2;

                    const popup = window.open(
                      "",
                      "HimKoshPayment",
                      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
                    );

                    if (popup) {
                      // 2. Create and submit form into this named window
                      const form = document.createElement("form");
                      form.method = "POST";
                      form.action = paymentData.paymentUrl;
                      form.target = "HimKoshPayment"; // Matches window name
                      form.style.display = "none";

                      const input1 = document.createElement("input");
                      input1.type = "hidden";
                      input1.name = "encdata";
                      input1.value = paymentData.encdata;
                      form.appendChild(input1);

                      const input2 = document.createElement("input");
                      input2.type = "hidden";
                      input2.name = "merchant_code";
                      input2.value = paymentData.merchantCode;
                      form.appendChild(input2);

                      document.body.appendChild(form);
                      form.submit();

                      // Cleanup
                      setTimeout(() => document.body.removeChild(form), 500);
                    } else {
                      alert("Popup blocked! Please allow popups for this site.");
                    }
                  } else {
                    initiateMutation.mutate();
                  }
                }}
                disabled={paymentButtonDisabled}
                className="w-full"
                size="lg"
              >
                {initiateMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {paymentButtonLabel}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Pay Now
                  </span>
                )}
              </Button>
              {showTestMode && (
                <Card className="border-orange-200 bg-orange-50 mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="h-5 w-5" />
                      Test Payment Mode Active
                    </CardTitle>
                    <CardDescription className="text-orange-700">
                      Gateway will receive{" "}
                      <span className="font-semibold">
                        ₹{gatewayAmount.toLocaleString("en-IN")}
                      </span>{" "}
                      (test amount)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-orange-800 space-y-1">
                    <p>
                      Actual fee (for records):{" "}
                      <span className="font-medium">
                        ₹{referenceAmount.toLocaleString("en-IN")}
                      </span>
                    </p>
                    <p className="text-xs">
                      This run is for interface verification only—₹1 is sent to HimKosh while the
                      full calculation remains for departmental review.
                    </p>
                    <p className="text-xs">
                      Disable test mode in the deployment configuration before collecting the full amount.
                    </p>
                    <p className="text-xs">
                      Transaction ID: <span className="font-mono">{appRefNo}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              {paymentData?.message && paymentData.isConfigured && (
                <Alert className="border-primary/40 bg-primary/5">
                  <AlertDescription className="text-sm text-primary">
                    {paymentData.message}
                  </AlertDescription>
                </Alert>
              )}

              {paymentData && paymentData.isConfigured && (
                <div className="text-center text-sm text-muted-foreground">
                  Redirecting to HimKosh payment gateway…
                </div>
              )}

              {paymentData && (
                <form
                  ref={formRef}
                  method="POST"
                  action={paymentData.paymentUrl}
                  className="hidden"
                >
                  <input type="hidden" name="encdata" value={paymentData.encdata} />
                  <input type="hidden" name="merchant_code" value={paymentData.merchantCode} />
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Payment Status
                </CardTitle>
                <CardDescription>Track the latest status returned by HimKosh</CardDescription>
              </div>
              {transactionsFetching && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Syncing…
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {latestTransaction ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground tracking-wide">
                        Status
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">{statusMeta.label}</span>
                        <Badge variant={statusMeta.badgeVariant}>
                          {transactionStatus ?? "pending"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="uppercase tracking-wide">Last update</div>
                      <div className="font-medium text-foreground">{lastUpdate}</div>
                    </div>
                  </div>

                  <Separator />

                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground tracking-wide">
                        App Reference
                      </dt>
                      <dd className="font-mono">{latestTransaction.appRefNo}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground tracking-wide">
                        Gateway Amount
                      </dt>
                      <dd className="font-medium">
                        ₹{(latestTransaction.totalAmount ?? 0).toLocaleString("en-IN")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground tracking-wide">
                        HimKosh GRN
                      </dt>
                      <dd className="font-mono">{himgrn ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground tracking-wide">
                        Bank CIN
                      </dt>
                      <dd className="font-mono">{bankRef ?? "—"}</dd>
                    </div>
                  </dl>

                  <p className="text-xs text-muted-foreground">{statusMeta.description}</p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        latestTransaction?.appRefNo &&
                        verifyMutation.mutate(latestTransaction.appRefNo)
                      }
                      disabled={!canRefreshStatus || verifyMutation.isPending}
                    >
                      {verifyMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-2" />
                      )}
                      Refresh Status
                    </Button>
                    {paymentInProgress && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              "Cancel this HimKosh attempt and start again? Only do this if you did not complete payment in the treasury window.",
                            )
                          ) {
                            cancelMutation.mutate();
                          }
                        }}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        ) : null}
                        Cancel Attempt
                      </Button>
                    )}
                    {challanUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={challanUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          View Challan
                        </a>
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No payment attempts recorded yet. Click “Proceed to Payment” to start a HimKosh
                  transaction.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Gateway Diagnostics
              </CardTitle>
              <CardDescription>Technical snapshot of the last request sent to HimKosh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mode</span>
                <Badge variant="outline" className="uppercase">
                  {paymentData?.isConfigured === false ? "Placeholder" : "Encrypted"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gateway URL</span>
                <a
                  href={paymentData?.paymentUrl ?? HIMKOSH_PORTAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary flex items-center gap-1 text-xs"
                >
                  HimKosh Portal <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Separator />
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Merchant Code</dt>
                  <dd className="font-mono text-xs">
                    {latestTransaction?.merchantCode ?? paymentData?.merchantCode ?? "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Service Code</dt>
                  <dd className="font-mono text-xs">
                    {latestTransaction?.serviceCode ?? "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">DDO</dt>
                  <dd className="font-mono text-xs">{latestTransaction?.ddo ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Head of Account</dt>
                  <dd className="font-mono text-xs">{latestTransaction?.head1 ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Period</dt>
                  <dd className="font-mono text-xs">
                    {latestTransaction?.periodFrom && latestTransaction?.periodTo
                      ? `${latestTransaction.periodFrom} → ${latestTransaction.periodTo}`
                      : "—"}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Keep this page open while completing the payment on HimKosh. If the session expires,
                reopen the payment window and retry.
              </p>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your payment is secured by HP Government's Cyber Treasury Portal. After successful
            payment, your certificate will be generated automatically and made available for download.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
