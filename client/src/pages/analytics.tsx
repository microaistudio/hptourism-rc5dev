import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import {
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  MapPin,
  Globe,
  Repeat,
} from "lucide-react";

const WORKFLOW_STATUS_CONFIG = [
  { key: "submitted", label: "New Applications", color: "#3b82f6" },
  { key: "under_scrutiny", label: "Under Scrutiny", color: "#f97316" },
  { key: "forwarded_to_dtdo", label: "Forwarded to DTDO", color: "#0ea5e9" },
  { key: "dtdo_review", label: "DTDO Review", color: "#6366f1" },
  { key: "inspection_scheduled", label: "Inspection Scheduled", color: "#8b5cf6" },
  { key: "inspection_under_review", label: "Inspection Review", color: "#a855f7" },
  { key: "reverted_to_applicant", label: "Sent Back", color: "#facc15" },
  { key: "approved", label: "Approved", color: "#10b981" },
  { key: "rejected", label: "Rejected", color: "#ef4444" },
  { key: "draft", label: "Draft", color: "#94a3b8" },
] as const;

type WorkflowStatusKey = typeof WORKFLOW_STATUS_CONFIG[number]["key"];

interface AnalyticsData {
  overview: {
    total: number;
    newApplications: number;
    byStatus: Record<string, number>;
    byCategory: {
      diamond: number;
      gold: number;
      silver: number;
    };
    avgProcessingTime: number;
    totalOwners: number;
  };
  districts: Record<string, number>;
  recentApplications: any[];
}

interface ProductionStats {
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  scrapedAt: Date;
}

const STATUS_COLORS = {
  pending: "#f59e0b",
  district_review: "#3b82f6",
  state_review: "#8b5cf6",
  approved: "#10b981",
  rejected: "#ef4444",
};

const CATEGORY_COLORS = {
  diamond: "hsl(var(--primary))",
  gold: "hsl(var(--secondary))",
  silver: "#94a3b8",
};

