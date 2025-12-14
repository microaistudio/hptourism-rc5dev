/**
 * Admin Console - Clean Hub Design
 * 
 * Simplified admin dashboard with clean cards and clear navigation.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Users,
  ClipboardList,
  FileText,
  Download,
  MapPin,
  Bell,
  ClipboardCheck,
  ArrowRight,
  Settings
} from "lucide-react";

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: typeof Users;
}

const quickActions: QuickAction[] = [
  {
    title: "RC Applications",
    description: "Filter, export, or drill into any owner application",
    href: "/admin/rc-applications",
    icon: ClipboardList,
  },
  {
    title: "User Management",
    description: "Create or disable DA, DTDO, and Admin logins",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Audit Timeline",
    description: "Investigate escalations or trace approvals",
    href: "/admin/audit-log",
    icon: FileText,
  },
  {
    title: "RC Certificate Generator",
    description: "Generate or re-issue RC PDFs",
    href: "/admin/rc-application-certificate",
    icon: Download,
  },
  {
    title: "Existing RC Support",
    description: "Guide legacy license holders through onboarding",
    href: "/admin/legacy-owner-support",
    icon: ClipboardCheck,
  },
  {
    title: "LGD Import",
    description: "Sync LGD districts and blocks",
    href: "/admin/lgd-import",
    icon: MapPin,
  },
];

export default function AdminConsole() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto max-w-6xl p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-muted-foreground mt-1">
              Manage applications, users, and certificates
            </p>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors w-fit">
                      <action.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base mt-3">{action.title}</CardTitle>
                    <CardDescription className="text-sm">
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

        {/* Help Section */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              For advanced configuration including SMS/Email gateways, payment settings, or database tools,
              contact your Super Admin or visit the Super Admin Console.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
