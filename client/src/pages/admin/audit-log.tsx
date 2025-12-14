import { useState, useMemo } from "react";
import { format } from "date-fns";
import type { HomestayApplication } from "@shared/schema";
import { ACTION_META, formatActorLabel, formatStatusLabel, type TimelineEntry } from "@/components/application/application-timeline-card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ApplicationTimelineCard } from "@/components/application/application-timeline-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type SearchResponse = {
  results: HomestayApplication[];
};

type TimelineResponse = {
  timeline: TimelineEntry[];
};

const csvEscape = (value: string) => {
  const sanitized = value.replace(/"/g, '""');
  return `"${sanitized}"`;
};

export default function AdminAuditLog() {
  const { toast } = useToast();
  const [applicationNumber, setApplicationNumber] = useState("");
  const [ownerMobile, setOwnerMobile] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HomestayApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<HomestayApplication | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isTimelineLoading, setTimelineLoading] = useState(false);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!applicationNumber.trim() && !ownerMobile.trim()) {
      toast({
        title: "Add a search filter",
        description: "Enter an application number or owner mobile number.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSearching(true);
      setSearchResults([]);
      setSelectedApp(null);
      setTimeline([]);
      const res = await apiRequest("POST", "/api/applications/search", {
        applicationNumber: applicationNumber.trim() || undefined,
        ownerMobile: ownerMobile.trim() || undefined,
      });
      const data: SearchResponse = await res.json();
      if (!data.results || data.results.length === 0) {
        toast({
          title: "No matches found",
          description: "Verify the application number and try again.",
          variant: "destructive",
        });
        return;
      }
      setSearchResults(data.results);
      selectApplication(data.results[0]);
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Unable to search applications",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const selectApplication = async (application: HomestayApplication) => {
    setSelectedApp(application);
    setTimeline([]);
    try {
      setTimelineLoading(true);
      const res = await apiRequest("GET", `/api/applications/${application.id}/timeline`);
      const data: TimelineResponse = await res.json();
      setTimeline(data.timeline ?? []);
    } catch (error) {
      toast({
        title: "Timeline unavailable",
        description: error instanceof Error ? error.message : "Unable to load audit history",
        variant: "destructive",
      });
    } finally {
      setTimelineLoading(false);
    }
  };

  const exportCsv = () => {
    if (!timeline.length || !selectedApp) {
      return;
    }
    const header = ["Timestamp", "Action", "Actor", "Previous Status", "New Status", "Remarks"];
    const rows = timeline.map((entry) => {
      const timestamp = entry.createdAt ? format(new Date(entry.createdAt), "yyyy-MM-dd HH:mm:ss") : "";
      const actionLabel = ACTION_META[entry.action]?.label ?? entry.action;
      const actorLabel = formatActorLabel(entry.actor);
      const prevStatus = formatStatusLabel(entry.previousStatus) ?? "";
      const newStatus = formatStatusLabel(entry.newStatus) ?? "";
      const remarks = entry.feedback ?? "";
      return [timestamp, actionLabel, actorLabel, prevStatus, newStatus, remarks];
    });

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedApp.applicationNumber ?? selectedApp.id}-audit-trail.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!timeline.length || !selectedApp) {
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(12);
    doc.text(
      `Audit Trail - ${selectedApp.applicationNumber ?? selectedApp.propertyName}`,
      14,
      16,
    );
    const rows = timeline.map((entry) => [
      entry.createdAt ? format(new Date(entry.createdAt), "PPpp") : "",
      ACTION_META[entry.action]?.label ?? entry.action,
      formatActorLabel(entry.actor),
      formatStatusLabel(entry.previousStatus) ?? "",
      formatStatusLabel(entry.newStatus) ?? "",
      entry.feedback ?? "",
    ]);
    autoTable(doc, {
      head: [["Timestamp", "Action", "Actor", "Previous", "New", "Remarks"]],
      body: rows,
      startY: 24,
      styles: { fontSize: 8, cellWidth: "wrap" },
      headStyles: { fillColor: [22, 101, 153] },
    });
    doc.save(`${selectedApp.applicationNumber ?? selectedApp.id}-audit-trail.pdf`);
  };

  const timelineTable = useMemo(() => {
    if (isTimelineLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      );
    }

    if (!timeline.length) {
      return (
        <p className="text-sm text-muted-foreground">
          {selectedApp
            ? "No audit entries recorded yet for this application."
            : "Search for an application to view its audit trail."}
        </p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Previous Status</TableHead>
              <TableHead>New Status</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeline.map((entry) => {
              const meta = ACTION_META[entry.action];
              const timestamp = entry.createdAt ? format(new Date(entry.createdAt), "PPp") : "";
              const previous = formatStatusLabel(entry.previousStatus);
              const next = formatStatusLabel(entry.newStatus);
              return (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">{timestamp}</TableCell>
                  <TableCell className="space-y-1">
                    <div className="font-medium">{meta?.label ?? entry.action}</div>
                    <p className="text-xs text-muted-foreground">
                      {meta?.description ?? "Workflow update"}
                    </p>
                  </TableCell>
                  <TableCell>{formatActorLabel(entry.actor)}</TableCell>
                  <TableCell>
                    {previous ? (
                      <Badge variant="outline" className="rounded-full">
                        {previous}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {next ? (
                      <Badge className="rounded-full bg-primary/10 text-primary dark:text-primary-foreground">
                        {next}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-pre-line text-sm text-muted-foreground">
                    {entry.feedback ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }, [timeline, isTimelineLoading, selectedApp]);

  return (
    <div className="container mx-auto max-w-6xl py-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail Explorer</h1>
          <p className="text-muted-foreground">
            Search any application and review every action recorded in the workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!timeline.length}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportPdf} disabled={!timeline.length} className="gap-2">
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lookup Application</CardTitle>
          <CardDescription>Enter an application number to retrieve its audit history.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSearch}
            className="grid gap-3 md:grid-cols-[2fr,2fr,auto] md:items-center"
          >
            <Input
              value={applicationNumber}
              onChange={(event) => setApplicationNumber(event.target.value)}
              placeholder="Application #"
            />
            <Input
              value={ownerMobile}
              onChange={(event) => setOwnerMobile(event.target.value)}
              placeholder="Owner mobile"
            />
            <Button type="submit" disabled={isSearching} className="gap-2">
              <Search className="h-4 w-4" />
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Provide an application number or mobile to locate audit records quickly. Use the officer search
            page for additional filters such as Aadhaar or date range.
          </p>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>Select an application to view detailed audit records.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application #</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((app) => (
                  <TableRow key={app.id} className="align-middle">
                    <TableCell>
                      <div className="font-semibold">{app.applicationNumber || "—"}</div>
                      <p className="text-xs text-muted-foreground">{app.propertyName}</p>
                    </TableCell>
                    <TableCell>
                      <div>{app.ownerName}</div>
                      <p className="text-xs text-muted-foreground">{app.ownerMobile}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full">
                        {formatStatusLabel(app.status) ?? app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {app.submittedAt ? format(new Date(app.submittedAt), "PP") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={selectedApp?.id === app.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => selectApplication(app)}
                      >
                        {selectedApp?.id === app.id ? "Viewing" : "Open"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detailed Audit Trail</CardTitle>
          <CardDescription>
            {selectedApp
              ? `Every recorded action for ${selectedApp.applicationNumber || selectedApp.propertyName}`
              : "Search and select an application to view its complete audit history."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {timelineTable}
          {selectedApp && (
            <ApplicationTimelineCard
              applicationId={selectedApp.id}
              title="Visual Timeline"
              description="Chronological view of the same audit data."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
