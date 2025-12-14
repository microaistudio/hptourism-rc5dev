import { useState, useEffect, type ChangeEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  Database,
  Trash2,
  RefreshCw,
  Users,
  FileText,
  Clock,
  Zap,
  HardDrive,
  ShieldAlert,
  ShieldCheck,
  TestTube,
  Download,
  Loader2,
  PlayCircle,
  Terminal,
  UploadCloud,
  CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CommunicationsCard } from "@/components/admin/communications-card";
import { NotificationRulesCard } from "@/components/admin/notification-rules-card";
import type { HimkoshTransaction } from "@shared/schema";

interface SystemStats {
  database: {
    size: string;
    tables: number;
  };
  applications: {
    total: number;
    byStatus: Record<string, number>;
  };
  users: {
    total: number;
    byRole: Record<string, number>;
  };
  files: {
    total: number;
    totalSize: string;
  };
  environment: string;
  resetEnabled: boolean;
  superConsoleOverride?: boolean;
}

type ResetOperation =
  | "full"
  | "applications"
  | "users"
  | "files"
  | "timeline"
  | "inspections"
  | "objections"
  | "payments";

interface ResetDialogState {
  open: boolean;
  operation: ResetOperation | null;
  confirmationText: string;
  reason: string;
  password: string;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }
  return currencyFormatter.format(value);
};

const HIMKOSH_ACTIVITY_LIMIT = 25;

interface SmokeTestLog {
  runId: string | null;
  path: string | null;
  content: string;
}

interface SmokeTestStatus {
  running: boolean;
  runId: string | null;
  startedAt: string | null;
  exitCode: number | null;
  lastRunId: string | null;
  lastFinishedAt: string | null;
  lastExitCode: number | null;
  logPath: string | null;
  lastLogPath: string | null;
  log: SmokeTestLog;
  reportPath: string | null;
}

interface HimkoshGatewayResponse {
  effective: {
    merchantCode?: string;
    deptId?: string;
    serviceCode?: string;
    ddo?: string;
    heads?: {
      registrationFee?: string;
      secondaryHead?: string | null;
      secondaryHeadAmount?: number | null;
    };
    returnUrl?: string;
    configStatus?: string;
  };
  overrides: {
    merchantCode?: string;
    deptId?: string;
    serviceCode?: string;
    ddo?: string;
    head1?: string;
    head2?: string;
    head2Amount?: number | null;
    returnUrl?: string;
    allowFallback?: boolean;
  } | null;
  updatedAt?: string;
  updatedBy?: string | null;
  source: "database" | "env";
}

interface HimkoshDdoCode {
  id: string;
  district: string;
  ddoCode: string;
  ddoDescription: string;
  treasuryCode: string;
  isActive: boolean | null;
  updatedAt?: string | null;
}

interface HimkoshDdoTestResult {
  success: boolean;
  requestedDistrict: string | null;
  requestedTehsil: string | null;
  routedDistrict: string | null;
  mapping: {
    district: string;
    ddoCode: string;
    treasuryCode: string | null;
  } | null;
  ddoUsed: string;
  ddoSource: "manual_override" | "district_mapping" | "default_config";
  payload: {
    params: Record<string, unknown>;
    coreString: string;
    fullString: string;
    checksum: string;
    encrypted: string;
    paymentUrl: string;
  };
}

const CLEAR_HIMKOSH_LOG_PHRASE = "CLEAR HIMKOSH LOG";

interface SmokeRunResponse {
  message: string;
  runId: string;
  logPath: string | null;
  startedAt: string;
}

interface DbConfigSettings {
  host: string;
  port: number;
  database: string;
  user: string;
}

interface DbConfigMetadata {
  lastAppliedAt?: string | null;
  lastVerifiedAt?: string | null;
  lastVerificationResult?: "success" | "failure" | null;
  lastVerificationMessage?: string | null;
}

interface DbConfigResponse {
  settings: DbConfigSettings | null;
  hasPassword: boolean;
  metadata: DbConfigMetadata;
  source: "stored" | "env" | "none";
}

type StaffRowStatus = "created" | "updated" | "skipped" | "would_create" | "would_update";

interface StaffAccountRowResult {
  status: StaffRowStatus;
  username: string;
  mobile: string;
  defaultPassword?: string;
  reason?: string;
}

interface StaffImportDetail {
  district: string;
  ddoCode: string;
  rowNumber: number;
  da?: StaffAccountRowResult;
  dtdo?: StaffAccountRowResult;
}

interface StaffImportSummary {
  districts: number;
  accountsAttempted: number;
  created: number;
  updated: number;
  skipped: number;
  wouldCreate: number;
  wouldUpdate: number;
}

interface StaffImportResponse {
  message: string;
  dryRun: boolean;
  summary: StaffImportSummary;
  errors: string[];
  details: StaffImportDetail[];
  passwordFormat: string;
}

const STAFF_STATUS_LABELS: Record<StaffRowStatus, string> = {
  created: "Created",
  updated: "Updated",
  skipped: "Skipped",
  would_create: "Would create",
  would_update: "Would update",
};

const STAFF_STATUS_CLASSES: Record<StaffRowStatus, string> = {
  created: "bg-emerald-100 text-emerald-800 border-emerald-200",
  updated: "bg-sky-100 text-sky-800 border-sky-200",
  skipped: "bg-red-100 text-red-800 border-red-200",
  would_create: "bg-slate-100 text-slate-700 border-slate-300",
  would_update: "bg-amber-100 text-amber-800 border-amber-200",
};

