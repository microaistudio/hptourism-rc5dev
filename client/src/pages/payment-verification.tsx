import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, CheckCircle2, AlertCircle, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { HomestayApplication, Payment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PendingPayment {
  application: HomestayApplication;
  payment: Payment | null;
}

export default function PaymentVerificationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copiedTxnId, setCopiedTxnId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ pendingPayments: PendingPayment[] }>({
    queryKey: ["/api/payments/pending"],
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiRequest("POST", `/api/payments/${paymentId}/confirm`, {});
      return await response.json() as { certificateNumber: string; applicationId: string };
    },
    onSuccess: (data) => {
      // Invalidate all relevant caches so UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      // Invalidate the specific application cache for the owner
      if (data.applicationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/applications", data.applicationId] });
      }
      toast({
        title: "Payment Confirmed",
        description: `Certificate ${data.certificateNumber} has been issued successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive",
      });
    },
  });

  const handleCopyTxnId = (txnId: string) => {
    navigator.clipboard.writeText(txnId);
    setCopiedTxnId(txnId);
    setTimeout(() => setCopiedTxnId(null), 2000);
  };

  const pendingPayments = data?.pendingPayments || [];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/workflow-monitoring")} data-testid="button-back">
          ← Back to Workflow Monitoring
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payment Verification</h1>
          <p className="text-muted-foreground mt-2">
            Verify UPI payments and issue certificates to approved applications
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pending Payment Verifications
                </CardTitle>
                <CardDescription>
                  {pendingPayments.length} application{pendingPayments.length !== 1 ? 's' : ''} awaiting payment confirmation
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg">
                {pendingPayments.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading pending payments...</p>
              </div>
            ) : pendingPayments.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Payments Verified</h3>
                <p className="text-muted-foreground">
                  There are no pending payment verifications at this time.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application</TableHead>
                      <TableHead>Property Details</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>UPI Transaction ID</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map(({ application, payment }) => {
                      if (!payment) return null;
                      
                      const totalFee = Number(application.totalFee ?? 0);
                      const hasTxnId = payment.gatewayTransactionId && payment.gatewayTransactionId.length > 0;
                      
                      return (
                        <TableRow key={application.id} data-testid={`row-payment-${application.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{application.applicationNumber}</div>
                              <div className="text-sm text-muted-foreground">{application.district}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{application.propertyName}</div>
                              <div className="text-sm text-muted-foreground">
                                <Badge variant="outline" className="capitalize mr-2">
                                  {application.category}
                                </Badge>
                                {application.totalRooms} rooms
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">₹{totalFee.toLocaleString('en-IN')}</div>
                          </TableCell>
                          <TableCell>
                            {hasTxnId ? (
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-1 rounded text-sm">
                                  {payment.gatewayTransactionId}
                                </code>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleCopyTxnId(payment.gatewayTransactionId ?? "")}
                                  className="h-6 w-6"
                                  data-testid={`button-copy-txn-${application.id}`}
                                >
                                  {copiedTxnId === payment.gatewayTransactionId ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No transaction ID</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={payment.paymentStatus === 'pending_verification' ? 'secondary' : 'outline'}
                            >
                              {payment.paymentStatus === 'pending_verification' ? 'Pending Verification' : payment.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocation(`/applications/${application.id}`)}
                                data-testid={`button-view-app-${application.id}`}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {hasTxnId && (
                                <Button
                                  size="sm"
                                  onClick={() => confirmPaymentMutation.mutate(payment.id)}
                                  disabled={confirmPaymentMutation.isPending}
                                  data-testid={`button-confirm-${application.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  {confirmPaymentMutation.isPending ? 'Confirming...' : 'Confirm Payment'}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Instructions:</strong> Verify that the UPI transaction ID matches the payment received in your bank account 
            (subhash.thakur.india@oksbi). Once verified, click "Confirm Payment" to issue the registration certificate.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
