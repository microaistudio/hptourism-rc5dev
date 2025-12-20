import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Home, Building2, Building, Plane, Mountain, Bus,
    UtensilsCrossed, Snowflake, ArrowRight, LogOut
} from "lucide-react";
import type { User } from "@shared/schema";

// Service definitions from policy document
const SERVICES = [
    {
        id: "homestay",
        name: "Homestays",
        description: "Register your B&B property",
        icon: Home,
        color: "from-emerald-500 to-emerald-600",
        status: "active" as const,
        route: "/dashboard",
        applications: "16,973",
    },
    {
        id: "hotels",
        name: "Hotels",
        description: "Hotel registration",
        icon: Building2,
        color: "from-slate-500 to-slate-600",
        status: "development" as const,
        route: null,
        applications: "3,247",
    },
    {
        id: "guest_houses",
        name: "Guest Houses",
        description: "Commercial guest properties",
        icon: Building,
        color: "from-indigo-500 to-indigo-600",
        status: "development" as const,
        route: null,
        applications: "2,156",
    },
    {
        id: "travel_agencies",
        name: "Travel Agencies",
        description: "Tour operators",
        icon: Plane,
        color: "from-purple-500 to-purple-600",
        status: "development" as const,
        route: null,
        applications: "1,834",
    },
    {
        id: "adventure_tourism",
        name: "Adventure Tourism",
        description: "Water sports, rafting, paragliding",
        icon: Mountain,
        color: "from-cyan-500 to-cyan-600",
        status: "active" as const,
        route: "/dashboard",
        applications: "892",
    },
    {
        id: "transport",
        name: "Transport Operators",
        description: "Tourist transport services",
        icon: Bus,
        color: "from-orange-500 to-orange-600",
        status: "development" as const,
        route: null,
        applications: "567",
    },
    {
        id: "restaurants",
        name: "Restaurants & Cafes",
        description: "Food establishments",
        icon: UtensilsCrossed,
        color: "from-red-500 to-red-600",
        status: "development" as const,
        route: null,
        applications: "1,023",
    },
    {
        id: "winter_sports",
        name: "Skiing & Winter Sports",
        description: "Winter activity operators",
        icon: Snowflake,
        color: "from-sky-400 to-sky-500",
        status: "development" as const,
        route: null,
        applications: "234",
    },
];

const StatusBadge = ({ status }: { status: "active" | "new" | "development" }) => {
    switch (status) {
        case "active":
            return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
        case "new":
            return <Badge className="bg-blue-500 hover:bg-blue-600">New</Badge>;
        case "development":
            return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200">Under Development</Badge>;
    }
};

export default function ServiceSelection() {
    const [, setLocation] = useLocation();

    const { data: userData, isLoading } = useQuery<{ user: User }>({
        queryKey: ["/api/auth/me"],
        retry: false,
    });

    // Fetch public settings for service visibility
    const { data: settingsData } = useQuery<{
        serviceVisibility: Record<string, boolean>;
        inspectionConfig: { optionalKinds: string[] };
    }>({
        queryKey: ["/api/settings/public"],
    });

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !userData?.user) {
            setLocation("/login");
        }
    }, [isLoading, userData, setLocation]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
                <div className="max-w-6xl mx-auto">
                    <Skeleton className="h-12 w-64 mb-8" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-48 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const user = userData?.user;

    const handleServiceClick = (service: typeof SERVICES[0]) => {
        if (service.route) {
            setLocation(service.route);
        }
    };

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setLocation("/login");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">HP</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">HP Tourism</h1>
                            <p className="text-xs text-muted-foreground">eServices Portal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground hidden sm:block">
                            {user?.fullName}
                        </span>
                        <Button variant="outline" size="sm" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Welcome back, {user?.fullName?.split(' ')[0]}!
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Select a service to continue
                    </p>
                </div>

                {/* Service Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {SERVICES.filter(service => {
                        // Always show Homestay
                        if (service.id === 'homestay') return true;

                        // Check visibility setting if available
                        if (settingsData?.serviceVisibility) {
                            return settingsData.serviceVisibility[service.id as keyof typeof settingsData.serviceVisibility];
                        }

                        // Fallback: Show only Homestay and Adventure Tourism by default if no settings
                        if (service.id === 'adventure_tourism') return true;

                        return false;
                    }).map((service) => {
                        const Icon = service.icon;
                        const isClickable = service.status !== "development";

                        return (
                            <Card
                                key={service.id}
                                className={`relative overflow-hidden transition-all duration-300 ${isClickable
                                    ? "cursor-pointer hover:shadow-lg hover:-translate-y-1"
                                    : "opacity-75 cursor-not-allowed"
                                    }`}
                                onClick={() => isClickable && handleServiceClick(service)}
                            >
                                {/* Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-10`} />

                                <CardHeader className="relative pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center shadow-lg`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <StatusBadge status={service.status} />
                                    </div>
                                    <CardTitle className="text-lg mt-4">{service.name}</CardTitle>
                                    <CardDescription>{service.description}</CardDescription>
                                </CardHeader>

                                <CardContent className="relative pt-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {service.applications} applications
                                        </span>
                                        {isClickable && (
                                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Footer Info */}
                <div className="text-center mt-12 text-sm text-muted-foreground">
                    <p>Services marked "Under Development" will be available soon.</p>
                    <p className="mt-1">For assistance, contact the HP Tourism Department.</p>
                </div>
            </main>
        </div>
    );
}
