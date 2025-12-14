import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationPanel } from "@/components/notification-panel";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Users,
  Building2,
  MapPin,
  Bell,
  ArrowRight,
  AlertCircle,
  Activity,
  Search,
  X,
  Gauge,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Timer,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import type { HomestayApplication } from "@shared/schema";

// SLA thresholds (in days)
const SLA_THRESHOLDS = {
  document_verification: 3,
  site_inspection: 5,
  payment_pending: 2,
  total: 15
};

type MonitoringApplication = HomestayApplication & {
  assignedToName?: string | null;
  assignedTo?: string | null;
  ownerName?: string | null;
  statusUpdatedAt?: string | null;
};

export default function WorkflowMonitoringPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("pipeline");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all applications for monitoring with real-time updates
  const { data: applications = [], isLoading, error: fetchError } = useQuery<MonitoringApplication[]>({
    queryKey: ['/api/applications/all'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds for real-time updates
    retry: 1,
  });

  // Calculate pipeline statistics
  const stats = calculatePipelineStats(applications);
  const bottlenecks = identifyBottlenecks(applications);
  const slaBreaches = identifySLABreaches(applications);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading workflow monitoring dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle authorization errors (403) - user doesn't have permission
  if (fetchError) {
    const error = fetchError as Error;
    // Check if error message starts with "403" (format: "403: message text")
    if (error?.message?.startsWith('403')) {
      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-6 w-6" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You do not have permission to access the Workflow Monitoring Dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This dashboard is restricted to government officers (Dealing Assistants, DTDOs, District Officers, State Officers, and Administrators). 
                Property owners can track their individual applications through the main dashboard.
              </p>
              <Button 
                onClick={() => setLocation('/dashboard')}
                data-testid="button-back-to-dashboard"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Handle other errors
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Unable to load the workflow monitoring dashboard. Please try refreshing the page.
            </p>
            <Button 
              onClick={() => setLocation('/workflow-monitoring')}
              data-testid="button-retry"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
            Workflow Monitoring Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Oversight console for spotting bottlenecks across the homestay pipeline
          </p>
        </div>
        <div className="flex gap-3">
          <NotificationPanel />
          <Button 
            onClick={() => setLocation('/workflow-monitoring')} 
            data-testid="button-refresh"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Active Pipeline"
          value={stats.activePipeline}
          icon={FileText}
          trend={`+${stats.newToday} received today`}
          variant="default"
        />
        <MetricCard
          title="Critical Bottlenecks"
          value={stats.criticalBottlenecks}
          icon={AlertTriangle}
          trend={stats.mostDelayedStage ? `Most delays: ${stats.mostDelayedStage}` : "Running smooth"}
          variant={stats.criticalBottlenecks > 0 ? "destructive" : "default"}
        />
        <MetricCard
          title="Avg. Processing Time"
          value={stats.avgProcessingTime}
          valueSuffix=" days"
          icon={Clock}
          trend={`Target: ${SLA_THRESHOLDS.total} days`}
          variant="default"
        />
        <MetricCard
          title="Registered Homestays"
          value={stats.totalCertificates}
          icon={CheckCircle}
          trend={`+${stats.completedThisWeek} this week`}
          variant="success"
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pipeline" data-testid="tab-pipeline">
            <Activity className="h-4 w-4 mr-2" />
            Pipeline View
          </TabsTrigger>
          <TabsTrigger value="bottlenecks" data-testid="tab-bottlenecks">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Bottlenecks ({bottlenecks.length})
          </TabsTrigger>
          <TabsTrigger value="districts" data-testid="tab-districts">
            <MapPin className="h-4 w-4 mr-2" />
            District Performance
          </TabsTrigger>
          <TabsTrigger value="officers" data-testid="tab-officers">
            <Users className="h-4 w-4 mr-2" />
            Officer Workload
          </TabsTrigger>
        </TabsList>

        {/* Pipeline View Tab */}
        <TabsContent value="pipeline" className="space-y-6">
          <VisualPipelineFlow 
            applications={applications} 
            onStageClick={setStatusFilter}
            activeFilter={statusFilter}
          />
          <AtRiskApplicationsTable
            applications={applications}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            onClearFilter={() => setStatusFilter(null)}
            onSearchChange={setSearchQuery}
          />
        </TabsContent>

        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="space-y-6">
          <BottlenecksView bottlenecks={bottlenecks} applications={applications} />
        </TabsContent>

        {/* Districts Tab */}
        <TabsContent value="districts" className="space-y-6">
          <DistrictPerformanceView applications={applications} />
        </TabsContent>

        {/* Officers Tab */}
        <TabsContent value="officers" className="space-y-6">
          <OfficerWorkloadView applications={applications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  valueSuffix,
  icon: Icon,
  trend,
  variant = "default"
}: {
  title: string;
  value: number;
  valueSuffix?: string;
  icon: any;
  trend: string;
  variant?: "default" | "success" | "warning" | "destructive";
}) {
  const colors = {
    default: "text-primary bg-primary/10",
    success: "text-green-600 bg-green-50",
    warning: "text-orange-600 bg-orange-50",
    destructive: "text-red-600 bg-red-50"
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${colors[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {valueSuffix ? <span className="text-base font-medium text-muted-foreground"> {valueSuffix}</span> : null}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </CardContent>
    </Card>
  );
}

// Visual Pipeline Flow Component
function VisualPipelineFlow({
  applications,
  onStageClick,
  activeFilter,
}: {
  applications: MonitoringApplication[];
  onStageClick: (status: string | null) => void;
  activeFilter: string | null;
}) {
  const stages = [
    { id: "submission", label: "Submission", color: "bg-sky-600", statuses: ["submitted"] },
    {
      id: "da_scrutiny",
      label: "DA Scrutiny",
      color: "bg-purple-600",
      statuses: ["document_verification", "under_scrutiny"],
      returnedStatus: "da_send_back",
    },
    {
      id: "dtdo_verification",
      label: "DTDO Verification",
      color: "bg-indigo-600",
      statuses: ["forwarded_to_dtdo", "dtdo_review"],
      returnedStatus: "dtdo_revert",
    },
    {
      id: "inspection_phase",
      label: "Inspection Phase",
      color: "bg-orange-500",
      statuses: ["site_inspection_scheduled", "site_inspection_complete"],
    },
    {
      id: "payment_pending",
      label: "Payment Pending",
      color: "bg-yellow-500",
      statuses: ["payment_pending"],
    },
    {
      id: "rc_issued",
      label: "RC Issued",
      color: "bg-green-500",
      statuses: ["approved"],
    },
  ];

  const stageCount = stages.map((stage) => {
    const count = applications.filter((app) => stage.statuses.includes(app.status ?? "")).length;
    const returned = stage.returnedStatus
      ? applications.filter((app) => app.status === stage.returnedStatus).length
      : 0;
    return {
      ...stage,
      count,
      returned,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Application Pipeline Flow
        </CardTitle>
        <CardDescription>
          Click any stage to filter applications - Visual representation of workflow stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          {stageCount.map((stage, index) => (
            <div key={stage.id} className="flex items-center gap-3 flex-1">
              <div className="flex-1">
                <div className="relative">
                  <button
                    onClick={() => onStageClick(activeFilter === stage.id ? null : stage.id)}
                    className={`w-full ${stage.color} text-white rounded-lg p-4 text-center shadow-md hover:shadow-xl transition-shadow cursor-pointer ${
                      activeFilter === stage.id ? "ring-4 ring-white ring-offset-2" : ""
                    }`}
                    data-testid={`filter-stage-${stage.id}`}
                  >
                    <div className="text-2xl font-bold">{stage.count}</div>
                    <div className="text-xs font-medium mt-1 opacity-90">{stage.label}</div>
                  </button>
                  {stage.count > 0 && (
                    <Badge variant="secondary" className="absolute -top-2 -right-2 pointer-events-none">
                      {Math.round((stage.count / applications.length) * 100)}%
                    </Badge>
                  )}
                  {stage.returned ? (
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-white/80 flex items-center gap-1">
                      <span aria-hidden>↩️</span>
                      {stage.returned} returned to applicant
                    </div>
                  ) : null}
                </div>
              </div>
              {index < stageCount.length - 1 && (
                <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Applications Table Component
function AtRiskApplicationsTable({ 
  applications, 
  statusFilter, 
  searchQuery,
  onClearFilter,
  onSearchChange
}: { 
  applications: MonitoringApplication[];
  statusFilter: string | null;
  searchQuery: string;
  onClearFilter: () => void;
  onSearchChange: (query: string) => void;
}) {
  const [, setLocation] = useLocation();
  
  // Memoize filtered applications for performance
  const filteredApps = useMemo(() => {
    return applications
      .map((app) => ({ app, daysInStage: getDaysInStage(app) }))
      .filter(({ app, daysInStage }) => {
        if (app.status === "approved" || app.status === "rejected") return false;
        if (daysInStage < 7) return false;
        const matchesStatus = !statusFilter || app.status === statusFilter;
        const matchesSearch =
          !searchQuery ||
          app.propertyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.applicationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.district?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => b.daysInStage - a.daysInStage);
  }, [applications, statusFilter, searchQuery]);

  // Get stage label for filter badge
  const getStageLabel = (status: string) => {
    const labels: Record<string, string> = {
      submitted: "Submission",
      document_verification: "DA Scrutiny",
      under_scrutiny: "DA Scrutiny",
      forwarded_to_dtdo: "DTDO Verification",
      dtdo_review: "DTDO Verification",
      site_inspection_scheduled: "Inspection Phase",
      site_inspection_complete: "Inspection Phase",
      payment_pending: "Payment Pending",
      approved: "RC Issued",
    };
    return labels[status] || status.replace(/_/g, " ");
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Slow Moving / At-Risk Applications
              <Badge variant="secondary">{filteredApps.length}</Badge>
            </CardTitle>
            <CardDescription>
              Files stuck more than 7 days in their current stage. Click to nudge the assignee or applicant.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-9"
                data-testid="input-search-applications"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-muted rounded-full p-0.5 transition-colors"
                  data-testid="button-clear-search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {statusFilter && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearFilter}
                data-testid="button-clear-filter"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filter
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-xs text-muted-foreground uppercase font-medium tracking-wide px-2">
          <div className="w-[25%]">Application</div>
          <div className="w-[18%]">Current Stage</div>
          <div className="w-[18%]">Assigned To</div>
          <div className="w-[14%] text-right">Days in Stage</div>
          <div className="w-[15%] text-right">Status</div>
          <div className="w-[10%] text-right">Action</div>
        </div>
        {filteredApps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg mt-4">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nothing appears stuck right now.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {filteredApps.slice(0, 20).map(({ app, daysInStage }) => (
              <div
                key={app.id}
                onClick={() => setLocation(`/applications/${app.id}`)}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer"
                data-testid={`application-row-${app.id}`}
              >
                <div className="w-[25%]">
                  <div className="font-medium">{app.propertyName || "Unnamed Homestay"}</div>
                  <div className="text-sm text-muted-foreground">
                    {app.applicationNumber || `#${app.id}`} • {app.district || "Unknown district"}
                  </div>
                </div>
                <div className="w-[18%]">
                  <Badge variant="secondary">{getStageLabel(app.status || "draft")}</Badge>
                </div>
                <div className="w-[18%]">
                  <p className="text-sm">{app.assignedToName || app.assignedTo || `DA ${app.district ?? ""}`}</p>
                  <p className="text-xs text-muted-foreground">Owner: {app.ownerName || "Unknown"}</p>
                </div>
                <div className="w-[14%] text-right">
                  <span className={daysInStage > 14 ? "text-destructive font-semibold" : "font-medium"}>
                    {daysInStage} days
                  </span>
                </div>
                <div className="w-[15%] text-right">
                  <Badge variant={isWaitingOnApplicant(app.status) ? "outline" : "warning"}>
                    {isWaitingOnApplicant(app.status) ? "Waiting on applicant" : "Pending officer"}
                  </Badge>
                </div>
                <div className="w-[10%] text-right">
                  <Badge variant="outline">{app.status || "Draft"}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    submitted: "default",
    document_verification: "outline",
    site_inspection_scheduled: "outline",
    payment_pending: "outline",
    approved: "default",
    rejected: "destructive"
  };

  return (
    <Badge variant={variants[status] || "default"} className="capitalize">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

// SLA Indicator Component
function SLAIndicator({ app }: { app: MonitoringApplication }) {
  if (!app.submittedAt) return null;

  const daysSinceSubmission = Math.floor(
    (new Date().getTime() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const slaThreshold = SLA_THRESHOLDS.total;
  const slaPercentage = (daysSinceSubmission / slaThreshold) * 100;

  let variant: "default" | "destructive" | "outline" = "default";
  let icon = Timer;
  
  if (slaPercentage >= 100) {
    variant = "destructive";
    icon = AlertCircle;
  } else if (slaPercentage >= 70) {
    variant = "outline";
    icon = AlertTriangle;
  }

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      {icon === Timer && <Timer className="h-3 w-3" />}
      {icon === AlertTriangle && <AlertTriangle className="h-3 w-3" />}
      {icon === AlertCircle && <AlertCircle className="h-3 w-3" />}
      {daysSinceSubmission} days
    </Badge>
  );
}

const applicantStatuses = new Set(["da_send_back", "dtdo_revert"]);

const getDaysInStage = (application: MonitoringApplication) => {
  const anchor = application.updatedAt || application.statusUpdatedAt || application.submittedAt;
  if (!anchor) return 0;
  return Math.floor((Date.now() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24));
};

const isWaitingOnApplicant = (status?: string | null) => {
  if (!status) return false;
  return applicantStatuses.has(status);
};

// Bottlenecks View
function BottlenecksView({
  bottlenecks,
  applications
}: {
  bottlenecks: Array<{ stage: string; count: number; avgDays: number }>;
  applications: MonitoringApplication[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Identified Bottlenecks
        </CardTitle>
        <CardDescription>
          Stages where applications are getting delayed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bottlenecks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
            <p>No bottlenecks detected! All workflows running smoothly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bottlenecks.map((bottleneck, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium capitalize">
                    {bottleneck.stage.replace(/_/g, ' ')}
                  </div>
                  <Badge variant="destructive">
                    {bottleneck.count} applications stuck
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Average time: {bottleneck.avgDays} days
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// District Performance View
function DistrictPerformanceView({ applications }: { applications: MonitoringApplication[] }) {
  const districtStats = applications.reduce((acc, app) => {
    const district = app.district || 'Unknown';
    if (!acc[district]) {
      acc[district] = { total: 0, approved: 0, pending: 0, rejected: 0 };
    }
    acc[district].total++;
    if (app.status === 'approved') acc[district].approved++;
    else if (app.status === 'rejected') acc[district].rejected++;
    else acc[district].pending++;
    return acc;
  }, {} as Record<string, { total: number; approved: number; pending: number; rejected: number }>);

  // Prepare data for charts
  const chartData = Object.entries(districtStats)
    .map(([district, stats]) => ({
      district: district.length > 15 ? district.substring(0, 15) + '...' : district,
      fullDistrict: district,
      total: stats.total,
      approved: stats.approved,
      pending: stats.pending,
      rejected: stats.rejected,
      approvalRate: Math.round((stats.approved / stats.total) * 100)
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12); // Top 12 districts

  const COLORS = {
    approved: '#10b981',
    pending: '#f59e0b',
    rejected: '#ef4444'
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Top Performing District</CardDescription>
            <CardTitle className="text-2xl">
              {chartData.length > 0 ? chartData[0].fullDistrict : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
              {chartData.length > 0 ? `${chartData[0].approvalRate}% approval rate` : 'No data'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Districts</CardDescription>
            <CardTitle className="text-2xl">{Object.keys(districtStats).length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              Across Himachal Pradesh
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Approval Rate</CardDescription>
            <CardTitle className="text-2xl">
              {chartData.length > 0 
                ? Math.round(chartData.reduce((sum, d) => sum + d.approvalRate, 0) / chartData.length)
                : 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              State-wide average
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Volume by District */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Application Volume by District
          </CardTitle>
          <CardDescription>
            Total applications received from each district
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="district" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-2">{data.fullDistrict}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span>Total:</span>
                            <span className="font-medium">{data.total}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-green-600">Approved:</span>
                            <span className="font-medium text-green-600">{data.approved}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-orange-600">Pending:</span>
                            <span className="font-medium text-orange-600">{data.pending}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-red-600">Rejected:</span>
                            <span className="font-medium text-red-600">{data.rejected}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="approved" stackId="a" fill={COLORS.approved} name="Approved" />
              <Bar dataKey="pending" stackId="a" fill={COLORS.pending} name="Pending" />
              <Bar dataKey="rejected" stackId="a" fill={COLORS.rejected} name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Approval Rate Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            District Approval Rate Comparison
          </CardTitle>
          <CardDescription>
            Percentage of applications approved by district
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="district" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 12 }}
                label={{ value: 'Approval Rate (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: any) => [`${value}%`, 'Approval Rate']}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.district === label);
                  return item?.fullDistrict || label;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="approvalRate" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Approval Rate"
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Officer Workload View
function OfficerWorkloadView({ applications }: { applications: MonitoringApplication[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Officer Workload Distribution
        </CardTitle>
        <CardDescription>
          Current workload and performance metrics for reviewing officers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3" />
          <p>Officer performance tracking coming soon</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper Functions
function calculatePipelineStats(applications: MonitoringApplication[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeApps = applications.filter(
    (app) => app.status !== "approved" && app.status !== "rejected",
  );
  const newToday = applications.filter(
    (app) => app.submittedAt && new Date(app.submittedAt) >= today,
  );
  const approvalsThisWeek = applications.filter(
    (app) => app.approvedAt && new Date(app.approvedAt) >= weekAgo,
  );

  const bottleneckByStage = activeApps.reduce<Record<string, number>>((acc, app) => {
    if (!app.submittedAt) {
      return acc;
    }
    const days = Math.floor((now.getTime() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days > 7) {
      const key = app.status ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
    }
    return acc;
  }, {});

  const criticalBottlenecks = Object.values(bottleneckByStage).reduce((sum, value) => sum + value, 0);
  const mostDelayedStageEntry = Object.entries(bottleneckByStage).sort((a, b) => b[1] - a[1])[0];
  const stageLabels: Record<string, string> = {
    submitted: "Submission",
    document_verification: "DA Scrutiny",
    under_scrutiny: "DA Scrutiny",
    forwarded_to_dtdo: "DTDO Verification",
    dtdo_review: "DTDO Verification",
    site_inspection_scheduled: "Inspection Phase",
    site_inspection_complete: "Inspection Phase",
    payment_pending: "Payment Pending",
    approved: "RC Issued",
  };

  const approvedApps = applications.filter((app) => app.status === "approved");
  const completedApps = applications.filter((app) => app.submittedAt && app.approvedAt);
  const avgProcessingTimeRaw =
    completedApps.reduce((sum, app) => {
      const days = Math.floor(
        (new Date(app.approvedAt!).getTime() - new Date(app.submittedAt!).getTime()) / (1000 * 60 * 60 * 24),
      );
      return sum + days;
    }, 0) / Math.max(completedApps.length, 1);

  return {
    activePipeline: activeApps.length,
    newToday: newToday.length,
    criticalBottlenecks,
    mostDelayedStage: mostDelayedStageEntry ? stageLabels[mostDelayedStageEntry[0]] ?? "Unknown stage" : "",
    avgProcessingTime: Math.max(Math.round(isFinite(avgProcessingTimeRaw) ? avgProcessingTimeRaw : 0), 0),
    totalCertificates: approvedApps.length,
    completedThisWeek: approvalsThisWeek.length,
  };
}

function identifyBottlenecks(applications: MonitoringApplication[]) {
  const stageGroups = applications.reduce((acc, app) => {
    const status = app.status || 'draft';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(app);
    return acc;
  }, {} as Record<string, MonitoringApplication[]>);

  const bottlenecks: Array<{ stage: string; count: number; avgDays: number }> = [];

  Object.entries(stageGroups).forEach(([stage, apps]) => {
    if (stage === 'approved' || stage === 'rejected') return;

    const avgDays = Math.round(
      apps.reduce((sum, app) => {
        if (!app.submittedAt) return sum;
        const days = Math.floor(
          (new Date().getTime() - new Date(app.submittedAt).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0) / Math.max(apps.length, 1)
    );

    // Identify as bottleneck if more than 5 applications or avg days > 7
    if (apps.length > 5 || avgDays > 7) {
      bottlenecks.push({ stage, count: apps.length, avgDays });
    }
  });

  return bottlenecks.sort((a, b) => b.count - a.count);
}

function identifySLABreaches(applications: MonitoringApplication[]) {
  return applications.filter(app => {
    if (!app.submittedAt || app.status === 'approved' || app.status === 'rejected') {
      return false;
    }

    const daysSinceSubmission = Math.floor(
      (new Date().getTime() - new Date(app.submittedAt).getTime()) / 
      (1000 * 60 * 60 * 24)
    );

    return daysSinceSubmission > SLA_THRESHOLDS.total;
  });
}
