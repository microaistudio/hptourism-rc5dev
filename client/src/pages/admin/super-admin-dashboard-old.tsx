import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Database,
  Activity,
  Loader2,
  Settings,
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  applications: {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
    draft: number;
  };
  users: {
    total: number;
    propertyOwners: number;
    officers: number;
    admins: number;
  };
  inspections: {
    scheduled: number;
    completed: number;
    pending: number;
  };
  payments: {
    total: number;
    completed: number;
    pending: number;
    totalAmount: number;
  };
}

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const quickStats = [
    {
      title: "Total Applications",
      value: stats?.applications.total || 0,
      description: "Statewide",
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Pending Review",
      value: stats?.applications.pending || 0,
      description: "Requires action",
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
    },
    {
      title: "Inspections",
      value: stats?.inspections.scheduled || 0,
      description: "Scheduled",
      icon: Activity,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: "Approved",
      value: stats?.applications.approved || 0,
      description: "Completed",
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, Super Administrator!</h1>
            <p className="text-muted-foreground">
              System overview and management console
            </p>
          </div>
          <Link href="/admin/super-console">
            <Button data-testid="button-super-console">
              <Settings className="w-4 h-4 mr-2" />
              Super Console
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Application Status Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle>Application Status</CardTitle>
            </div>
            <CardDescription>Current state of all applications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20">
                  Draft
                </Badge>
                <span className="text-sm text-muted-foreground">Applications in progress</span>
              </div>
              <span className="font-semibold">{stats?.applications.draft || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/20">
                  Pending
                </Badge>
                <span className="text-sm text-muted-foreground">Awaiting review</span>
              </div>
              <span className="font-semibold">{stats?.applications.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20">
                  Under Review
                </Badge>
                <span className="text-sm text-muted-foreground">Being processed</span>
              </div>
              <span className="font-semibold">{stats?.applications.underReview || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20">
                  Approved
                </Badge>
                <span className="text-sm text-muted-foreground">Certificates issued</span>
              </div>
              <span className="font-semibold">{stats?.applications.approved || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20">
                  Rejected
                </Badge>
                <span className="text-sm text-muted-foreground">Not approved</span>
              </div>
              <span className="font-semibold">{stats?.applications.rejected || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>User Distribution</CardTitle>
            </div>
            <CardDescription>Registered users by role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Property Owners</Badge>
                <span className="text-sm text-muted-foreground">Applicants</span>
              </div>
              <span className="font-semibold">{stats?.users.propertyOwners || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Officers</Badge>
                <span className="text-sm text-muted-foreground">DA, DTDO, State</span>
              </div>
              <span className="font-semibold">{stats?.users.officers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Administrators</Badge>
                <span className="text-sm text-muted-foreground">Admin, Super Admin</span>
              </div>
              <span className="font-semibold">{stats?.users.admins || 0}</span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Users</span>
                <span className="text-xl font-bold text-primary">
                  {stats?.users.total || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle>Inspection Pipeline</CardTitle>
            </div>
            <CardDescription>Field inspection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20">
                  Scheduled
                </Badge>
                <span className="text-sm text-muted-foreground">Upcoming inspections</span>
              </div>
              <span className="font-semibold">{stats?.inspections.scheduled || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/20">
                  Pending
                </Badge>
                <span className="text-sm text-muted-foreground">Awaiting assignment</span>
              </div>
              <span className="font-semibold">{stats?.inspections.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20">
                  Completed
                </Badge>
                <span className="text-sm text-muted-foreground">Reports submitted</span>
              </div>
              <span className="font-semibold">{stats?.inspections.completed || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle>Payment Overview</CardTitle>
            </div>
            <CardDescription>Revenue collection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20">
                  Completed
                </Badge>
                <span className="text-sm text-muted-foreground">Successful payments</span>
              </div>
              <span className="font-semibold">{stats?.payments.completed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/20">
                  Pending
                </Badge>
                <span className="text-sm text-muted-foreground">Awaiting payment</span>
              </div>
              <span className="font-semibold">{stats?.payments.pending || 0}</span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Revenue</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  ₹{(stats?.payments.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle>Quick Actions</CardTitle>
            </div>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-start" data-testid="button-manage-users">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/admin/super-console">
                <Button variant="outline" className="w-full justify-start" data-testid="button-system-reset">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  System Reset
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" className="w-full justify-start" data-testid="button-view-analytics">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
              <Link href="/workflow-monitoring">
                <Button variant="outline" className="w-full justify-start" data-testid="button-workflow-monitoring">
                  <Activity className="w-4 h-4 mr-2" />
                  Workflow Monitor
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
