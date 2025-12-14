import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NavigationHeader } from "@/components/navigation-header";
import {
    Search,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowLeft,
    User,
    Building,
    MapPin,
    Calendar
} from "lucide-react";

type ApplicationStatus =
    | "draft"
    | "submitted"
    | "under_review"
    | "under_scrutiny"
    | "inspection_scheduled"
    | "inspection_completed"
    | "approved"
    | "rejected"
    | "correction_required"
    | "payment_pending"
    | "certificate_issued";

const statusConfig: Record<ApplicationStatus, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: <FileText className="w-4 h-4" /> },
    submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800", icon: <Clock className="w-4 h-4" /> },
    under_review: { label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4" /> },
    under_scrutiny: { label: "Under Scrutiny", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4" /> },
    inspection_scheduled: { label: "Inspection Scheduled", color: "bg-purple-100 text-purple-800", icon: <Calendar className="w-4 h-4" /> },
    inspection_completed: { label: "Inspection Completed", color: "bg-indigo-100 text-indigo-800", icon: <CheckCircle className="w-4 h-4" /> },
    approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: <XCircle className="w-4 h-4" /> },
    correction_required: { label: "Correction Required", color: "bg-orange-100 text-orange-800", icon: <AlertCircle className="w-4 h-4" /> },
    payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-800", icon: <Clock className="w-4 h-4" /> },
    certificate_issued: { label: "Certificate Issued", color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle className="w-4 h-4" /> },
};

export default function TrackApplicationPage() {
    const [, setLocation] = useLocation();
    const searchString = useSearch();
    const params = new URLSearchParams(searchString);

    const initialApp = params.get("app") || "";
    const initialAadhaar = params.get("aadhaar") || "";
    const initialPhone = params.get("phone") || "";

    const [searchValue, setSearchValue] = useState(initialApp || initialAadhaar || initialPhone);
    const [searchType, setSearchType] = useState<"app" | "aadhaar" | "phone">(
        initialApp ? "app" : initialAadhaar ? "aadhaar" : initialPhone ? "phone" : "app"
    );
    const [searchQuery, setSearchQuery] = useState(searchValue);

    const { data: application, isLoading, error } = useQuery({
        queryKey: ["/api/applications/track", searchType, searchQuery],
        queryFn: async () => {
            if (!searchQuery) return null;
            const response = await fetch(`/api/applications/track?${searchType}=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error("Failed to fetch application");
            }
            return response.json();
        },
        enabled: !!searchQuery,
    });

    const handleSearch = () => {
        if (searchValue.trim()) {
            setSearchQuery(searchValue.trim());
        }
    };

    const getStatusInfo = (status: string) => {
        return statusConfig[status as ApplicationStatus] || statusConfig.draft;
    };

    return (
        <div className="min-h-screen bg-background">
            <NavigationHeader
                title="Track Application"
                subtitle="Check your application status"
                showBack={true}
                onBack={() => setLocation("/")}
            />

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Search Card */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Search Application
                        </CardTitle>
                        <CardDescription>
                            Enter your application number, Aadhaar number, or phone number to track status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <select
                                className="px-3 py-2 border rounded-md bg-background"
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value as "app" | "aadhaar" | "phone")}
                            >
                                <option value="app">Application No.</option>
                                <option value="aadhaar">Aadhaar No.</option>
                                <option value="phone">Phone No.</option>
                            </select>
                            <Input
                                placeholder={
                                    searchType === "app" ? "HP-HS-2025-XXX-XXXXXX" :
                                        searchType === "aadhaar" ? "Enter 12-digit Aadhaar" :
                                            "Enter 10-digit phone number"
                                }
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="flex-1"
                            />
                            <Button onClick={handleSearch} disabled={isLoading}>
                                {isLoading ? "Searching..." : "Track"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                {isLoading && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                            <p className="text-muted-foreground">Searching for application...</p>
                        </CardContent>
                    </Card>
                )}

                {error && (
                    <Card className="border-red-200">
                        <CardContent className="py-12 text-center">
                            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                            <p className="text-red-600">Error searching for application. Please try again.</p>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && !error && searchQuery && !application && (
                    <Card className="border-yellow-200">
                        <CardContent className="py-12 text-center">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                            <p className="text-yellow-700 font-medium mb-2">Application Not Found</p>
                            <p className="text-muted-foreground">
                                No application found matching "{searchQuery}". Please check the number and try again.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {application && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <CardTitle className="text-xl">{application.propertyName}</CardTitle>
                                    <CardDescription className="text-base mt-1">
                                        Application: {application.applicationNumber}
                                    </CardDescription>
                                </div>
                                <Badge className={getStatusInfo(application.status).color}>
                                    {getStatusInfo(application.status).icon}
                                    <span className="ml-1">{getStatusInfo(application.status).label}</span>
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Owner Name</p>
                                            <p className="font-medium">{application.ownerName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Building className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Category</p>
                                            <p className="font-medium capitalize">{application.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">District</p>
                                            <p className="font-medium">{application.district}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Submitted On</p>
                                            <p className="font-medium">
                                                {application.submittedAt
                                                    ? new Date(application.submittedAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })
                                                    : 'Not submitted yet'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Rooms</p>
                                            <p className="font-medium">{application.totalRooms} rooms</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {application.status === "correction_required" && application.remarks && (
                                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                    <h4 className="font-medium text-orange-800 mb-2">Correction Required</h4>
                                    <p className="text-orange-700 text-sm">{application.remarks}</p>
                                </div>
                            )}

                            {application.status === "rejected" && application.remarks && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <h4 className="font-medium text-red-800 mb-2">Rejection Reason</h4>
                                    <p className="text-red-700 text-sm">{application.remarks}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Back to Home */}
                <div className="mt-8 text-center">
                    <Button variant="outline" onClick={() => setLocation("/")}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
