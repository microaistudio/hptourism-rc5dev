import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { RoomDeltaModal } from "./RoomDeltaModal";

type ServiceRequestSummary = {
  id: string;
  applicationNumber: string;
  propertyName: string;
  totalRooms: number;
  maxRoomsAllowed: number;
  certificateExpiryDate: string | null;
  renewalWindowStart: string | null;
  renewalWindowEnd: string | null;
  canRenew: boolean;
  canAddRooms: boolean;
  canDeleteRooms: boolean;
  rooms: {
    single: number;
    double: number;
    family: number;
  };
  activeServiceRequest: {
    id: string;
    applicationNumber: string;
    applicationKind: string;
    status: string;
    totalRooms: number;
    createdAt: string;
  } | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  try {
    return format(new Date(value), "d MMM yyyy");
  } catch {
    return null;
  }
};

const GuardRail = () => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm">
    <p className="font-semibold text-slate-800 mb-1">Service guardrails</p>
    <p className="text-muted-foreground">
      We're showcasing upcoming service actions so you know what's coming next. Renewal will remain disabled until your
      window opens, while cancellation/add/delete flows are in "Under Development (Testing Stage)" preview mode and do
      not submit live requests yet.
    </p>
  </div>
);

const EmptyState = () => (
  <Card className="border-dashed bg-muted/40">
    <CardContent className="py-10 text-center text-sm text-muted-foreground">
      No approved applications are eligible for service actions right now. Once your certificate is issued, you'll see
      renewal and room adjustment options here.
    </CardContent>
  </Card>
);

