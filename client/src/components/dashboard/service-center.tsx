import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  const { data, isLoading, isError } = useQuery<{ applications: ServiceRequestSummary[] }>({
    queryKey: ["/api/service-center"],
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
          <p className="text-sm text-muted-foreground">
            Renew or amend approved applications without starting from scratch.
          </p>
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
                    disabled
                    className="rounded-full border border-rose-200 bg-rose-50 text-rose-600"
                  >
                    Cancel Certificate
                  </Button>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Under Development (Testing Stage)
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    disabled={!application.canAddRooms || actionDisabled}
                    className="rounded-full border-slate-200"
                  >
                    Add Rooms
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!application.canDeleteRooms || actionDisabled}
                    className="rounded-full border-slate-200"
                  >
                    Delete Rooms
                  </Button>
                </div>

                <GuardRail />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
