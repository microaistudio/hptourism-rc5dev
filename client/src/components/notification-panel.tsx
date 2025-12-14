import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import type { HomestayApplication } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "sla_breach" | "bottleneck" | "approval" | "new_application" | "pending_review";
  title: string;
  message: string;
  severity: "critical" | "warning" | "info" | "success";
  timestamp: Date;
  applicationId?: string;
  read: boolean;
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch all applications for notification generation
  const { data: applications = [] } = useQuery<HomestayApplication[]>({
    queryKey: ['/api/applications/all'],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Generate notifications from application data
  useEffect(() => {
    if (!applications || applications.length === 0) return;

    const generatedNotifications: Notification[] = [];

    // SLA Breach Notifications
    applications.forEach(app => {
      if (!app.submittedAt || app.status === 'approved' || app.status === 'rejected') return;

      const daysSinceSubmission = Math.floor(
        (new Date().getTime() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Critical: Over 15 days
      if (daysSinceSubmission > 15) {
        generatedNotifications.push({
          id: `sla-critical-${app.id}`,
          type: "sla_breach",
          title: "Critical SLA Breach",
          message: `Application ${app.applicationNumber} (${app.propertyName}) has been pending for ${daysSinceSubmission} days - exceeds 15-day target!`,
          severity: "critical",
          timestamp: new Date(app.submittedAt),
          applicationId: app.id,
          read: false
        });
      }
      // Warning: 10-15 days
      else if (daysSinceSubmission > 10) {
        generatedNotifications.push({
          id: `sla-warning-${app.id}`,
          type: "sla_breach",
          title: "SLA Warning",
          message: `Application ${app.applicationNumber} approaching deadline (${daysSinceSubmission}/15 days)`,
          severity: "warning",
          timestamp: new Date(app.submittedAt),
          applicationId: app.id,
          read: false
        });
      }
    });

    // Bottleneck Detection
    const statusGroups = applications.reduce((acc, app) => {
      const status = app.status || 'unknown';
      if (!acc[status]) acc[status] = [];
      acc[status].push(app);
      return acc;
    }, {} as Record<string, HomestayApplication[]>);

    Object.entries(statusGroups).forEach(([status, apps]) => {
      if (status === 'approved' || status === 'rejected') return;
      
      // Alert if more than 10 applications stuck in one stage
      if (apps.length > 10) {
        generatedNotifications.push({
          id: `bottleneck-${status}`,
          type: "bottleneck",
          title: "Bottleneck Detected",
          message: `${apps.length} applications stuck in "${status.replace(/_/g, ' ')}" stage - needs immediate attention!`,
          severity: "critical",
          timestamp: new Date(),
          read: false
        });
      }
      // Warn if 5-10 applications in one stage
      else if (apps.length >= 5) {
        generatedNotifications.push({
          id: `bottleneck-warning-${status}`,
          type: "bottleneck",
          title: "Potential Bottleneck",
          message: `${apps.length} applications in "${status.replace(/_/g, ' ')}" stage`,
          severity: "warning",
          timestamp: new Date(),
          read: false
        });
      }
    });

    // New Applications Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = applications.filter(app => 
      app.submittedAt && new Date(app.submittedAt) >= today
    );

    if (newToday.length > 0) {
      generatedNotifications.push({
        id: "new-today",
        type: "new_application",
        title: "New Applications",
        message: `${newToday.length} new application${newToday.length > 1 ? 's' : ''} submitted today`,
        severity: "info",
        timestamp: new Date(),
        read: false
      });
    }

    // Pending Reviews (document_verification, site_inspection_scheduled)
    const pendingReview = applications.filter(app =>
      app.status === 'document_verification' || 
      app.status === 'site_inspection_scheduled'
    );

    if (pendingReview.length > 0) {
      generatedNotifications.push({
        id: "pending-review",
        type: "pending_review",
        title: "Pending Reviews",
        message: `${pendingReview.length} application${pendingReview.length > 1 ? 's require' : ' requires'} your review`,
        severity: "info",
        timestamp: new Date(),
        read: false
      });
    }

    // Sort by severity and timestamp
    const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
    generatedNotifications.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    setNotifications(generatedNotifications);
  }, [applications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'sla_breach': return AlertTriangle;
      case 'bottleneck': return AlertCircle;
      case 'approval': return CheckCircle;
      case 'new_application': return FileText;
      case 'pending_review': return Clock;
      default: return Bell;
    }
  };

  const getSeverityColor = (severity: Notification['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="relative" 
          data-testid="button-notifications"
        >
          <Bell className="h-4 w-4 mr-2" />
          Alerts
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <Badge variant="secondary" data-testid="badge-total-notifications">
                {notifications.length} total
              </Badge>
            </div>
            <CardDescription>
              Real-time alerts and workflow updates
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mb-3 text-green-600" />
                  <p className="text-sm">All caught up!</p>
                  <p className="text-xs">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const Icon = getIcon(notification.type);
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${getSeverityColor(notification.severity)}`}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