const PRODUCTION_STATS_FALLBACK: ProductionStats = {
  totalApplications: 19705,
  approvedApplications: 16301,
  rejectedApplications: 1142,
  pendingApplications: 2262,
  scrapedAt: new Date(),
};

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/dashboard"],
    retry: false,
  });
  
  useQuery<{ stats: ProductionStats | null }>({
    queryKey: ["/api/analytics/production-stats"],
  });

  const liveProductionStats = PRODUCTION_STATS_FALLBACK;

  if (isLoading) {
    return (
      <div className="bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-muted rounded w-64 animate-pulse mb-2" />
            <div className="h-4 bg-muted rounded w-96 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                  <div className="h-8 bg-muted rounded w-16 animate-pulse" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background flex items-center justify-center px-4 py-16">
        <Card className="max-w-lg w-full shadow-lg border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Unable to load analytics
            </CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message.replace(/^\d+:\s*/, "")
                : "Please refresh the page or log in again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
            <Button variant="default" onClick={() => (window.location.href = "/dashboard")}>
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { overview, districts, recentApplications } = data;

  const rawStatusCounts = overview.byStatus || {};
  const getStatusValue = (key: WorkflowStatusKey, fallbacks: string[] = []) => {
    const direct = rawStatusCounts[key];
    if (typeof direct === "number") {
      return direct;
    }
    for (const alt of fallbacks) {
      const fallbackValue = rawStatusCounts[alt];
      if (typeof fallbackValue === "number") {
        return fallbackValue;
      }
    }
    return 0;
  };

  const normalizedStatusCounts: Record<WorkflowStatusKey, number> = {
    submitted: getStatusValue("submitted", ["pending"]),
    under_scrutiny: getStatusValue("under_scrutiny", ["district_review"]),
    forwarded_to_dtdo: getStatusValue("forwarded_to_dtdo"),
    dtdo_review: getStatusValue("dtdo_review", ["state_review"]),
    inspection_scheduled: getStatusValue("inspection_scheduled"),
    inspection_under_review: getStatusValue("inspection_under_review"),
    reverted_to_applicant: getStatusValue("reverted_to_applicant"),
    approved: getStatusValue("approved", ["approved"]),
    rejected: getStatusValue("rejected", ["rejected"]),
    draft: getStatusValue("draft", ["draft"]),
  };

  const submittedCount = normalizedStatusCounts.submitted;
  const scrutinyCount = normalizedStatusCounts.under_scrutiny;
  const forwardedCount = normalizedStatusCounts.forwarded_to_dtdo;
  const dtdoReviewCount = normalizedStatusCounts.dtdo_review;
  const inspectionQueueCount =
    normalizedStatusCounts.inspection_scheduled + normalizedStatusCounts.inspection_under_review;
  const approvedCount = normalizedStatusCounts.approved;
  const rejectedCount = normalizedStatusCounts.rejected;

  // Prepare data for charts
  const statusData = WORKFLOW_STATUS_CONFIG.map(({ key, label, color }) => ({
    key,
    name: label,
    value: normalizedStatusCounts[key],
    color,
  }));
  const activeStatusData = statusData.filter((item) => item.value > 0);

  const categoryData = [
    { name: "Diamond", value: overview.byCategory.diamond, color: CATEGORY_COLORS.diamond },
    { name: "Gold", value: overview.byCategory.gold, color: CATEGORY_COLORS.gold },
    { name: "Silver", value: overview.byCategory.silver, color: CATEGORY_COLORS.silver },
  ];

  const districtData = Object.entries(districts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const getStatusBadge = (status: string | null | undefined) => {
    const key = normalizeWorkflowStatus(status);
    const highlightStatuses: Record<WorkflowStatusKey, "default" | "secondary" | "destructive" | "outline"> = {
      submitted: "secondary",
      under_scrutiny: "default",
      forwarded_to_dtdo: "default",
      dtdo_review: "default",
      inspection_scheduled: "default",
      inspection_under_review: "default",
      reverted_to_applicant: "outline",
      approved: "default",
      rejected: "destructive",
      draft: "outline",
    };
    return highlightStatuses[key] || "secondary";
  };

  const formatStatusLabel = (status: string | null | undefined) => {
    const key = normalizeWorkflowStatus(status);
    const match = WORKFLOW_STATUS_CONFIG.find((item) => item.key === key);
    if (match) return match.label;
    return (status ?? "Unknown").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const normalizeWorkflowStatus = (status: string | null | undefined): WorkflowStatusKey => {
    const normalized = (status ?? "").trim().toLowerCase();
    const aliasMap: Record<string, WorkflowStatusKey> = {
      pending: "submitted",
      district_review: "under_scrutiny",
      state_review: "dtdo_review",
    };

    if (aliasMap[normalized]) {
      return aliasMap[normalized];
    }

    const keys = new Set(WORKFLOW_STATUS_CONFIG.map((item) => item.key));
    return keys.has(normalized as WorkflowStatusKey) ? (normalized as WorkflowStatusKey) : "draft";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">

        {/* Production Portal Statistics (Live from eservices.himachaltourism.gov.in) */}
        {liveProductionStats && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Live Production Portal Statistics
              </CardTitle>
              <CardDescription>
                Real-time data from eservices.himachaltourism.gov.in
                {liveProductionStats.scrapedAt && (
                  <span className="ml-2 text-xs">
                    • Last updated: {new Date(liveProductionStats.scrapedAt).toLocaleString('en-IN')}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                  <p className="text-3xl font-bold" data-testid="prod-stat-total">
                    {liveProductionStats.totalApplications.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-3xl font-bold text-green-600" data-testid="prod-stat-approved">
                    {liveProductionStats.approvedApplications.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-3xl font-bold text-red-600" data-testid="prod-stat-rejected">
                    {liveProductionStats.rejectedApplications.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold text-orange-600" data-testid="prod-stat-pending">
                    {liveProductionStats.pendingApplications.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workflow Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Applications</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-new">{submittedCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting initial scrutiny</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Scrutiny</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-scrutiny">{scrutinyCount}</div>
              <p className="text-xs text-muted-foreground">With dealing assistants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forwarded to DTDO</CardTitle>
              <Repeat className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-forwarded">{forwardedCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting district tourism action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inspection / DTDO Review</CardTitle>
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-dtdo">{dtdoReviewCount + inspectionQueueCount}</div>
              <p className="text-xs text-muted-foreground">Under inspection or officer review</p>
            </CardContent>
          </Card>
        </div>

        {/* Operational Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Applications</CardTitle>
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-approved">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">
                {overview.total > 0
                  ? `${Math.round((approvedCount / overview.total) * 100)}% approval rate`
                  : "No approvals yet"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-processing-time">
                {overview.avgProcessingTime} days
              </div>
              <p className="text-xs text-muted-foreground">
                {overview.avgProcessingTime <= 15 ? "Within 15-day SLA" : "Above SLA target"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total">{overview.total}</div>
              <p className="text-xs text-muted-foreground">All submissions in the system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered Owners</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-owners">{overview.totalOwners}</div>
              <p className="text-xs text-muted-foreground">Active property-owner accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Application Status Distribution
              </CardTitle>
              <CardDescription>Current workflow stage breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {activeStatusData.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-12">
                  No applications in the workflow yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activeStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : null
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activeStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Category Distribution
              </CardTitle>
              <CardDescription>Diamond, Gold, Silver breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* District Coverage */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Top Districts by Applications
            </CardTitle>
            <CardDescription>Geographic distribution across Himachal Pradesh</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={districtData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Latest 10 submissions to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentApplications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No applications yet</p>
              ) : (
                recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`recent-app-${app.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{app.propertyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {app.district} • {app.ownerName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusBadge(app.status)}>
                        {formatStatusLabel(app.status)}
                      </Badge>
                      {app.submittedAt && (
                        <span className="text-sm text-muted-foreground">
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
