import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { Link } from "wouter";
import type { HomestayApplication } from "@shared/schema";

interface LegacyApplicationRow {
  application: HomestayApplication;
  owner: {
    id: string;
    fullName: string | null;
    mobile: string | null;
    email: string | null;
    district: string | null;
  };
}

const formatDate = (value?: Date | string | null) => {
  if (!value) return "–";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "–";
  }
  return dateValue.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function AdminRcApplications() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery<{ applications: LegacyApplicationRow[] }>({
    queryKey: ["/api/admin-rc/applications"],
  });

  const applications = data?.applications ?? [];
  const totalCount = applications.length;

  const statusCounts = useMemo(() => {
    return applications.reduce<Record<string, number>>((acc, row) => {
      const status = row.application.status ?? "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [applications]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Legacy RC Applications</h1>
          <p className="text-muted-foreground">
            Dedicated queue for historical certificate holders seeded with dummy login numbers. These entries bypass DA/DTDO workflow
            and are editable only from this console.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Queue Overview</CardTitle>
          <CardDescription>
            {totalCount ? `${totalCount} application${totalCount === 1 ? "" : "s"} awaiting Admin RC action` : "No pending legacy applications"}
          </CardDescription>
          {totalCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant="secondary" className="capitalize">
                  {status.replaceAll("_", " ")} • {count}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load legacy applications. Please try again.
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              No legacy RC applications are in the queue right now.
            </div>
          ) : (
            <>
            <div className="overflow-x-auto hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Application</TableHead>
                    <TableHead className="min-w-[160px]">Owner</TableHead>
                    <TableHead className="min-w-[200px]">Property</TableHead>
                    <TableHead className="min-w-[120px]">Category</TableHead>
                    <TableHead className="min-w-[130px]">Submitted</TableHead>
                    <TableHead className="min-w-[120px] text-right">Status</TableHead>
                    <TableHead className="min-w-[110px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map(({ application, owner }) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="font-medium">{application.applicationNumber ?? "Draft"}</div>
                        <div className="text-xs text-muted-foreground">{application.district ?? "District TBD"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{owner.fullName ?? "Unnamed Owner"}</div>
                        <div className="text-xs text-muted-foreground">{owner.mobile ?? "–"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{application.propertyName}</div>
                        <div className="text-xs text-muted-foreground">{application.tehsil || application.block || application.address}</div>
                      </TableCell>
                      <TableCell className="capitalize">
                        <Badge variant="outline">{application.category ?? "–"}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(application.submittedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="capitalize" variant="secondary">
                          {(application.status ?? "unknown").replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/rc-applications/${application.id}`}>Edit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-4">
              {applications.map(({ application, owner }) => (
                <div key={application.id} className="rounded-lg border p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{application.applicationNumber ?? "Draft"}</p>
                      <p className="text-xs text-muted-foreground">{application.district ?? "District TBD"}</p>
                    </div>
                    <Badge variant="outline">{application.category ?? "—"}</Badge>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{application.propertyName}</p>
                    <p className="text-muted-foreground">
                      {owner.fullName ?? "Unnamed Owner"} · {owner.mobile ?? "–"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDate(application.submittedAt)}
                  </p>
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <Link href={`/admin/rc-applications/${application.id}`}>Edit Application</Link>
                  </Button>
                </div>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
