/**
 * Super Admin Hub - Clean Dashboard
 * 
 * A hub-style dashboard replacing the crowded super-console.
 * Links to dedicated pages for each major function.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
    Database,
    CreditCard,
    Shield,
    Users,
    HardDrive,
    Bell,
    Activity,
    Settings,
    FileText,
    Server,
    TestTube,
    Upload,
    BarChart3,
    CheckCircle,
    AlertTriangle,
    Clock,
    ArrowRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
}

interface QuickAction {
    title: string;
    description: string;
    href: string;
    icon: typeof Database;
    badge?: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const quickActions: QuickAction[] = [
    {
        title: "Payment Gateway",
        description: "HimKosh credentials, DDO routing, and transaction logs",
        href: "/admin/super-console#payment-settings",
        icon: CreditCard,
    },
    {
        title: "User Management",
        description: "Create, edit, or disable staff and admin accounts",
        href: "/admin/users",
        icon: Users,
    },
    {
        title: "Communications",
        description: "SMS/Email gateways and notification templates",
        href: "/admin/super-console#communications",
        icon: Bell,
    },
    {
        title: "Security Settings",
        description: "Captcha, OTP policy, and antivirus scanning",
        href: "/admin/super-console#security",
        icon: Shield,
    },
    {
        title: "Database Tools",
        description: "Configuration, reset utilities, and seed data",
        href: "/admin/super-console#database",
        icon: Database,
        badge: "Danger Zone",
        badgeVariant: "destructive",
    },
    {
        title: "Backup Manager",
        description: "Scheduled backups and restore utilities",
        href: "/admin/backup",
        icon: HardDrive,
    },
    {
        title: "Export / Import",
        description: "System migration - export and import full system data",
        href: "/admin/export-import",
        icon: Server,
    },
    {
        title: "Audit Log",
        description: "Track all system actions and exports",
        href: "/admin/audit-log",
        icon: FileText,
    },
    {
        title: "Staff Import",
        description: "Bulk import DA/DTDO accounts from CSV",
        href: "/admin/super-console#staff-tools",
        icon: Upload,
    },
];

export default function SuperAdminDashboard() {
    const { data: stats, isLoading } = useQuery<SystemStats>({
        queryKey: ["/api/admin/stats"],
    });

    const pendingCount = stats?.applications?.byStatus?.["submitted"] || 0;
    const approvedCount = stats?.applications?.byStatus?.["approved"] || 0;
    const totalUsers = stats?.users?.total || 0;
    const environment = stats?.environment || "unknown";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <div className="container mx-auto max-w-7xl p-6 space-y-8">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Settings className="h-6 w-6 text-primary" />
                            </div>
                            <Badge variant={environment === "production" ? "default" : "secondary"}>
                                {environment}
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Super Admin Console</h1>
                        <p className="text-muted-foreground mt-1">
                            Platform configuration and monitoring
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/admin/super-console">
                            <Server className="mr-2 h-4 w-4" />
                            Legacy Console
                        </Link>
                    </Button>
                </div>

                {/* Status Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Applications
                            </CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats?.applications?.total ?? "—"}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {approvedCount} approved
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pending Review
                            </CardTitle>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Awaiting processing
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                System Users
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalUsers}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats?.users?.byRole?.["property_owner"] ?? 0} owners
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Database
                            </CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats?.database?.size ?? "—"}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats?.database?.tables ?? 0} tables
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {quickActions.map((action) => (
                            <Link key={action.title} href={action.href}>
                                <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                                                <action.icon className="h-5 w-5 text-primary" />
                                            </div>
                                            {action.badge && (
                                                <Badge variant={action.badgeVariant || "outline"} className="text-xs">
                                                    {action.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-base mt-3">{action.title}</CardTitle>
                                        <CardDescription className="text-sm line-clamp-2">
                                            {action.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            Open <ArrowRight className="ml-1 h-4 w-4" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* System Health */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            System Health
                        </CardTitle>
                        <CardDescription>Current platform status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <p className="font-medium text-sm">Database</p>
                                    <p className="text-xs text-muted-foreground">Connected, {stats?.database?.size}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <p className="font-medium text-sm">File Storage</p>
                                    <p className="text-xs text-muted-foreground">{stats?.files?.total ?? 0} files, {stats?.files?.totalSize}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <p className="font-medium text-sm">API Server</p>
                                    <p className="text-xs text-muted-foreground">Healthy</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer note */}
                <div className="text-center text-sm text-muted-foreground pt-4">
                    <p>
                        For advanced configuration, use the{" "}
                        <Link href="/admin/super-console" className="text-primary hover:underline">
                            Legacy Console
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