const SECTION_LINKS = [
  { id: "system-overview", label: "System Status" },
  { id: "database", label: "Database" },
  { id: "export-import", label: "Export / Import" },
  { id: "reset-zone", label: "Reset & Seeds" },
  { id: "payment-settings", label: "Payments" },
  { id: "communications", label: "Communications" },
  { id: "security", label: "Security" },
  { id: "staff-tools", label: "District Staff" },
  { id: "smoke-tests", label: "Smoke Tests" },
  { id: "test-data", label: "Test Data" },
];
export default function SuperAdminConsole() {
  const { toast } = useToast();
  const [resetDialog, setResetDialog] = useState<ResetDialogState>({
    open: false,
    operation: null,
    confirmationText: "",
    reason: "",
    password: "",
  });
  const [transactionDialog, setTransactionDialog] = useState<{
    open: boolean;
    transaction: HimkoshTransaction | null;
  }>({
    open: false,
    transaction: null,
  });
  const [seedCount, setSeedCount] = useState(10);
  const [staffCsvName, setStaffCsvName] = useState("");
  const [staffCsvText, setStaffCsvText] = useState("");
  const [staffDryRun, setStaffDryRun] = useState(true);
  const [staffImportResult, setStaffImportResult] = useState<StaffImportResponse | null>(null);

  // Granular reset state
  const [granularResetDialog, setGranularResetDialog] = useState({
    open: false,
    selections: {
      deleteApplications: true,
      deleteDocuments: true,
      deletePayments: true,
      deleteInspections: true,
      deleteCertificates: true,
      deleteNotifications: true,
      deletePropertyOwners: false,
    },
    confirmationText: "",
    reason: "",
  });
  const openTestModeDialog = (targetEnabled: boolean) => {
    setTestModeDialog({
      open: true,
      targetEnabled,
      confirmationText: "",
      reason: "",
    });
  };

  const closeTestModeDialog = () => {
    setTestModeDialog({
      open: false,
      targetEnabled: false,
      confirmationText: "",
      reason: "",
    });
  };
  const handleDbInputChange = (field: keyof typeof dbForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDbForm((prev) => ({ ...prev, [field]: value }));
  };
  const formatDateTime = (value?: string | Date | null) =>
    value ? new Date(value).toLocaleString() : null;
  const handleGatewayInputChange =
    (field: keyof typeof gatewayForm) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setGatewayForm((prev) => ({ ...prev, [field]: value }));
    };
  const openTransactionDetails = (transaction: HimkoshTransaction) => {
    setTransactionDialog({
      open: true,
      transaction,
    });
  };
  const closeTransactionDialog = () => {
    setTransactionDialog({
      open: false,
      transaction: null,
    });
  };
  const [testModeDialog, setTestModeDialog] = useState<{
    open: boolean;
    targetEnabled: boolean;
    confirmationText: string;
    reason: string;
  }>({
    open: false,
    targetEnabled: false,
    confirmationText: "",
    reason: "",
  });
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Fetch system statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch test payment mode status
  const { data: testModeData, isLoading: testModeLoading, refetch: refetchTestMode } = useQuery<{
    enabled: boolean;
    isDefault: boolean;
  }>({
    queryKey: ["/api/admin/settings/payment/test-mode"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/settings/payment/test-mode");
      return response.json();
    },
  });

  // Payment Workflow Setting (upfront vs on_approval) + Submit Mode (auto vs manual)
  const { data: paymentWorkflowData, isLoading: paymentWorkflowLoading } = useQuery<{
    workflow: "upfront" | "on_approval";
    upfrontSubmitMode: "auto" | "manual";
    source: string;
  }>({
    queryKey: ["/api/admin/settings/payment/workflow"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/settings/payment/workflow");
      return response.json();
    },
  });

  const togglePaymentWorkflowMutation = useMutation({
    mutationFn: async (workflow: "upfront" | "on_approval") => {
      const response = await apiRequest("POST", "/api/admin/settings/payment/workflow/toggle", { workflow });
      if (!response.ok) throw new Error("Failed to update payment workflow");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/payment/workflow"] });
      toast({
        title: "Payment workflow updated",
        description: `Payment is now required ${paymentWorkflowData?.workflow === "upfront" ? "after approval" : "before submission"}.`,
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Could not update payment workflow setting.",
        variant: "destructive",
      });
    },
  });

  const toggleSubmitModeMutation = useMutation({
    mutationFn: async (upfrontSubmitMode: "auto" | "manual") => {
      const response = await apiRequest("POST", "/api/admin/settings/payment/workflow/submit-mode", { upfrontSubmitMode });
      if (!response.ok) throw new Error("Failed to update submit mode");
      return response.json();
    },
    onSuccess: (_data, upfrontSubmitMode) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/payment/workflow"] });
      toast({
        title: "Submit mode updated",
        description: upfrontSubmitMode === "auto"
          ? "Applications will auto-submit after successful payment."
          : "Users will need to manually submit after completing payment.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Could not update submit mode setting.",
        variant: "destructive",
      });
    },
  });

  const { data: captchaData, isLoading: captchaLoading, refetch: refetchCaptcha } = useQuery<{
    enabled: boolean;
  }>({
    queryKey: ["/api/admin/settings/auth/captcha"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/settings/auth/captcha");
      return response.json();
    },
  });

  const {
    data: himkoshActivity,
    isLoading: himkoshActivityLoading,
    refetch: refetchHimkoshActivity,
  } = useQuery<{
    transactions: HimkoshTransaction[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/himkosh/transactions", HIMKOSH_ACTIVITY_LIMIT],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/himkosh/transactions?limit=${HIMKOSH_ACTIVITY_LIMIT}`,
      );
      return response.json();
    },
  });

  const {
    data: himkoshGatewayData,
    isLoading: himkoshGatewayLoading,
    refetch: refetchHimkoshGateway,
  } = useQuery<HimkoshGatewayResponse>({
    queryKey: ["/api/admin/payments/himkosh"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/payments/himkosh");
      return response.json();
    },
  });

  const { data: dbConfigData, isLoading: isDbConfigLoading } = useQuery<DbConfigResponse>({
    queryKey: ["/api/admin/db/config"],
  });
  const { data: ddoCodesData, isLoading: ddoCodesLoading } = useQuery<{ codes: HimkoshDdoCode[] }>({
    queryKey: ["/api/admin/payments/himkosh/ddo-codes"],
  });

  const [dbForm, setDbForm] = useState({
    host: "",
    port: "5432",
    database: "",
    user: "",
    password: "",
  });
  const [dbApplyEnv, setDbApplyEnv] = useState(true);
  const [dbHasPassword, setDbHasPassword] = useState(false);
  const [gatewayForm, setGatewayForm] = useState({
    merchantCode: "",
    deptId: "",
    serviceCode: "",
    ddo: "",
    head1: "",
    head2: "",
    head2Amount: "",
    returnUrl: "",
    allowFallback: true,
  });
  const [clearLogDialog, setClearLogDialog] = useState({
    open: false,
    confirmationText: "",
  });
  const [ddoTestForm, setDdoTestForm] = useState({
    district: "",
    tehsil: "",
    manualDdo: "",
    amount: "1",
    tenderBy: "Test Applicant",
  });
  const [ddoTestResult, setDdoTestResult] = useState<HimkoshDdoTestResult | null>(null);

  useEffect(() => {
    if (dbConfigData?.settings) {
      setDbForm({
        host: dbConfigData.settings.host,
        port: String(dbConfigData.settings.port),
        database: dbConfigData.settings.database,
        user: dbConfigData.settings.user,
        password: "",
      });
      setDbHasPassword(dbConfigData.hasPassword);
    }
  }, [dbConfigData]);
  useEffect(() => {
    if (!himkoshGatewayData) {
      return;
    }
    const effective = himkoshGatewayData.effective;
    const source = himkoshGatewayData.overrides || effective;
    if (!source) return;
    const heads = (source as any).heads ?? effective?.heads;

    setGatewayForm({
      merchantCode: source.merchantCode ?? "",
      deptId: source.deptId ?? "",
      serviceCode: source.serviceCode ?? "",
      ddo: source.ddo ?? "",
      head1: (source as any).head1 ?? (heads as any)?.registrationFee ?? (effective as any)?.head1 ?? "",
      head2: (source as any).head2 ?? (heads as any)?.secondaryHead ?? (effective as any)?.head2 ?? "",
      head2Amount:
        ((source as any).head2Amount ??
          (heads as any)?.secondaryHeadAmount ??
          (effective as any)?.head2Amount ??
          "")?.toString() ?? "",
      returnUrl: source.returnUrl ?? (effective as any)?.returnUrl ?? "",
      allowFallback:
        (source as any).allowFallback === undefined ? true : Boolean((source as any).allowFallback),
    });
  }, [himkoshGatewayData]);
  const latestTransactions = himkoshActivity?.transactions ?? [];
  const totalHimkoshTransactions = himkoshActivity?.total ?? 0;
  const selectedTransaction = transactionDialog.transaction;
  const gatewayHasOverrides = Boolean(himkoshGatewayData?.overrides);
  const gatewayRequiredMissing =
    !gatewayForm.merchantCode.trim() ||
    !gatewayForm.deptId.trim() ||
    !gatewayForm.serviceCode.trim() ||
    !gatewayForm.ddo.trim() ||
    !gatewayForm.head1.trim();
  // Fetch ClamAV scanning status
  const {
    data: clamavStatus,
    isLoading: clamavLoading,
    refetch: refetchClamav,
  } = useQuery<{
    enabled: boolean;
    source: "env" | "db";
    defaultEnabled: boolean;
  }>({
    queryKey: ["/api/admin/settings/security/clamav"],
  });

  const {
    data: smokeStatus,
    isLoading: smokeStatusLoading,
    refetch: refetchSmokeStatus,
  } = useQuery<SmokeTestStatus>({
    queryKey: ["/api/admin/smoke-test/status"],
    refetchInterval: (query) =>
      query.state.data?.running ? 4000 : false,
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async ({ operation, confirmationText, reason }: {
      operation: ResetOperation;
      confirmationText: string;
      reason: string;
    }) => {
      const response = await apiRequest("POST", `/api/admin/reset/${operation}`, {
        confirmationText,
        reason,
      });
      return response.json() as Promise<{ success: boolean; message: string; deletedCounts?: any }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Reset completed successfully",
        description: data.message || 'Operation completed',
      });
      setResetDialog({ open: false, operation: null, confirmationText: "", reason: "" });
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message || "An error occurred during reset",
        variant: "destructive",
      });
    },
  });

  // Granular reset mutation
  const granularResetMutation = useMutation({
    mutationFn: async (data: {
      deleteApplications: boolean;
      deleteDocuments: boolean;
      deletePayments: boolean;
      deleteInspections: boolean;
      deleteCertificates: boolean;
      deleteNotifications: boolean;
      deletePropertyOwners: boolean;
      confirmationText: string;
      reason: string;
    }) => {
      const response = await apiRequest("POST", "/api/admin/reset/granular", data);
      return response.json() as Promise<{ success: boolean; message: string; deletedCounts?: Record<string, string>; preserved?: string[] }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Granular reset completed",
        description: data.message || "Selected data has been cleared",
      });
      setGranularResetDialog({
        open: false,
        selections: {
          deleteApplications: true,
          deleteDocuments: true,
          deletePayments: true,
          deleteInspections: true,
          deleteCertificates: true,
          deleteNotifications: true,
          deletePropertyOwners: false,
        },
        confirmationText: "",
        reason: "",
      });
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "Granular reset failed",
        description: error.message || "An error occurred during reset",
        variant: "destructive",
      });
    },
  });

  // Seed data mutation
  const seedMutation = useMutation({
    mutationFn: async ({ type, count }: {
      type: "applications" | "users";
      count?: number;
    }) => {
      const response = await apiRequest("POST", `/api/admin/seed/${type}`, { count });
      return response.json() as Promise<{ success: boolean; message: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Test data generated",
        description: data.message || "Data created successfully",
      });
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "Seed failed",
        description: error.message || "Failed to generate test data",
        variant: "destructive",
      });
    },
  });

  // Toggle test payment mode mutation
  const toggleTestModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/admin/settings/payment/test-mode/toggle", { enabled });
      return enabled;
    },
    onSuccess: (_data, enabled) => {
      toast({
        title: enabled ? "Test payment mode enabled" : "Test payment mode disabled",
        description: enabled
          ? "🧪 Payment requests will send ₹1 to gateway (for testing)"
          : "Payment requests will send actual calculated amounts",
      });
      refetchTestMode();
      setTestModeDialog({
        open: false,
        targetEnabled: false,
        confirmationText: "",
        reason: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update test mode",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });
  const testModeConfirmPhrase = testModeDialog.targetEnabled ? "ENABLE" : "PRODUCTION";
  const isTestModeConfirmValid =
    testModeDialog.confirmationText.trim().toUpperCase() === testModeConfirmPhrase &&
    testModeDialog.reason.trim().length >= 15;

  const handleConfirmTestModeChange = () => {
    if (!isTestModeConfirmValid || toggleTestModeMutation.isPending) {
      return;
    }
    toggleTestModeMutation.mutate(testModeDialog.targetEnabled);
  };

  const toggleCaptchaMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/admin/settings/auth/captcha/toggle", { enabled });
      return enabled;
    },
    onSuccess: (_data, enabled) => {
      toast({
        title: enabled ? "Captcha enabled" : "Captcha disabled",
        description: enabled
          ? "Users must solve a math captcha before logging in."
          : "Captcha has been disabled for this environment (useful during demos).",
      });
      refetchCaptcha();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update captcha setting",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const testDbConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/db/config/test", {
        settings: {
          host: dbForm.host,
          port: Number(dbForm.port || 5432),
          database: dbForm.database,
          user: dbForm.user,
          password: dbForm.password || undefined,
        },
      });
      return response.json();
    },
    onSuccess: (data: { version?: string }) => {
      toast({
        title: "Connection successful",
        description: data?.version ? `Server version: ${data.version}` : "Connection test succeeded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/db/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error?.message || "Unable to connect with the provided settings.",
        variant: "destructive",
      });
    },
  });

  const saveDbConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/admin/db/config", {
        host: dbForm.host,
        port: Number(dbForm.port || 5432),
        database: dbForm.database,
        user: dbForm.user,
        password: dbForm.password,
        applyEnv: dbApplyEnv,
      });
      return response.json();
    },
    onSuccess: (data: { message: string }) => {
      toast({
        title: "Database settings saved",
        description: data?.message || "Configuration saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/db/config"] });
      setDbForm((prev) => ({ ...prev, password: "" }));
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save settings",
        description: error?.message || "An error occurred while saving these values.",
        variant: "destructive",
      });
    },
  });

  const toggleClamavMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/admin/settings/security/clamav/toggle", { enabled });
      return enabled;
    },
    onSuccess: (_data, enabled) => {
      toast({
        title: enabled ? "Antivirus scanning enabled" : "Antivirus scanning disabled",
        description: enabled
          ? "All uploaded documents (including S3/MinIO storage) will be scanned by ClamAV."
          : "Uploads will skip antivirus scanning until you re-enable it.",
      });
      refetchClamav();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update antivirus setting",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const smokeTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/smoke-test/run");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to start smoke test");
      }
      return payload as SmokeRunResponse;
    },
    onSuccess: (data) => {
      toast({
        title: "Smoke test started",
        description: `Run ${data.runId} is running in the background.`,
      });
      refetchSmokeStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Smoke test did not start",
        description: error?.message || "Please review the server logs.",
        variant: "destructive",
      });
      refetchSmokeStatus();
    },
  });

  const staffImportMutation = useMutation({
    mutationFn: async ({ csvText, dryRun }: { csvText: string; dryRun: boolean }) => {
      const response = await apiRequest("POST", "/api/admin/district-staff/import", {
        csv: csvText,
        dryRun,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to process district staff manifest");
      }
      return payload as StaffImportResponse;
    },
    onSuccess: (data) => {
      setStaffImportResult(data);
      toast({
        title: data.dryRun ? "Dry-run completed" : "District staff updated",
        description: data.message,
      });
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "District staff import failed",
        description: error?.message || "Unable to process the CSV manifest",
        variant: "destructive",
      });
    },
  });

  const handleResetClick = (operation: ResetOperation) => {
    setResetDialog({ open: true, operation, confirmationText: "", reason: "" });
  };

  const handleResetConfirm = () => {
    if (!resetDialog.operation) return;

    const requiredText = resetDialog.operation === "full" ? "RESET" : "DELETE";

    if (resetDialog.confirmationText !== requiredText) {
      toast({
        title: "Confirmation failed",
        description: `Please type "${requiredText}" exactly to confirm`,
        variant: "destructive",
      });
      return;
    }

    if (!resetDialog.reason || resetDialog.reason.length < 10) {
      toast({
        title: "Reason required",
        description: "Please provide a reason (at least 10 characters)",
        variant: "destructive",
      });
      return;
    }

    if (!resetDialog.password || resetDialog.password.length < 1) {
      toast({
        title: "Password required",
        description: "Please enter your password to confirm this action",
        variant: "destructive",
      });
      return;
    }

    resetMutation.mutate({
      operation: resetDialog.operation,
      confirmationText: resetDialog.confirmationText,
      reason: resetDialog.reason,
      password: resetDialog.password,
    });
  };

  const handleStaffCsvChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
      setStaffCsvText(text);
      setStaffCsvName(file.name);
      setStaffImportResult(null);
      input.value = "";
    };
    reader.onerror = () => {
      toast({
        title: "Failed to read file",
        description: "Please try again with a valid CSV file.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  };

  const handleRunStaffImport = () => {
    if (!staffCsvText.trim()) {
      toast({
        title: "CSV required",
        description: "Upload the district staff CSV manifest before running the seeder.",
        variant: "destructive",
      });
      return;
    }
    staffImportMutation.mutate({ csvText: staffCsvText, dryRun: staffDryRun });
  };

  const renderStaffStatusBadge = (status: StaffRowStatus) => (
    <Badge
      className={`text-[11px] font-semibold ${STAFF_STATUS_CLASSES[status]}`}
      variant="outline"
    >
      {STAFF_STATUS_LABELS[status]}
    </Badge>
  );

  const renderStaffAccountCell = (account?: StaffAccountRowResult) => {
    if (!account) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
      <div className="space-y-1">
        {renderStaffStatusBadge(account.status)}
        <p className="font-mono text-xs break-all">
          {account.username || "—"} · {account.mobile || "—"}
        </p>
        {account.reason ? (
          <p className="text-xs text-destructive">{account.reason}</p>
        ) : account.defaultPassword ? (
          <p className="text-xs text-muted-foreground">
            Default PW: <code>{account.defaultPassword}</code>
          </p>
        ) : null}
      </div>
    );
  };

  const primaryResetActions: Array<{
    id: ResetOperation;
    title: string;
    description: string;
    icon: LucideIcon;
  }> = [
      {
        id: "full",
        title: "Reset Entire Environment",
        description: "Delete everything except the three superadmin accounts.",
        icon: AlertTriangle,
      },
      {
        id: "applications",
        title: "Reset Applications",
        description: "Delete owners, applications, payments, inspections, and all uploaded documents.",
        icon: FileText,
      },
    ];

  const cleanupOperations: Array<{
    id: ResetOperation;
    title: string;
    description: string;
    icon: LucideIcon;
  }> = [
      {
        id: "users",
        title: "Clear Staff Users",
        description: "Delete DA/DTDO/admin logins (superadmins stay).",
        icon: Users,
      },
      {
        id: "timeline",
        title: "Timeline",
        description: "Delete application timeline entries only.",
        icon: Clock,
      },
      {
        id: "inspections",
        title: "Inspections",
        description: "Delete inspection orders and reports.",
        icon: Database,
      },
      {
        id: "objections",
        title: "Objections",
        description: "Delete objection records.",
        icon: ShieldAlert,
      },
      {
        id: "payments",
        title: "Payments",
        description: "Delete payment records.",
        icon: Trash2,
      },
      {
        id: "files",
        title: "Document Storage",
        description: "Clear uploaded files only.",
        icon: HardDrive,
      },
    ];

  const toggleSuperConsoleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/admin/settings/super-console/toggle", { enabled });
      return enabled;
    },
    onSuccess: (enabled) => {
      toast({
        title: enabled ? "Super console enabled" : "Super console disabled",
        description: enabled
          ? "The Super Admin Console has been enabled for this environment."
          : "The Super Admin Console override has been removed.",
      });
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to toggle super console",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateHimkoshGatewayMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/payments/himkosh", {
        merchantCode: gatewayForm.merchantCode,
        deptId: gatewayForm.deptId,
        serviceCode: gatewayForm.serviceCode,
        ddo: gatewayForm.ddo,
        head1: gatewayForm.head1,
        head2: gatewayForm.head2 || undefined,
        head2Amount: gatewayForm.head2Amount ? Number(gatewayForm.head2Amount) : undefined,
        returnUrl: gatewayForm.returnUrl || undefined,
        allowFallback: gatewayForm.allowFallback,
      });
    },
    onSuccess: () => {
      toast({ title: "HimKosh configuration saved" });
      refetchHimkoshGateway();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save HimKosh settings",
        description: error?.message || "An error occurred while saving settings",
        variant: "destructive",
      });
    },
  });

  const clearHimkoshGatewayMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/payments/himkosh");
    },
    onSuccess: () => {
      toast({ title: "HimKosh overrides removed" });
      refetchHimkoshGateway();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to clear HimKosh overrides",
        description: error?.message || "An error occurred while clearing overrides",
        variant: "destructive",
      });
    },
  });

  const canSaveGateway = !gatewayRequiredMissing && !updateHimkoshGatewayMutation.isPending;

  const clearHimkoshLogMutation = useMutation({
    mutationFn: async ({ confirmationText }: { confirmationText: string }) => {
      const response = await apiRequest("POST", "/api/admin/payments/himkosh/transactions/clear", {
        confirmationText,
      });
      const payload = await response.json();
      return payload as { success: boolean; deleted: number };
    },
    onSuccess: (payload) => {
      toast({
        title: "HimKosh log cleared",
        description: `Removed ${payload.deleted} transactions`,
      });
      setClearLogDialog({ open: false, confirmationText: "" });
      refetchHimkoshActivity();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to clear HimKosh log",
        description: error?.message || "An error occurred while deleting records",
        variant: "destructive",
      });
    },
  });

  const ddoTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/payments/himkosh/ddo-test", {
        district: ddoTestForm.district || undefined,
        tehsil: ddoTestForm.tehsil || undefined,
        manualDdo: ddoTestForm.manualDdo || undefined,
        amount: ddoTestForm.amount ? Number(ddoTestForm.amount) : undefined,
        tenderBy: ddoTestForm.tenderBy || undefined,
      });
      const payload = await response.json();
      return payload as HimkoshDdoTestResult;
    },
    onSuccess: (payload) => {
      setDdoTestResult(payload);
      toast({
        title: "HimKosh payload prepared",
        description: `DDO ${payload.ddoUsed} (${payload.ddoSource.replace(/_/g, " ")})`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to run test",
        description: error?.message || "Unable to simulate HimKosh payload",
        variant: "destructive",
      });
    },
  });

  if (statsLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Environment warning
  if (!stats?.resetEnabled) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-orange-600" />
              <CardTitle className="text-orange-900 dark:text-orange-100">
                Super Admin Console Disabled
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-800 dark:text-orange-200">
              The Super Admin Console is only available in <strong>development</strong> and <strong>test</strong> environments.
              It is currently disabled because this appears to be a production environment.
            </p>
            <p className="mt-4 text-sm text-orange-700 dark:text-orange-300">
              Current environment: <Badge>{stats?.environment || "unknown"}</Badge>
            </p>
            <div className="mt-6">
              <Button
                onClick={() => toggleSuperConsoleMutation.mutate(true)}
                disabled={toggleSuperConsoleMutation.isPending}
              >
                {toggleSuperConsoleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enabling...
                  </>
                ) : (
                  "Enable Super Admin Console"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const environmentLabel = stats?.superConsoleOverride
    ? `${(stats.environment || '').toUpperCase()} (OVERRIDE)`
    : stats?.environment?.toUpperCase();

  const formatTimestamp = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  const smokeBadgeVariant = smokeStatus?.running
    ? "default"
    : smokeStatus?.lastExitCode === 0 || !smokeStatus?.lastRunId
      ? "outline"
      : "destructive";

  const smokeStatusLabel = smokeStatus?.running
    ? "Running"
    : smokeStatus?.lastExitCode === 0
      ? "Idle · Last run passed"
      : smokeStatus?.lastRunId
        ? "Idle · Last run failed"
        : "Idle";

  const smokeLogValue = smokeStatusLoading
    ? "Loading smoke-test log..."
    : smokeStatus?.log?.content?.length
      ? smokeStatus.log.content
      : "No smoke-test output yet. Trigger the harness to capture a run.";

  const lastRunSummary = smokeStatus?.lastRunId
    ? `${smokeStatus.lastExitCode === 0 ? "Passed" : `Failed (exit ${smokeStatus.lastExitCode ?? "?"})`} • ${formatTimestamp(smokeStatus.lastFinishedAt)}`
    : "No completed run yet";

  const smokeButtonDisabled = Boolean(smokeStatus?.running || smokeTestMutation.isPending || smokeStatusLoading);
  const staffCsvRowCount = staffCsvText
    ? Math.max(
      staffCsvText
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .length - 1,
      0,
    )
    : 0;
  const canRunStaffImport = Boolean(staffCsvText.trim()) && !staffImportMutation.isPending;
  const formatDateLabel = (value?: string | Date | null) => formatDateTime(value) ?? "—";
  const renderTransactionStatus = (transaction: HimkoshTransaction) => {
    const success = transaction.statusCd === "1" || transaction.transactionStatus === "success";
    const failure = transaction.statusCd === "0" || transaction.transactionStatus === "failed";
    const variant = success ? "default" : failure ? "destructive" : "outline";
    const label = success
      ? "Success"
      : failure
        ? transaction.status ? transaction.status : "Failed"
        : transaction.transactionStatus ?? "Pending";
    return <Badge variant={variant}>{label}</Badge>;
  };
  const ddoOptions = ddoCodesData?.codes ?? [];
  const isClearLogConfirmValid =
    clearLogDialog.confirmationText.trim().toUpperCase() === CLEAR_HIMKOSH_LOG_PHRASE;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Super Admin Console</h1>
          <Badge variant="destructive" className="ml-2">
            {environmentLabel}
          </Badge>
          {stats?.superConsoleOverride && (
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => toggleSuperConsoleMutation.mutate(false)}
              disabled={toggleSuperConsoleMutation.isPending}
            >
              {toggleSuperConsoleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable Override"
              )}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          System maintenance, reset operations, and test data generation
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-8">
          <section id="system-overview" className="space-y-4">
            {/* Environment Warning Banner */}
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-900 dark:text-orange-100">
                      ⚠️ Development/Test Environment Only
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                      All reset operations are <strong>destructive</strong> and <strong>cannot be undone</strong>.
                      Use with extreme caution. All actions are logged for audit purposes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Statistics */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    <CardTitle>System Statistics</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchStats()}
                    data-testid="button-refresh-stats"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                <CardDescription>Current state of the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">Applications</p>
                    </div>
                    <p className="text-2xl font-bold">{stats?.applications.total || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total homestay apps</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">Users</p>
                    </div>
                    <p className="text-2xl font-bold">{stats?.users.total || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Registered users</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">Files</p>
                    </div>
                    <p className="text-2xl font-bold">{stats?.files.total || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats?.files.totalSize || "0 MB"}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">Database</p>
                    </div>
                    <p className="text-2xl font-bold">{stats?.database.tables || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats?.database.size || "0 MB"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <AlertDialog
              open={testModeDialog.open}
              onOpenChange={(open) => {
                if (!open) {
                  closeTestModeDialog();
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {testModeDialog.targetEnabled ? "Enable ₹1 test payments?" : "Disable test payments and charge actual amounts?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    {testModeDialog.targetEnabled ? (
                      <>
                        <p>
                          All HimKosh payment requests will send ₹1 (demo) to the gateway. Application fees will still be calculated but not collected.
                        </p>
                        <p className="font-semibold text-yellow-700">
                          Use only in staging/demo. Owners must reattempt payment after switching back to production.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          HimKosh will start receiving the full calculated amount for every payment. Ensure test accounts are cleared before going live.
                        </p>
                        <p className="font-semibold text-emerald-700">
                          This change affects all districts immediately.
                        </p>
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label htmlFor="test-mode-reason">Reason for this change</Label>
                    <Textarea
                      id="test-mode-reason"
                      value={testModeDialog.reason}
                      onChange={(event) =>
                        setTestModeDialog((prev) => ({ ...prev, reason: event.target.value }))
                      }
                      placeholder="Explain why you are switching payment mode (min 15 characters)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="test-mode-confirm">
                      Type <span className="font-semibold">{testModeConfirmPhrase}</span> to confirm
                    </Label>
                    <Input
                      id="test-mode-confirm"
                      value={testModeDialog.confirmationText}
                      onChange={(event) =>
                        setTestModeDialog((prev) => ({
                          ...prev,
                          confirmationText: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder={testModeConfirmPhrase}
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={closeTestModeDialog} disabled={toggleTestModeMutation.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmTestModeChange}
                    disabled={!isTestModeConfirmValid || toggleTestModeMutation.isPending}
                  >
                    {toggleTestModeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>{testModeDialog.targetEnabled ? "Enable test mode" : "Disable test mode"}</>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>

          <section id="database" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Database Connectivity</CardTitle>
                    <CardDescription>Point the portal to a different Postgres server and verify connectivity.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isDbConfigLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading current configuration…
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="db-host">Host / IP</Label>
                        <Input
                          id="db-host"
                          value={dbForm.host}
                          onChange={handleDbInputChange("host")}
                          placeholder="127.0.0.1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="db-port">Port</Label>
                        <Input
                          id="db-port"
                          value={dbForm.port}
                          onChange={handleDbInputChange("port")}
                          placeholder="5432"
                        />
                      </div>
                      <div>
                        <Label htmlFor="db-name">Database name</Label>
                        <Input
                          id="db-name"
                          value={dbForm.database}
                          onChange={handleDbInputChange("database")}
                          placeholder="homestay_r1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="db-user">Username</Label>
                        <Input
                          id="db-user"
                          value={dbForm.user}
                          onChange={handleDbInputChange("user")}
                          placeholder="postgres"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="db-password">Password</Label>
                        <Input
                          id="db-password"
                          type="password"
                          value={dbForm.password}
                          onChange={handleDbInputChange("password")}
                          placeholder={dbHasPassword ? "•••••• (unchanged)" : "Enter password"}
                        />
                        {dbHasPassword && !dbForm.password && (
                          <p className="text-xs text-muted-foreground mt-1">Leave blank to keep the existing password.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">Update runtime configuration</p>
                        <p className="text-xs text-muted-foreground">
                          Rewrites <code>.env</code> and <code>Database/db-config.env</code>. Restart the PM2/systemd service after saving.
                        </p>
                      </div>
                      <Switch checked={dbApplyEnv} onCheckedChange={setDbApplyEnv} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => testDbConfigMutation.mutate()}
                        disabled={testDbConfigMutation.isPending}
                      >
                        {testDbConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Test connection
                      </Button>
                      <Button
                        type="button"
                        onClick={() => saveDbConfigMutation.mutate()}
                        disabled={saveDbConfigMutation.isPending}
                      >
                        {saveDbConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save settings
                      </Button>
                      {dbConfigData?.metadata?.lastVerificationResult && (
                        <Badge
                          variant={dbConfigData.metadata.lastVerificationResult === "success" ? "default" : "destructive"}
                        >
                          Last test: {dbConfigData.metadata.lastVerificationResult}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      {dbConfigData?.metadata?.lastVerifiedAt && (
                        <p>
                          Last test run: {formatDateTime(dbConfigData.metadata.lastVerifiedAt)}
                          {dbConfigData.metadata.lastVerificationMessage &&
                            dbConfigData.metadata.lastVerificationResult === "failure"
                            ? ` (${dbConfigData.metadata.lastVerificationMessage})`
                            : ""}
                        </p>
                      )}
                      {dbConfigData?.metadata?.lastAppliedAt && (
                        <p>Environment updated: {formatDateTime(dbConfigData.metadata.lastAppliedAt)}</p>
                      )}
                      <p>
                        Source: {dbConfigData?.source === "env" ? "Environment" : dbConfigData?.source === "stored" ? "Saved" : "Not configured"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <AlertDialog
              open={clearLogDialog.open}
              onOpenChange={(open) =>
                setClearLogDialog((prev) => ({
                  open,
                  confirmationText: open ? prev.confirmationText : "",
                }))
              }
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear HimKosh transaction log?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes the stored payment attempts from this environment. It does not affect HimKosh servers.
                    Type <span className="font-semibold">{CLEAR_HIMKOSH_LOG_PHRASE}</span> to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2 space-y-2">
                  <Input
                    value={clearLogDialog.confirmationText}
                    onChange={(event) =>
                      setClearLogDialog((prev) => ({ ...prev, confirmationText: event.target.value }))
                    }
                    placeholder={CLEAR_HIMKOSH_LOG_PHRASE}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => setClearLogDialog({ open: false, confirmationText: "" })}
                    disabled={clearHimkoshLogMutation.isPending}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      clearHimkoshLogMutation.mutate({
                        confirmationText: clearLogDialog.confirmationText,
                      })
                    }
                    disabled={!isClearLogConfirmValid || clearHimkoshLogMutation.isPending}
                  >
                    {clearHimkoshLogMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Clearing…
                      </>
                    ) : (
                      "Yes, delete log"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>

          <section id="reset-zone" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <CardTitle>Reset Operations</CardTitle>
                </div>
                <CardDescription>Danger zone — irreversible actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  {primaryResetActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        variant="destructive"
                        className="h-auto py-4 flex-col items-start text-left"
                        onClick={() => handleResetClick(action.id)}
                      >
                        <Icon className="w-5 h-5 mb-2" />
                        <div className="font-semibold">{action.title}</div>
                        <p className="text-xs opacity-80 mt-1">{action.description}</p>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                  <CardTitle>Granular Reset</CardTitle>
                </div>
                <CardDescription>Select which data categories to reset. Staff, LGD, and DDO data are always preserved.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: "deleteApplications", label: "Applications", icon: FileText },
                    { key: "deleteDocuments", label: "Documents", icon: HardDrive },
                    { key: "deletePayments", label: "Payments", icon: CreditCard },
                    { key: "deleteInspections", label: "Inspections", icon: Database },
                    { key: "deleteCertificates", label: "Certificates", icon: ShieldCheck },
                    { key: "deleteNotifications", label: "Notifications", icon: Clock },
                    { key: "deletePropertyOwners", label: "Property Owners", icon: Users },
                  ].map(({ key, label, icon: Icon }) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${granularResetDialog.selections[key as keyof typeof granularResetDialog.selections]
                        ? "bg-red-50 border-red-200"
                        : "bg-muted/30 border-muted"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={granularResetDialog.selections[key as keyof typeof granularResetDialog.selections]}
                        onChange={(e) =>
                          setGranularResetDialog((prev) => ({
                            ...prev,
                            selections: { ...prev.selections, [key]: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-sm font-medium text-emerald-800">Always Preserved: </span>
                    <span className="text-sm text-emerald-700">Staff Users, LGD Locations, DDO Codes</span>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  onClick={() => setGranularResetDialog((prev) => ({ ...prev, open: true }))}
                  disabled={!Object.values(granularResetDialog.selections).some(Boolean)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset Selected Data
                </Button>
              </CardContent>
            </Card>
          </section>

          <section id="payment-settings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <CardTitle>Payment Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure payment gateway test mode
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Test Payment Mode</h3>
                      {testModeData?.enabled && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          🧪 Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {testModeData?.enabled
                        ? "Payment requests send ₹1 to gateway (actual fee is calculated but not charged)"
                        : "Payment requests send actual calculated amounts to gateway"
                      }
                    </p>
                    {testModeData?.enabled && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ⚠️ Applications will calculate real fees, but only ₹1 will be sent to payment gateway for testing
                      </p>
                    )}
                  </div>
                  <Button
                    variant={testModeData?.enabled ? "destructive" : "default"}
                    onClick={() => openTestModeDialog(!testModeData?.enabled)}
                    disabled={testModeLoading || toggleTestModeMutation.isPending}
                    data-testid="button-toggle-test-payment-mode"
                  >
                    {toggleTestModeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        {testModeData?.enabled ? "Disable" : "Enable"}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Workflow Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Payment Workflow</h3>
                      <Badge variant="outline" className={paymentWorkflowData?.workflow === "upfront"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-blue-50 text-blue-700 border-blue-300"}>
                        {paymentWorkflowData?.workflow === "upfront" ? "💳 Pay First" : "✅ Pay on Approval"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {paymentWorkflowData?.workflow === "upfront"
                        ? "Owners must pay before submitting their application. Refund if rejected."
                        : "Owners submit first, pay only after DA approves (legacy flow)."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {paymentWorkflowData?.workflow === "upfront"
                        ? "New Flow: Fill → Pay → Submit → Review → Certificate"
                        : "Legacy Flow: Fill → Submit → Review → Approve → Pay → Certificate"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={paymentWorkflowData?.workflow === "on_approval" ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePaymentWorkflowMutation.mutate("on_approval")}
                      disabled={paymentWorkflowLoading || togglePaymentWorkflowMutation.isPending || paymentWorkflowData?.workflow === "on_approval"}
                    >
                      Pay on Approval
                    </Button>
                    <Button
                      variant={paymentWorkflowData?.workflow === "upfront" ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePaymentWorkflowMutation.mutate("upfront")}
                      disabled={paymentWorkflowLoading || togglePaymentWorkflowMutation.isPending || paymentWorkflowData?.workflow === "upfront"}
                    >
                      Pay First
                    </Button>
                  </div>
                </div>

                {/* Submit Mode Toggle - Only visible when workflow is "upfront" */}
                {paymentWorkflowData?.workflow === "upfront" && (
                  <div className="flex items-center justify-between p-4 border rounded-lg mt-4 bg-emerald-50/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">After Payment: Submit Mode</h4>
                        <Badge variant="outline" className={paymentWorkflowData?.upfrontSubmitMode === "auto"
                          ? "bg-sky-50 text-sky-700 border-sky-300"
                          : "bg-amber-50 text-amber-700 border-amber-300"}>
                          {paymentWorkflowData?.upfrontSubmitMode === "auto" ? "⚡ Auto Submit" : "✋ Manual Submit"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {paymentWorkflowData?.upfrontSubmitMode === "auto"
                          ? "Application is automatically submitted after successful payment (seamless experience)."
                          : "User sees a confirmation page after payment and must click \"Submit\" to finalize."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={paymentWorkflowData?.upfrontSubmitMode === "auto" ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSubmitModeMutation.mutate("auto")}
                        disabled={paymentWorkflowLoading || toggleSubmitModeMutation.isPending || paymentWorkflowData?.upfrontSubmitMode === "auto"}
                      >
                        Auto
                      </Button>
                      <Button
                        variant={paymentWorkflowData?.upfrontSubmitMode === "manual" ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSubmitModeMutation.mutate("manual")}
                        disabled={paymentWorkflowLoading || toggleSubmitModeMutation.isPending || paymentWorkflowData?.upfrontSubmitMode === "manual"}
                      >
                        Manual
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      <CardTitle>Gateway Configuration</CardTitle>
                      {gatewayHasOverrides && (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
                          Overrides active
                        </Badge>
                      )}
                    </div>
                    <CardDescription>Update HimKosh credentials without rebuilding the package.</CardDescription>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>Source: {himkoshGatewayData?.source === "database" ? "Database override" : "Environment"}</p>
                    {himkoshGatewayData?.updatedAt && (
                      <p>Updated: {formatDateTime(himkoshGatewayData.updatedAt)}</p>
                    )}
                    {himkoshGatewayData?.updatedBy && <p>By: {himkoshGatewayData.updatedBy}</p>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {himkoshGatewayLoading ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading gateway settings…
                  </div>
                ) : !himkoshGatewayData ? (
                  <p className="text-sm text-muted-foreground">Gateway metadata not available yet.</p>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="gateway-merchant">Merchant code</Label>
                        <Input
                          id="gateway-merchant"
                          value={gatewayForm.merchantCode}
                          onChange={handleGatewayInputChange("merchantCode")}
                          placeholder="HIMKOSH228"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gateway-dept">Department ID</Label>
                        <Input
                          id="gateway-dept"
                          value={gatewayForm.deptId}
                          onChange={handleGatewayInputChange("deptId")}
                          placeholder="228"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gateway-service">Service code</Label>
                        <Input
                          id="gateway-service"
                          value={gatewayForm.serviceCode}
                          onChange={handleGatewayInputChange("serviceCode")}
                          placeholder="TSM"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gateway-ddo">Default DDO</Label>
                        <Input
                          id="gateway-ddo"
                          value={gatewayForm.ddo}
                          onChange={handleGatewayInputChange("ddo")}
                          placeholder="SML00-532"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gateway-head1">Primary head of account</Label>
                        <Input
                          id="gateway-head1"
                          value={gatewayForm.head1}
                          onChange={handleGatewayInputChange("head1")}
                          placeholder="0230-00-104-01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gateway-head2">Secondary head (optional)</Label>
                        <Input
                          id="gateway-head2"
                          value={gatewayForm.head2}
                          onChange={handleGatewayInputChange("head2")}
                          placeholder="Secondary head code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gateway-head2-amount">Secondary head amount (₹)</Label>
                        <Input
                          id="gateway-head2-amount"
                          type="number"
                          min="0"
                          value={gatewayForm.head2Amount}
                          onChange={handleGatewayInputChange("head2Amount")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="gateway-return-url">Return URL</Label>
                        <Input
                          id="gateway-return-url"
                          value={gatewayForm.returnUrl}
                          onChange={handleGatewayInputChange("returnUrl")}
                          placeholder="https://portal.example.gov/api/himkosh/callback"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Allow fallback to environment values</p>
                        <p className="text-xs text-muted-foreground">
                          When enabled, missing override fields continue using .env defaults.
                        </p>
                      </div>
                      <Switch
                        checked={gatewayForm.allowFallback}
                        onCheckedChange={(checked) =>
                          setGatewayForm((prev) => ({ ...prev, allowFallback: checked }))
                        }
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        onClick={() => updateHimkoshGatewayMutation.mutate()}
                        disabled={!canSaveGateway}
                      >
                        {updateHimkoshGatewayMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save overrides
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => clearHimkoshGatewayMutation.mutate()}
                        disabled={!gatewayHasOverrides || clearHimkoshGatewayMutation.isPending}
                      >
                        {clearHimkoshGatewayMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Reset to defaults
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchHimkoshGateway()}
                        disabled={himkoshGatewayLoading}
                      >
                        Refresh
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <TestTube className="w-5 h-5 text-primary" />
                      <CardTitle>DDO Routing Diagnostics</CardTitle>
                    </div>
                    <CardDescription>Verify which DDO will be used and preview the encrypted payload.</CardDescription>
                  </div>
                  <Badge variant="outline">
                    {ddoTestResult ? `Using ${ddoTestResult.ddoUsed}` : "No test run yet"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>District / Office</Label>
                    <Select
                      value={ddoTestForm.district || undefined}
                      onValueChange={(value) => setDdoTestForm((prev) => ({ ...prev, district: value }))}
                      disabled={ddoCodesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ddoCodesLoading ? "Loading DDO codes..." : "Select district"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {ddoOptions.map((entry) => (
                          <SelectItem key={entry.id} value={entry.district}>
                            {entry.district} · {entry.ddoCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecting a district helps test routing from the DDO manifest.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ddo-tehsil">Tehsil (optional)</Label>
                    <Input
                      id="ddo-tehsil"
                      value={ddoTestForm.tehsil}
                      onChange={(event) =>
                        setDdoTestForm((prev) => ({ ...prev, tehsil: event.target.value }))
                      }
                      placeholder="Used for Chamba / Lahaul routing"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ddo-manual">Manual DDO override (optional)</Label>
                    <Input
                      id="ddo-manual"
                      value={ddoTestForm.manualDdo}
                      onChange={(event) =>
                        setDdoTestForm((prev) => ({ ...prev, manualDdo: event.target.value }))
                      }
                      placeholder="Override resolved DDO"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ddo-amount">Test amount (₹)</Label>
                    <Input
                      id="ddo-amount"
                      type="number"
                      min="1"
                      value={ddoTestForm.amount}
                      onChange={(event) =>
                        setDdoTestForm((prev) => ({ ...prev, amount: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="ddo-tender">Tendered by</Label>
                    <Input
                      id="ddo-tender"
                      value={ddoTestForm.tenderBy}
                      onChange={(event) =>
                        setDdoTestForm((prev) => ({ ...prev, tenderBy: event.target.value }))
                      }
                      placeholder="Applicant name used in payload"
                    />
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Button onClick={() => ddoTestMutation.mutate()} disabled={ddoTestMutation.isPending}>
                    {ddoTestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate payload
                  </Button>
                  {ddoTestResult && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (ddoTestResult.payload?.paymentUrl && typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard
                            .writeText(ddoTestResult.payload.paymentUrl)
                            .then(() =>
                              toast({
                                title: "Payment URL copied",
                                description: "Paste into a new tab for manual gateway testing.",
                              }),
                            )
                            .catch(() =>
                              toast({
                                title: "Copy failed",
                                description: "Please copy the URL manually.",
                                variant: "destructive",
                              }),
                            );
                        } else {
                          toast({
                            title: "Clipboard unavailable",
                            description: "Please copy the URL from the preview below.",
                          });
                        }
                      }}
                    >
                      Copy payment URL
                    </Button>
                  )}
                </div>
                {ddoTestResult && (
                  <div className="space-y-3 rounded-lg border p-4 bg-muted/40">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline">
                        DDO • {ddoTestResult.ddoUsed} ({ddoTestResult.ddoSource.replace(/_/g, " ")})
                      </Badge>
                      {ddoTestResult.routedDistrict && (
                        <span>Routed District: {ddoTestResult.routedDistrict}</span>
                      )}
                      {ddoTestResult.mapping?.district && (
                        <span>Mapping matched: {ddoTestResult.mapping.district}</span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Core string checksum: {ddoTestResult.payload.checksum}</p>
                      <p className="break-all">
                        Payment URL: <code>{ddoTestResult.payload.paymentUrl}</code>
                      </p>
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary">Show payload preview</summary>
                      <pre className="mt-2 whitespace-pre-wrap break-all bg-background rounded-md p-3 text-xs">
                        {JSON.stringify(ddoTestResult.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <CardTitle>Recent HimKosh Transactions</CardTitle>
                    </div>
                    <CardDescription>Newest payment attempts captured from the portal.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchHimkoshActivity()}
                      disabled={himkoshActivityLoading}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setClearLogDialog({ open: true, confirmationText: "" })}
                    >
                      Clear log
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {himkoshActivityLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading latest payments…
                  </div>
                ) : latestTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No HimKosh transactions recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Application / Ref</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Service / DDO</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {latestTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{transaction.deptRefNo}</div>
                                <p className="text-xs text-muted-foreground">{transaction.appRefNo}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{formatDateLabel(transaction.createdAt)}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(transaction.totalAmount)}</TableCell>
                            <TableCell>{renderTransactionStatus(transaction)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <div>{transaction.serviceCode || "—"}</div>
                              <div>{transaction.ddo || "—"}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTransactionDetails(transaction)}
                              >
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {latestTransactions.length > 0 && totalHimkoshTransactions > latestTransactions.length && (
                  <p className="text-xs text-muted-foreground">
                    Showing latest {latestTransactions.length} of {totalHimkoshTransactions} transactions.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section id="communications" className="space-y-4">
            <CommunicationsCard />
            <NotificationRulesCard />
          </section>

          <section id="security" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  <CardTitle>Login Captcha</CardTitle>
                </div>
                <CardDescription>Toggle the math captcha challenge on the public login page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Captcha Requirement</h3>
                      {!captchaData?.enabled && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Testing
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {captchaData?.enabled
                        ? "All logins must solve a quick math challenge before OTP."
                        : "Captcha is disabled for this environment—re-enable before production."}
                    </p>
                  </div>
                  <Button
                    variant={captchaData?.enabled ? "destructive" : "default"}
                    onClick={() => toggleCaptchaMutation.mutate(!captchaData?.enabled)}
                    disabled={captchaLoading || toggleCaptchaMutation.isPending}
                    data-testid="button-toggle-captcha"
                  >
                    {toggleCaptchaMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>{captchaData?.enabled ? "Disable" : "Enable"}</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <CardTitle>ClamAV Upload Scanning</CardTitle>
                </div>
                <CardDescription>Enable antivirus scanning for uploaded documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Current Status</h3>
                      {clamavStatus?.enabled ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {clamavStatus?.enabled
                        ? "Uploads are scanned before they enter the workflow."
                        : "Uploads bypass antivirus scanning."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Source: {clamavStatus?.source === "db" ? "Admin console override" : "Environment default"}
                    </p>
                  </div>
                  <Button
                    variant={clamavStatus?.enabled ? "destructive" : "default"}
                    onClick={() => toggleClamavMutation.mutate(!clamavStatus?.enabled)}
                    disabled={clamavLoading || toggleClamavMutation.isPending || !clamavStatus}
                    data-testid="button-toggle-clamav"
                  >
                    {toggleClamavMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>{clamavStatus?.enabled ? "Disable" : "Enable"}</>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  ClamAV adds a small scan step (hundreds of ms for PDFs) and does not impact payment flow.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="staff-tools" className="space-y-4">
            {/* District Staff Seeder */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-primary" />
                  <CardTitle>District Staff Accounts</CardTitle>
                </div>
                <CardDescription>
                  Upload the CSV manifest to create or refresh the 15 DA/DTDO account pairs per district.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div>
                    <Label htmlFor="district-staff-csv">Select CSV manifest</Label>
                    <Input
                      id="district-staff-csv"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleStaffCsvChange}
                      disabled={staffImportMutation.isPending}
                      className="mt-1"
                      data-testid="input-district-staff-csv"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Template lives on this VM under <code>seed_data/district-staff-accounts.csv</code>.
                    </p>
                    {staffCsvName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Loaded <strong>{staffCsvName}</strong>
                        {staffCsvRowCount > 0 ? ` · ${staffCsvRowCount} district rows` : ""}
                      </p>
                    )}
                  </div>
                  <div className="p-3 border rounded-lg space-y-2">
                    <Label htmlFor="district-staff-dry-run" className="text-xs text-muted-foreground">
                      Import mode
                    </Label>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="district-staff-dry-run"
                        checked={staffDryRun}
                        onCheckedChange={(checked) => setStaffDryRun(checked)}
                        disabled={staffImportMutation.isPending}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {staffDryRun ? "Dry-run (no DB writes)" : "Apply to database"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {staffDryRun
                            ? "Validates the CSV and shows what would change."
                            : "Creates/updates DA & DTDO users immediately."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleRunStaffImport}
                    disabled={!canRunStaffImport}
                    data-testid="button-import-district-staff"
                  >
                    {staffImportMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 mr-2" />
                        {staffDryRun ? "Preview Manifest" : "Import Accounts"}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStaffImportResult(null)}
                    disabled={!staffImportResult || staffImportMutation.isPending}
                  >
                    Clear result
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password format: <code>da</code>/<code>dtdo</code> + first 3 letters of the district + <code>@2025</code>.
                  Share the CSV with IT so they can rotate passwords after onboarding.
                </p>
                {staffImportResult && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{staffImportResult.message}</p>
                      <p className="text-xs text-muted-foreground">
                        Mode: {staffImportResult.dryRun ? "Dry-run" : "Applied"} · Password schema:{" "}
                        <code>{staffImportResult.passwordFormat}</code>
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 text-sm">
                      <div className="p-3 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">District rows</p>
                        <p className="text-lg font-semibold">{staffImportResult.summary.districts}</p>
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Accounts touched</p>
                        <p className="text-lg font-semibold">{staffImportResult.summary.accountsAttempted}</p>
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">{staffImportResult.dryRun ? "Would create" : "Created"}</p>
                        <p className="text-lg font-semibold">
                          {staffImportResult.dryRun
                            ? staffImportResult.summary.wouldCreate
                            : staffImportResult.summary.created}
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">{staffImportResult.dryRun ? "Would update" : "Updated"}</p>
                        <p className="text-lg font-semibold">
                          {staffImportResult.dryRun
                            ? staffImportResult.summary.wouldUpdate
                            : staffImportResult.summary.updated}
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Skipped</p>
                        <p className="text-lg font-semibold">{staffImportResult.summary.skipped}</p>
                      </div>
                    </div>
                    {staffImportResult.errors?.length > 0 && (
                      <div className="bg-destructive/10 text-destructive text-xs p-3 rounded space-y-1">
                        <p className="font-semibold">Parse warnings</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          {staffImportResult.errors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="overflow-auto border rounded">
                      <table className="min-w-[640px] w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left text-xs font-semibold uppercase tracking-wide p-2">District / DDO</th>
                            <th className="text-left text-xs font-semibold uppercase tracking-wide p-2">Dealing Assistant</th>
                            <th className="text-left text-xs font-semibold uppercase tracking-wide p-2">DTDO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffImportResult.details.map((detail) => (
                            <tr key={`${detail.rowNumber}-${detail.ddoCode}`} className="border-t">
                              <td className="p-2 align-top">
                                <p className="font-medium">{detail.district}</p>
                                <p className="text-xs text-muted-foreground">DDO: {detail.ddoCode}</p>
                              </td>
                              <td className="p-2 align-top">{renderStaffAccountCell(detail.da)}</td>
                              <td className="p-2 align-top">{renderStaffAccountCell(detail.dtdo)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section id="smoke-tests" className="space-y-4">
            {/* Smoke Test Harness */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-primary" />
                  <CardTitle>Smoke Test Harness</CardTitle>
                </div>
                <CardDescription>
                  Trigger the CLI smoke script on this VM and watch the live log from the console.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current status</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={smokeBadgeVariant}>{smokeStatusLabel}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {smokeStatus?.running
                          ? `Started ${formatTimestamp(smokeStatus?.startedAt)}`
                          : smokeStatus?.lastFinishedAt
                            ? `Last run finished ${formatTimestamp(smokeStatus?.lastFinishedAt)}`
                            : "No runs triggered yet"}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => smokeTestMutation.mutate()}
                    disabled={smokeButtonDisabled}
                    data-testid="button-run-smoke-test"
                  >
                    {smokeStatus?.running ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : smokeTestMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Run Smoke Test
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">Active run ID</p>
                    <p className="font-mono text-sm break-all">
                      {smokeStatus?.runId || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Log file:{" "}
                      {smokeStatus?.log?.path ? <code>{smokeStatus.log.path}</code> : "—"}
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">Last run</p>
                    <p className="text-sm font-semibold">{lastRunSummary}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {smokeStatus?.lastRunId ? `Run ID ${smokeStatus.lastRunId}` : "No historical data"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Live log</Label>
                  </div>
                  <Textarea
                    readOnly
                    spellCheck={false}
                    className="font-mono text-xs min-h-[220px]"
                    value={smokeLogValue}
                  />
                  <p className="text-xs text-muted-foreground">
                    Output mirrors <code>docs/smoke-reports/&lt;runId&gt;.log</code>. Full reports live under{" "}
                    <code>docs/smoke-reports/&lt;runId&gt;/report.json</code> on this VM.
                  </p>
                  {smokeStatus?.reportPath && (
                    <p className="text-xs text-muted-foreground">
                      Latest report: <code>{smokeStatus.reportPath}</code>
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  The harness reuses <code>scripts/run-smoke.sh</code> with the configured <code>SMOKE_* credentials</code>,
                  and each run now wipes the previous smoke applications/files for that owner so you always start from a clean slate.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="test-data" className="space-y-4">
            {/* Test Data Generation */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TestTube className="w-5 h-5 text-primary" />
                  <CardTitle>Generate Test Data</CardTitle>
                </div>
                <CardDescription>Create sample applications and users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="seed-count">Number of Applications</Label>
                  <Input
                    id="seed-count"
                    type="number"
                    value={seedCount}
                    onChange={(e) => setSeedCount(parseInt(e.target.value) || 10)}
                    min={1}
                    max={100}
                    className="mt-1"
                    data-testid="input-seed-count"
                  />
                </div>
                <Button
                  onClick={() => seedMutation.mutate({ type: "applications", count: seedCount })}
                  disabled={seedMutation.isPending}
                  className="w-full"
                  data-testid="button-seed-applications"
                >
                  {seedMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generate {seedCount} Applications
                    </>
                  )}
                </Button>
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => seedMutation.mutate({ type: "users" })}
                    disabled={seedMutation.isPending}
                    className="w-full"
                    data-testid="button-seed-users"
                  >
                    Generate Test Users (All Roles)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialog.open} onOpenChange={(open) => {
        if (!open) {
          setResetDialog({ open: false, operation: null, confirmationText: "", reason: "" });
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm {resetDialog.operation === "full" ? "Full System Reset" : "Delete Operation"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-semibold">
                  This will permanently delete data. This action cannot be undone!
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="confirmation-text">
                      Type{" "}
                      <code className="bg-muted px-1 rounded font-mono">
                        {resetDialog.operation === "full" ? "RESET" : "DELETE"}
                      </code>{" "}
                      to confirm
                    </Label>
                    <Input
                      id="confirmation-text"
                      value={resetDialog.confirmationText}
                      onChange={(e) =>
                        setResetDialog({ ...resetDialog, confirmationText: e.target.value })
                      }
                      placeholder={resetDialog.operation === "full" ? "RESET" : "DELETE"}
                      className="mt-1 font-mono"
                      data-testid="input-confirmation-text"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason (required, min 10 characters)</Label>
                    <Textarea
                      id="reason"
                      value={resetDialog.reason}
                      onChange={(e) =>
                        setResetDialog({ ...resetDialog, reason: e.target.value })
                      }
                      placeholder="e.g., Starting new test cycle"
                      className="mt-1"
                      data-testid="input-reason"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Your Password (required for verification)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={resetDialog.password}
                      onChange={(e) =>
                        setResetDialog({ ...resetDialog, password: e.target.value })
                      }
                      placeholder="Enter your password to confirm"
                      className="mt-1"
                      data-testid="input-password"
                    />
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetConfirm}
              disabled={resetMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-reset"
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                "Confirm & Execute"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Granular Reset Confirmation Dialog */}
      <AlertDialog
        open={granularResetDialog.open}
        onOpenChange={(open) =>
          setGranularResetDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Granular Reset - Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>The following data categories will be deleted:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {granularResetDialog.selections.deleteApplications && <li>All applications and related data</li>}
                  {granularResetDialog.selections.deleteDocuments && <li>All uploaded documents</li>}
                  {granularResetDialog.selections.deletePayments && <li>All payment records</li>}
                  {granularResetDialog.selections.deleteInspections && <li>All inspection orders and reports</li>}
                  {granularResetDialog.selections.deleteCertificates && <li>All issued certificates</li>}
                  {granularResetDialog.selections.deleteNotifications && <li>All notifications</li>}
                  {granularResetDialog.selections.deletePropertyOwners && <li className="text-destructive font-medium">All property owner accounts</li>}
                </ul>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-700">
                  ✓ Staff users, LGD data, and DDO codes will be preserved.
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Type "RESET" to confirm</label>
                    <Input
                      value={granularResetDialog.confirmationText}
                      onChange={(e) =>
                        setGranularResetDialog((prev) => ({
                          ...prev,
                          confirmationText: e.target.value,
                        }))
                      }
                      placeholder="RESET"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Reason (min 10 characters)</label>
                    <Input
                      value={granularResetDialog.reason}
                      onChange={(e) =>
                        setGranularResetDialog((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      placeholder="Why are you performing this reset?"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={granularResetMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (granularResetDialog.confirmationText !== "RESET") {
                  toast({
                    title: "Confirmation failed",
                    description: 'Please type "RESET" exactly to confirm',
                    variant: "destructive",
                  });
                  return;
                }
                if (!granularResetDialog.reason || granularResetDialog.reason.length < 10) {
                  toast({
                    title: "Reason required",
                    description: "Please provide a reason (at least 10 characters)",
                    variant: "destructive",
                  });
                  return;
                }
                granularResetMutation.mutate({
                  ...granularResetDialog.selections,
                  confirmationText: granularResetDialog.confirmationText,
                  reason: granularResetDialog.reason,
                });
              }}
              disabled={granularResetMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {granularResetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                "Confirm & Execute"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={transactionDialog.open && Boolean(selectedTransaction)}
        onOpenChange={(open) => {
          if (!open) {
            closeTransactionDialog();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedTransaction && (
            <>
              <DialogHeader>
                <DialogTitle>Transaction {selectedTransaction.appRefNo}</DialogTitle>
                <DialogDescription>
                  Application {selectedTransaction.deptRefNo} ·{" "}
                  {formatDateLabel(selectedTransaction.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">{formatCurrency(selectedTransaction.totalAmount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Status</p>
                  {renderTransactionStatus(selectedTransaction)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Service Code</p>
                  <p className="font-mono text-sm">{selectedTransaction.serviceCode || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">DDO</p>
                  <p className="font-mono text-sm">{selectedTransaction.ddo || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Merchant</p>
                  <p className="text-sm">{selectedTransaction.merchantCode || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Portal Base URL</p>
                  <p className="text-sm break-all">{selectedTransaction.portalBaseUrl || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Challan / GRN</p>
                  <p className="text-sm">{selectedTransaction.echTxnId || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Bank Reference</p>
                  <p className="text-sm">{selectedTransaction.bankCIN || "—"}</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-xs uppercase text-muted-foreground mb-2">Raw payload</p>
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(selectedTransaction, null, 2)}
                </pre>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
