import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { HomestayApplication, User } from "@shared/schema";

type SearchParams = {
  applicationNumber: string;
  ownerMobile: string;
  ownerAadhaar: string;
  month: string;
  year: string;
  fromDate: string;
  toDate: string;
  status: string;
  recentLimit: string;
};

type SearchResponse = {
  results: HomestayApplication[];
};

const initialParams: SearchParams = {
  applicationNumber: "",
  ownerMobile: "",
  ownerAadhaar: "",
  month: "",
  year: "",
  fromDate: "",
  toDate: "",
  status: "all",
  recentLimit: "10",
};

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - index);

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "New (Submitted)" },
  { value: "under_scrutiny", label: "Under Scrutiny" },
  { value: "forwarded_to_dtdo", label: "Forwarded to DTDO" },
  { value: "dtdo_review", label: "DTDO Review" },
  { value: "inspection_scheduled", label: "Inspection Scheduled" },
  { value: "inspection_complete", label: "Inspection Complete" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "approved", label: "Approved" },
  { value: "reverted_by_dtdo", label: "Reverted by DTDO" },
  { value: "objection_raised", label: "DTDO Objection" },
  { value: "reverted_to_applicant", label: "Reverted to Applicant" },
  { value: "rejected", label: "Rejected" },
];

export default function OfficerApplicationSearch() {
  const [params, setParams] = useState<SearchParams>(initialParams);
  const [results, setResults] = useState<HomestayApplication[]>([]);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const searchMutation = useMutation({
    mutationFn: async (payload: SearchParams) => {
      const response = await apiRequest("POST", "/api/applications/search", payload);
      return response.json() as Promise<SearchResponse>;
    },
    onSuccess: (data) => {
      setResults(data.results ?? []);
      toast({
        title: "Search complete",
        description: `${data.results?.length ?? 0} application(s) found.`,
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to search applications right now.";
      toast({
        title: "Search failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const resetFilters = () => {
    setParams(initialParams);
    setResults([]);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const hasStatusFilter = params.status && params.status !== "all";
    const hasMonth = Boolean(params.month);
    const hasYear = Boolean(params.year);
    if ((hasMonth && !hasYear) || (!hasMonth && hasYear)) {
      toast({
        title: "Select month & year",
        description: "Choose both month and year (or clear both) before filtering by month.",
        variant: "destructive",
      });
      return;
    }
    const hasMonthYearFilter = hasMonth && hasYear;
    const parsedRecentLimit = Number(params.recentLimit);
    const hasRecentLimit = Number.isFinite(parsedRecentLimit) && parsedRecentLimit > 0;
    const applyMonthYearFilter = hasMonthYearFilter && !hasRecentLimit;
    const hasOtherFilters = Object.entries(params).some(([key, value]) => {
      if (key === "status" || key === "month" || key === "year" || key === "recentLimit") {
        return false;
      }
      return value.trim().length > 0;
    });

    if (!hasOtherFilters && !hasStatusFilter && !applyMonthYearFilter && !hasRecentLimit) {
      toast({
        title: "Add search filters",
        description: "Provide an application number, owner detail, date range, month + year, or use the quick view option.",
        variant: "destructive",
      });
      return;
    }

    const payload: SearchParams = { ...params };
    if (!applyMonthYearFilter) {
      payload.month = "";
      payload.year = "";
    }
    if (hasRecentLimit) {
      payload.fromDate = "";
      payload.toDate = "";
    }
    if (!hasRecentLimit) {
      payload.recentLimit = "";
    }

    searchMutation.mutate(payload);
  };

  const handleInputChange = (key: keyof SearchParams) => (value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const role = userData?.user?.role ?? "";
  const detailBasePath =
    role === "dealing_assistant" ? "/da/applications/" : "/dtdo/applications/";

  const sortedResults = useMemo(() => {
    if (results.length === 0) return [];
    return [...results].sort((a, b) => {
      const getTimestamp = (item: HomestayApplication) => {
        const candidate = item.updatedAt ?? item.createdAt ?? item.submittedAt;
        return candidate ? new Date(candidate).getTime() : 0;
      };
      const diff = getTimestamp(a) - getTimestamp(b);
      return sortOrder === "newest" ? -diff : diff;
    });
  }, [results, sortOrder]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search Applications</h1>
        <p className="text-muted-foreground mt-1">
          Locate applications using reference numbers, owner details, or submission dates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
          <CardDescription>
            Provide one or more filters. You can narrow results by application number, contact
            details, or submission period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="applicationNumber">Application Number</Label>
                <Input
                  id="applicationNumber"
                  name="applicationNumber"
                  value={params.applicationNumber}
                  onChange={handleValueChange}
                  placeholder="HP-HS-2025-SML-000123"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerMobile">Owner Mobile</Label>
                <Input
                  id="ownerMobile"
                  name="ownerMobile"
                  value={params.ownerMobile}
                  onChange={handleValueChange}
                  placeholder="9876543210"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerAadhaar">Owner Aadhaar</Label>
                <Input
                  id="ownerAadhaar"
                  name="ownerAadhaar"
                  value={params.ownerAadhaar}
                  onChange={handleValueChange}
                  placeholder="12-digit Aadhaar"
                />
              </div>
              <div className="grid gap-2">
                <Label>Month / Year</Label>
                <div className="flex gap-2">
                  <Select
                    value={params.month}
                    onValueChange={handleInputChange("month")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((monthOption) => (
                        <SelectItem key={monthOption.value} value={monthOption.value}>
                          {monthOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={params.year}
                    onValueChange={handleInputChange("year")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((yearValue) => (
                        <SelectItem key={yearValue} value={String(yearValue)}>
                          {yearValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select both month and year, or leave both empty. Providing a custom date range overrides this filter.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={params.status} onValueChange={handleInputChange("status")}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recentLimit">Quick View (Latest Records)</Label>
                <Select value={params.recentLimit} onValueChange={handleInputChange("recentLimit")}>
                  <SelectTrigger id="recentLimit">
                    <SelectValue placeholder="Select count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Off (require filters)</SelectItem>
                    <SelectItem value="10">Latest 10</SelectItem>
                    <SelectItem value="20">Latest 20</SelectItem>
                    <SelectItem value="50">Latest 50</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Fetch the newest entries with no other filters. This overrides the month/year and date range selections.
                </p>
             </div>
           </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  name="fromDate"
                  type="date"
                  value={params.fromDate}
                  onChange={handleValueChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  name="toDate"
                  type="date"
                  value={params.toDate}
                  onChange={handleValueChange}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={searchMutation.isPending}>
                {searchMutation.isPending ? "Searching..." : "Search"}
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <p className="text-xs text-muted-foreground">
                Maximum 200 results returned. Narrow filters for precise matches.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {sortedResults.length === 0
                ? "Run a search to display matching applications."
                : `Showing ${sortedResults.length} result${sortedResults.length === 1 ? "" : "s"}.`}
            </CardDescription>
          </div>
          {sortedResults.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort:</span>
              <Select
                value={sortOrder}
                onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}
              >
                <SelectTrigger className="w-[160px]" data-testid="select-search-sort-order">
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedResults.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application #</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">
                        <Button
                          variant="ghost"
                          className="px-0 font-semibold underline"
                          onClick={() => setLocation(`${detailBasePath}${application.id}`)}
                        >
                          {application.applicationNumber}
                        </Button>
                      </TableCell>
                      <TableCell>{application.propertyName}</TableCell>
                      <TableCell>{application.ownerName}</TableCell>
                      <TableCell>{application.ownerMobile}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{application.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {application.createdAt
                          ? new Date(application.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`${detailBasePath}${application.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No applications to display. Adjust your filters and try again.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
