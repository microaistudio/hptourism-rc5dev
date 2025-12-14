import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { fetcher, apiRequest } from "@/lib/queryClient";

type InspectionScheduleResponse = {
  order: {
    id: string;
    status: string | null;
    inspectionDate: string | null;
    specialInstructions: string | null;
    assignedTo: {
      id: string;
      fullName: string;
      mobile: string | null;
    } | null;
  };
  acknowledgedAt: string | null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  try {
    return format(new Date(value), "PPP 'at' p");
  } catch {
    return null;
  }
};

export function InspectionScheduleCard({
  applicationId,
  status,
}: {
  applicationId?: string | null;
  status?: string | null;
}) {
  const showCard = Boolean(
    applicationId && status && ["inspection_scheduled", "inspection_completed"].includes(status),
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const scheduleQuery = useQuery<InspectionScheduleResponse>({
    queryKey: ["/api/applications", applicationId, "inspection-schedule"],
    enabled: showCard,
    queryFn: () => fetcher(`/api/applications/${applicationId}/inspection-schedule`),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/applications/${applicationId}/inspection-schedule/acknowledge`,
      );
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Thanks for confirming", description: "Inspection schedule acknowledged." });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "inspection-schedule"] });
    },
    onError: () => {
      toast({
        title: "Unable to acknowledge",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  if (!showCard) return null;

  if (scheduleQuery.isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Inspection Schedule</CardTitle>
          <CardDescription>Loading schedule…</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-3 h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (scheduleQuery.isError || !scheduleQuery.data) {
    return null;
  }

  const { order, acknowledgedAt } = scheduleQuery.data;
  const formattedDate = formatDateTime(order.inspectionDate);
  const formattedAck = formatDateTime(acknowledgedAt);

  const canAcknowledge = !acknowledgedAt && order.status !== "completed";

  return (
    <Card className="mb-6 border border-slate-200">
      <CardHeader>
        <CardTitle>Inspection Schedule</CardTitle>
        <CardDescription>
          Review the scheduled visit and acknowledge so the inspection team knows you're ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Scheduled for</p>
          <p>{formattedDate ?? "Inspection date will be shared soon."}</p>
        </div>
        {order.assignedTo && (
          <div>
            <p className="font-medium text-foreground">Assigned officer</p>
            <p>
              {order.assignedTo.fullName}
              {order.assignedTo.mobile ? ` · ${order.assignedTo.mobile}` : ""}
            </p>
          </div>
        )}
        {order.specialInstructions && (
          <div>
            <p className="font-medium text-foreground">Instructions</p>
            <p>{order.specialInstructions}</p>
          </div>
        )}
        {acknowledgedAt ? (
          <div className="flex items-center gap-2 text-emerald-700">
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
              Acknowledged
            </Badge>
            <span>{formattedAck ? `Confirmed on ${formattedAck}` : "Confirmed"}</span>
          </div>
        ) : (
          <p className="text-amber-600">Please acknowledge so we know you're expecting the inspection team.</p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={!canAcknowledge || acknowledgeMutation.isPending}
            onClick={() => acknowledgeMutation.mutate()}
          >
            {acknowledgeMutation.isPending ? "Acknowledging..." : "Acknowledge Schedule"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