export function ServiceCenterPanel() {
  const [, setLocation] = useLocation();
  const { data, isLoading, isError } = useQuery<{ applications: ServiceRequestSummary[] }>({
    queryKey: ["/api/service-center"],
  });

  // Room delta modal state
  const [roomModalState, setRoomModalState] = useState<{
    open: boolean;
    mode: "add_rooms" | "delete_rooms";
    parentId: string;
    currentRooms: { single: number; double: number; family: number };
  } | null>(null);

  const openRoomModal = (
    mode: "add_rooms" | "delete_rooms",
    appId: string,
    rooms: { single: number; double: number; family: number }
  ) => {
    setRoomModalState({ open: true, mode, parentId: appId, currentRooms: rooms });
  };

  const closeRoomModal = () => setRoomModalState(null);

  const handleRoomModalSuccess = (nextUrl: string) => {
    closeRoomModal();
    setLocation(nextUrl);
  };

  // Discard draft state and mutation
  const { toast } = useToast();
  const [discardTarget, setDiscardTarget] = useState<{ id: string; kind: string } | null>(null);

  const discardDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/applications/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Draft Discarded",
        description: "The incomplete service request has been removed. You can now start a new one.",
      });
      setDiscardTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/service-center"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Discard",
        description: error.message || "Could not remove the draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <section className="mb-8">
        <div className="mb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isError) {
    return null;
  }

  const applications = data?.applications ?? [];
  if (applications.length === 0) {
    return (
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-xl font-semibold">Service Center</h2>
          <p className="text-sm text-muted-foreground">
            Renew or amend approved applications without starting from scratch.
          </p>
        </div>
        <EmptyState />
      </section>
    );
  }

  return (
    <section className="mb-10">
      <div className="max-w-2xl space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Service Center</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Renew or amend approved applications without starting from scratch.
          </p>
          <GuardRail />
        </div>

        {applications.map((application) => {
          const expiry = formatDate(application.certificateExpiryDate);
          const windowStart = formatDate(application.renewalWindowStart);
          const windowEnd = formatDate(application.renewalWindowEnd);
          const hasWindow = Boolean(windowStart && windowEnd);

          const activeRequestMessage = application.activeServiceRequest
            ? `Active request: ${application.activeServiceRequest.applicationKind
              .replace(/_/g, " ")
              .toUpperCase()} (${application.activeServiceRequest.status.replace(/_/g, " ")})`
            : "No pending service requests. Choose an action below to get started.";

          const actionDisabled = Boolean(application.activeServiceRequest);
          const renewDisabled = !application.canRenew || actionDisabled;

          return (
            <Card
              key={application.id}
              className="rounded-[22px] border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100/70"
            >
              <CardHeader className="pb-2 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-semibold">{application.propertyName}</CardTitle>
                    <CardDescription className="text-sm mt-2 leading-relaxed text-slate-700">
                      {expiry ? (
                        <>
                          Certificate expires on{" "}
                          <span className="font-semibold text-foreground">{expiry}</span>
                        </>
                      ) : (
                        "Certificate details will appear once issued."
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-full bg-slate-100 text-xs tracking-wide px-3 py-1">
                    {application.applicationNumber}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 text-slate-700">
                  <div>
                    <p>
                      Total rooms:{" "}
                      <span className="font-semibold text-foreground">{application.totalRooms}</span> /{" "}
                      {application.maxRoomsAllowed}
                    </p>
                    <p className="mt-1">
                      Breakdown: {application.rooms.single} single · {application.rooms.double} double ·{" "}
                      {application.rooms.family} family
                    </p>
                    <p className="mt-1">
                      Renewal window:{" "}
                      {hasWindow ? (
                        <>
                          {windowStart} to {windowEnd}
                        </>
                      ) : (
                        "Opens 90 days before expiry"
                      )}
                    </p>
                  </div>
                </div>

                <p
                  className={cn(
                    "text-sm",
                    application.activeServiceRequest ? "text-amber-600" : "text-slate-700",
                  )}
                >
                  {activeRequestMessage}
                </p>

                {/* Show discard option for draft service requests */}
                {application.activeServiceRequest && application.activeServiceRequest.status === "draft" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-full border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => setLocation(`/applications/new?draft=${application.activeServiceRequest!.id}`)}
                    >
                      Resume Draft
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => setDiscardTarget({
                        id: application.activeServiceRequest!.id,
                        kind: application.activeServiceRequest!.applicationKind,
                      })}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Discard
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={renewDisabled}
                    className={cn(
                      "rounded-full bg-[#5dbb9a] px-5 text-white hover:bg-[#4aa784]",
                      renewDisabled && "bg-muted text-muted-foreground hover:bg-muted",
                    )}
                  >
                    Renew Certificate
                  </Button>

                  <Button
                    variant="outline"
                    disabled={!application.canAddRooms || actionDisabled}
                    className="rounded-full border-slate-200"
                    onClick={() => openRoomModal("add_rooms", application.id, application.rooms)}
                  >
                    Add Rooms
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-full border-slate-200" disabled={actionDisabled}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={!application.canDeleteRooms || actionDisabled}
                        onClick={() => openRoomModal("delete_rooms", application.id, application.rooms)}
                      >
                        Delete Rooms
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={actionDisabled}
                        onClick={() => {
                          setLocation(`/applications/service-request?type=change_category&parentId=${application.id}`);
                        }}
                      >
                        Change Category
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                        disabled={actionDisabled}
                        onClick={() => {
                          setLocation(`/applications/service-request?type=cancel_certificate&parentId=${application.id}`);
                        }}
                      >
                        Cancel Certificate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Room Delta Modal */}
      {roomModalState && (
        <RoomDeltaModal
          open={roomModalState.open}
          onOpenChange={(open) => !open && closeRoomModal()}
          mode={roomModalState.mode}
          parentApplicationId={roomModalState.parentId}
          currentRooms={roomModalState.currentRooms}
          onSuccess={handleRoomModalSuccess}
        />
      )}

      {/* Discard Confirmation Dialog */}
      <AlertDialog open={!!discardTarget} onOpenChange={(open) => !open && setDiscardTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Service Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your{" "}
              <strong>{discardTarget?.kind.replace(/_/g, " ")}</strong> draft.
              You can start a new service request after discarding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => discardTarget && discardDraftMutation.mutate(discardTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={discardDraftMutation.isPending}
            >
              {discardDraftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Discard Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
