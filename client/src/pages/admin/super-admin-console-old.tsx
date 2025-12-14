import { useState, type ChangeEvent } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { CommunicationsCard } from "@/components/admin/communications-card";
import { NotificationRulesCard } from "@/components/admin/notification-rules-card";

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
}

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

interface SmokeRunResponse {
  message: string;
  runId: string;
  logPath: string | null;
  startedAt: string;
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

export default function SuperAdminConsole() {
  const { toast } = useToast();
  const [resetDialog, setResetDialog] = useState<ResetDialogState>({
    open: false,
    operation: null,
    confirmationText: "",
    reason: "",
  });
  const [seedCount, setSeedCount] = useState(10);
  const [staffCsvName, setStaffCsvName] = useState("");
  const [staffCsvText, setStaffCsvText] = useState("");
  const [staffDryRun, setStaffDryRun] = useState(true);
  const [staffImportResult, setStaffImportResult] = useState<StaffImportResponse | null>(null);

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

  const { data: captchaData, isLoading: captchaLoading, refetch: refetchCaptcha } = useQuery<{
    enabled: boolean;
  }>({
    queryKey: ["/api/admin/settings/auth/captcha"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/settings/auth/captcha");
      return response.json();
    },
  });

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
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update test mode",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

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

    resetMutation.mutate({
      operation: resetDialog.operation,
      confirmationText: resetDialog.confirmationText,
      reason: resetDialog.reason,
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

  const resetOperations: Array<{
    id: ResetOperation;
    title: string;
    description: string;
    icon: typeof Trash2;
    variant: "destructive" | "default";
  }> = [
    {
      id: "full",
      title: "Full System Reset",
      description: "Delete ALL data except super admin accounts",
      icon: AlertTriangle,
      variant: "destructive",
    },
    {
      id: "applications",
      title: "Clear Applications",
      description: "Delete all homestay applications and related data",
      icon: FileText,
      variant: "destructive",
    },
    {
      id: "users",
      title: "Clear Users",
      description: "Delete all non-admin users",
      icon: Users,
      variant: "destructive",
    },
    {
      id: "files",
      title: "Clear Files",
      description: "Delete all uploaded documents from storage",
      icon: HardDrive,
      variant: "destructive",
    },
    {
      id: "timeline",
      title: "Clear Timeline",
      description: "Delete application timeline entries",
      icon: Clock,
      variant: "default",
    },
    {
      id: "inspections",
      title: "Clear Inspections",
      description: "Delete all inspection orders and reports",
      icon: Database,
      variant: "default",
    },
    {
      id: "objections",
      title: "Clear Objections",
      description: "Delete all objection records",
      icon: ShieldAlert,
      variant: "default",
    },
    {
      id: "payments",
      title: "Clear Payments",
      description: "Delete all payment records",
      icon: Trash2,
      variant: "default",
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

      {/* Environment Warning Banner */}
      <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
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

      <div className="grid gap-6 lg:grid-cols-2">
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

        {/* Captcha Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <CardTitle>Login Captcha</CardTitle>
            </div>
            <CardDescription>
              Toggle the captcha challenge on the public login page
            </CardDescription>
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
                    ? "Owners and officers must solve a quick math question before logging in."
                    : "Captcha has been disabled for this environment (useful for demos or automation)."}
                </p>
                {!captchaData?.enabled && (
                  <p className="text-xs text-muted-foreground">
                    Remember to re-enable captcha before going live.
                  </p>
                )}
              </div>
              <Button
                variant={captchaData?.enabled ? "destructive" : "default"}
                onClick={() => toggleCaptchaMutation.mutate(!captchaData?.enabled)}
                disabled={captchaLoading || toggleCaptchaMutation.isPending}
                data-testid="button-toggle-captcha"
              >
                {toggleCaptchaMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    {captchaData?.enabled ? "Disable" : "Enable"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reset Operations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <CardTitle>Reset Operations</CardTitle>
            </div>
            <CardDescription>
              Dangerous zone - All operations are permanent and cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {resetOperations.map((op) => {
                const Icon = op.icon;
                return (
                  <Button
                    key={op.id}
                    variant={op.variant}
                    onClick={() => handleResetClick(op.id)}
                    className="h-auto py-4 flex-col items-start text-left"
                    data-testid={`button-reset-${op.id}`}
                  >
                    <Icon className="w-5 h-5 mb-2" />
                    <div className="font-medium">{op.title}</div>
                    <div className="text-xs opacity-80 font-normal mt-1">
                      {op.description}
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
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
                onClick={() => toggleTestModeMutation.mutate(!testModeData?.enabled)}
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

        <CommunicationsCard />
        <NotificationRulesCard />

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <CardTitle>Security Settings</CardTitle>
            </div>
            <CardDescription>Control ClamAV antivirus scanning for uploaded documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">ClamAV Upload Scanning</h3>
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
                    ? "All uploaded documents (local or S3/MinIO) are scanned before they enter the workflow."
                    : "Uploads bypass antivirus scanning. Enable this before accepting production documents."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Source:{" "}
                  {clamavStatus?.source === "db"
                    ? "Admin console override"
                    : "Environment default (.env)"}
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
              Note: Scanning adds a small read + scan step per document (typically a few hundred ms for PDFs) and
              does not impact the payment or submission pipeline.
            </p>
          </CardContent>
        </Card>

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
    </div>
  );
}
