import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type NotificationRule = {
  id: string;
  label: string;
  description: string;
  smsEnabled: boolean;
  smsTemplate: string;
  emailEnabled: boolean;
  emailSubject: string;
  emailBody: string;
  placeholders: string[];
};

type NotificationSettingsResponse = {
  events: NotificationRule[];
  updatedAt?: string | null;
  updatedBy?: string | null;
};

const humanize = (value?: string | null) => {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

export const NotificationRulesCard = () => {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery<NotificationSettingsResponse>({
    queryKey: ["/api/admin/notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/notifications");
      return (await response.json()) as NotificationSettingsResponse;
    },
  });
  const [rules, setRules] = useState<NotificationRule[]>([]);

  useEffect(() => {
    if (data?.events) {
      setRules(data.events);
    }
  }, [data?.events]);

  const notificationsMutation = useMutation({
    mutationFn: async (payload: { events: NotificationRule[] }) =>
      apiRequest("PUT", "/api/admin/notifications", payload),
    onSuccess: () => {
      toast({ title: "Notification settings saved" });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update notification settings",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const lastUpdatedLabel = useMemo(() => {
    if (!data?.updatedAt) return null;
    return humanize(data.updatedAt);
  }, [data?.updatedAt]);

  const handleRuleChange = (id: string, updater: (rule: NotificationRule) => NotificationRule) => {
    setRules((prev) => prev.map((rule) => (rule.id === id ? updater(rule) : rule)));
  };

  const canSave = rules.length > 0 && !isLoading;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <CardTitle>Workflow Notifications</CardTitle>
        </div>
        <CardDescription>SMS/email templates for OTP, scrutiny, inspection, and payment milestones</CardDescription>
        {lastUpdatedLabel && (
          <Badge variant="outline" className="w-fit text-xs">
            Updated {lastUpdatedLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="space-y-4 border rounded-lg p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold">{rule.label}</h4>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
                <Badge variant="secondary" className="text-[11px] font-mono uppercase">
                  {rule.id}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {rule.placeholders.map((token) => (
                  <Badge key={token} variant="outline" className="text-xs font-mono">
                    {`{{${token}}}`}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">SMS template</Label>
                  <Switch
                    checked={rule.smsEnabled}
                    onCheckedChange={(checked) =>
                      handleRuleChange(rule.id, (current) => ({
                        ...current,
                        smsEnabled: checked,
                      }))
                    }
                    disabled={isLoading || notificationsMutation.isPending}
                  />
                </div>
                <Textarea
                  value={rule.smsTemplate}
                  onChange={(e) =>
                    handleRuleChange(rule.id, (current) => ({
                      ...current,
                      smsTemplate: e.target.value,
                    }))
                  }
                  placeholder="Enter SMS template"
                  disabled={
                    !rule.smsEnabled || isLoading || notificationsMutation.isPending
                  }
                  className="min-h-[120px] text-sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Email subject & body</Label>
                  <Switch
                    checked={rule.emailEnabled}
                    onCheckedChange={(checked) =>
                      handleRuleChange(rule.id, (current) => ({
                        ...current,
                        emailEnabled: checked,
                      }))
                    }
                    disabled={isLoading || notificationsMutation.isPending}
                  />
                </div>
                <Input
                  value={rule.emailSubject}
                  onChange={(e) =>
                    handleRuleChange(rule.id, (current) => ({
                      ...current,
                      emailSubject: e.target.value,
                    }))
                  }
                  placeholder="Email subject"
                  disabled={
                    !rule.emailEnabled || isLoading || notificationsMutation.isPending
                  }
                />
                <Textarea
                  value={rule.emailBody}
                  onChange={(e) =>
                    handleRuleChange(rule.id, (current) => ({
                      ...current,
                      emailBody: e.target.value,
                    }))
                  }
                  placeholder="Email body"
                  disabled={
                    !rule.emailEnabled || isLoading || notificationsMutation.isPending
                  }
                  className="min-h-[140px] text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          onClick={() => notificationsMutation.mutate({ events: rules })}
          disabled={!canSave || notificationsMutation.isPending}
          className="w-full md:w-auto"
        >
          {notificationsMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            "Save notification rules"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
