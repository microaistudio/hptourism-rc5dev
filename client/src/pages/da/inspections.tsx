import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, MapPin, User, ClipboardCheck, Clock, AlertCircle, CheckCircle, BellRing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type InspectionOrder = {
  id: string;
  applicationId: string;
  inspectionDate: string;
  inspectionAddress: string;
  specialInstructions?: string;
  status: string;
  application: {
    id: string;
    applicationNumber: string;
    propertyName: string;
    category: string;
    status: string;
    dtdoRemarks?: string | null;
  } | null;
  owner: {
    fullName: string;
    mobile: string;
  } | null;
  reportSubmitted: boolean;
};

export default function DAInspections() {
  const [, setLocation] = useLocation();

  const { data: inspections, isLoading } = useQuery<InspectionOrder[]>({
    queryKey: ['/api/da/inspections'],
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed' | 'new'>('all');
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const getStatusBadge = (status: string, reportSubmitted: boolean) => {
    if (reportSubmitted) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Report Submitted
        </Badge>
      );
    }

    switch (status) {
      case 'scheduled':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/20">
            <Clock className="w-3 h-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'acknowledged':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Owner Acknowledged
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950/20">
            <ClipboardCheck className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colorMap: Record<string, string> = {
      diamond: "bg-purple-50 text-purple-700 dark:bg-purple-950/20",
      gold: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20",
      silver: "bg-gray-50 text-gray-700 dark:bg-gray-950/20",
    };
    return (
      <Badge variant="outline" className={colorMap[category.toLowerCase()] || ""}>
        {category.toUpperCase()}
      </Badge>
    );
  };

  const pendingInspections = inspections?.filter(i => !i.reportSubmitted) || [];
  const completedInspections = inspections?.filter(i => i.reportSubmitted) || [];
  const newInspections = pendingInspections.filter(
    (inspection) => inspection.status && inspection.status.toLowerCase() === 'scheduled'
  );
  const newInspectionIds = useMemo(() => new Set(newInspections.map((inspection) => inspection.id)), [newInspections]);
  const filteredInspections = useMemo(() => {
    if (!inspections) return [];
    switch (activeFilter) {
      case 'pending':
        return pendingInspections;
      case 'completed':
        return completedInspections;
      case 'new':
        return inspections.filter((inspection) => newInspectionIds.has(inspection.id));
      case 'all':
      default:
        return inspections;
    }
  }, [inspections, activeFilter, pendingInspections, completedInspections, newInspectionIds]);
  const sortedInspections = useMemo(() => {
    if (!filteredInspections) return [];
    const getTimestamp = (inspection: InspectionOrder) => {
      if (!inspection.inspectionDate) return 0;
      const date = new Date(inspection.inspectionDate);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };
    return [...filteredInspections].sort((a, b) => {
      const diff = getTimestamp(a) - getTimestamp(b);
      return sortOrder === "newest" ? -diff : diff;
    });
  }, [filteredInspections, sortOrder]);
  const newInspectionCount = newInspections.length;
  const totalInspections = inspections?.length ?? 0;
  const hasNewInspections = newInspectionCount > 0;
  const filterLabels: Record<typeof activeFilter, string> = {
    all: "All assignments",
    pending: "Pending inspections",
    completed: "Completed reports",
    new: "New assignments",
  };
  const activeFilterLabel = filterLabels[activeFilter];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Property Inspections</h1>
        <p className="text-muted-foreground mt-2">
          Field inspections assigned by DTDO
        </p>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border shadow-sm transition-colors ${
          hasNewInspections ? "border-amber-200 bg-amber-50" : "border-border bg-muted/20"
        }`}
        data-testid="bubble-new-inspections"
      >
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`rounded-full p-3 ${hasNewInspections ? "bg-amber-500/10 text-amber-600" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                <BellRing className="h-5 w-5" />
              </div>
              {hasNewInspections && (
                <span className="absolute -top-1 -right-1 rounded-full bg-amber-500 px-2 text-xs font-semibold text-white shadow animate-bounce">
                  {newInspectionCount}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-200">New inspections scheduled</p>
              <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
                {hasNewInspections
                  ? `DTDO sent back ${newInspectionCount} ${newInspectionCount === 1 ? 'application' : 'applications'} for field inspection.`
                  : "You're all caught up. DTDO hasn't assigned any new inspections."}
              </p>
            </div>
          </div>
          <Badge className={`px-3 py-1 text-sm ${hasNewInspections ? "bg-amber-600 text-white animate-pulse" : "bg-muted-foreground/20 text-muted-foreground"}`}>
            {newInspectionCount} New
          </Badge>
        </div>
        {hasNewInspections && (
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-200 opacity-60 blur-3xl" />
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          role="button"
          tabIndex={0}
          aria-pressed={activeFilter === 'new'}
          onClick={() => setActiveFilter('new')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActiveFilter('new');
            }
          }}
          className={`cursor-pointer transition-all hover-elevate active-elevate-2 border-2 ${
            hasNewInspections ? "border-amber-300 bg-amber-50" : "border-border bg-card"
          } ${activeFilter === 'new' ? "ring-2 ring-amber-500" : ""}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BellRing className={hasNewInspections ? "h-4 w-4 text-amber-600" : "h-4 w-4 text-muted-foreground"} />
              New Assignments
            </CardTitle>
            {hasNewInspections && (
              <Badge className="bg-amber-600 text-white text-[10px] uppercase tracking-wide">
                attention
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {newInspectionCount}
              {hasNewInspections && (
                <span className="rounded-full bg-amber-500 px-2 text-xs font-semibold text-white animate-pulse">
                  new
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting field inspection</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          aria-pressed={activeFilter === 'pending'}
          onClick={() => setActiveFilter('pending')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActiveFilter('pending');
            }
          }}
          className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
            activeFilter === 'pending' ? "ring-2 ring-primary" : ""
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Inspections</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInspections.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting site visit</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          aria-pressed={activeFilter === 'completed'}
          onClick={() => setActiveFilter('completed')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActiveFilter('completed');
            }
          }}
          className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
            activeFilter === 'completed' ? "ring-2 ring-primary" : ""
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedInspections.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Reports submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Inspection List */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Assigned Inspections</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
              <span>Click on an inspection to view details and submit report.</span>
              <Badge variant="outline" className="uppercase tracking-wide">{activeFilterLabel}</Badge>
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {activeFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveFilter("all")}
                data-testid="button-show-all-inspections"
              >
                Show all ({totalInspections})
              </Button>
            )}
            {sortedInspections.length > 0 && (
              <>
                <span className="text-muted-foreground">Sort:</span>
                <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
                  <SelectTrigger className="w-[160px]" data-testid="select-inspection-sort-order">
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : inspections && inspections.length > 0 ? (
            sortedInspections.length > 0 ? (
              <div className="space-y-4">
                {sortedInspections.map((inspection) => (
                  <Card
                    key={inspection.id}
                    className="cursor-pointer transition-all hover-elevate active-elevate-2"
                    onClick={() => setLocation(`/da/inspections/${inspection.id}`)}
                    data-testid={`card-inspection-${inspection.id}`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">
                                {inspection.application?.propertyName || 'Property Name Unavailable'}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  {inspection.application?.applicationNumber || 'N/A'}
                                </span>
                                {inspection.application?.category && getCategoryBadge(inspection.application.category)}
                                {getStatusBadge(inspection.status, inspection.reportSubmitted)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Scheduled:</span>
                              <span className="font-medium">
                                {format(new Date(inspection.inspectionDate), 'PPP')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Owner:</span>
                              <span className="font-medium">
                                {inspection.owner?.fullName || 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-start gap-2 md:col-span-2">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <span className="text-muted-foreground">Address: </span>
                                <span className="font-medium">{inspection.inspectionAddress}</span>
                              </div>
                            </div>

                            {inspection.application?.dtdoRemarks && (
                              <div className="flex items-start gap-2 md:col-span-2">
                                <ClipboardCheck className="w-4 h-4 text-sky-600 mt-0.5" />
                                <div>
                                  <span className="text-sky-700 font-medium">DTDO Instructions:</span>{" "}
                                  <span>{inspection.application.dtdoRemarks}</span>
                                </div>
                              </div>
                            )}

                            {inspection.specialInstructions && (
                              <div className="flex items-start gap-2 md:col-span-2">
                                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                                <div>
                                  <span className="text-orange-600 font-medium">Owner Message: </span>
                                  <span>{inspection.specialInstructions}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Button
                            variant={inspection.reportSubmitted ? "outline" : "default"}
                            data-testid={`button-view-inspection-${inspection.id}`}
                          >
                            {inspection.reportSubmitted ? 'View Report' : 'Submit Report'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No inspections match this filter</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Try switching filters or select All to see every assignment.
                </p>
                <Button className="mt-4" variant="outline" onClick={() => setActiveFilter('all')}>
                  Clear Filter
                </Button>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No inspections assigned</h3>
              <p className="text-sm text-muted-foreground mt-2">
                You don't have any pending property inspections at the moment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
