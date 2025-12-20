import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LayoutGrid, ClipboardCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PortalSettings {
    visibility: Record<string, boolean>;
    inspection: {
        optionalKinds: string[];
    };
}

const SERVICE_LABELS: Record<string, string> = {
    homestay: "Homestays",
    hotels: "Hotels",
    guest_houses: "Guest Houses",
    travel_agencies: "Travel Agencies",
    adventure_tourism: "Adventure Tourism",
    transport: "Transport Operators",
    restaurants: "Restaurants & Cafes",
    winter_sports: "Skiing & Winter Sports",
};

const APPLICATION_KINDS = [
    { id: "new_registration", label: "New Registration", defaultOptional: false },
    { id: "existing_rc_onboarding", label: "Existing RC Onboarding", defaultOptional: false },
    { id: "add_rooms", label: "Add Additional Rooms", defaultOptional: false },
    { id: "delete_rooms", label: "Delete Rooms", defaultOptional: true },
    { id: "change_category", label: "Change Category", defaultOptional: false },
    { id: "cancel_certificate", label: "Surrender Certificate", defaultOptional: true },
];

export function PortalConfigCard() {
    const { toast } = useToast();

    const { data: settings, isLoading } = useQuery<PortalSettings>({
        queryKey: ["/api/admin/settings/portal/services"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/admin/settings/portal/services");
            return res.json();
        }
    });

    const toggleServiceMutation = useMutation({
        mutationFn: async ({ serviceId, enabled }: { serviceId: string; enabled: boolean }) => {
            const res = await apiRequest("POST", "/api/admin/settings/portal/services/toggle", {
                serviceId,
                enabled
            });
            return res.json();
        },
        onSuccess: (data, variables) => {
            queryClient.setQueryData(["/api/admin/settings/portal/services"], (old: PortalSettings | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    visibility: { ...old.visibility, [variables.serviceId]: variables.enabled }
                };
            });
            toast({ title: "Service visibility updated" });
        },
        onError: () => toast({ title: "Failed to update setting", variant: "destructive" })
    });

    const toggleInspectionMutation = useMutation({
        mutationFn: async ({ applicationKind, optional }: { applicationKind: string; optional: boolean }) => {
            const res = await apiRequest("POST", "/api/admin/settings/inspection/toggle", {
                applicationKind,
                optional
            });
            return res.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/portal/services"] });
            toast({ title: "Inspection workflow updated" });
        },
        onError: () => toast({ title: "Failed to update setting", variant: "destructive" })
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Portal Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>
                </CardContent>
            </Card>
        );
    }

    const visibility = settings?.visibility || {};
    const optionalKinds = new Set(settings?.inspection.optionalKinds || []);

    return (
        <Card id="portal-config">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5" />
                    Portal Configuration
                </CardTitle>
                <CardDescription>
                    Manage service visibility and workflow requirements
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

                {/* Service Visibility Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        Service Visibility
                        <Badge variant="outline">Portal</Badge>
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                            <div key={key} className="flex items-center justify-between space-x-2 border p-3 rounded-lg bg-card/50">
                                <Label htmlFor={`service-${key}`} className="flex flex-col space-y-1">
                                    <span className="font-medium">{label}</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {key === 'homestay' ? 'Core service (Required)' : 'Additional service'}
                                    </span>
                                </Label>
                                <Switch
                                    id={`service-${key}`}
                                    checked={key === 'homestay' ? true : !!visibility[key]}
                                    disabled={key === 'homestay' || toggleServiceMutation.isPending}
                                    onCheckedChange={(checked) => toggleServiceMutation.mutate({ serviceId: key, enabled: checked })}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inspection Configuration Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Inspection Requirements
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Workflows marked as "Optional" allow DTDOs to approve applications without scheduling a physical inspection.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                        {APPLICATION_KINDS.map((kind) => {
                            const isOptional = optionalKinds.has(kind.id);
                            return (
                                <div key={kind.id} className="flex items-center justify-between space-x-2 border p-3 rounded-lg bg-card/50">
                                    <Label htmlFor={`inspection-${kind.id}`} className="flex flex-col space-y-1">
                                        <span className="font-medium">{kind.label}</span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${isOptional ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                            {isOptional ? 'Optional' : 'Mandatory'}
                                        </span>
                                        <Switch
                                            id={`inspection-${kind.id}`}
                                            checked={isOptional}
                                            disabled={toggleInspectionMutation.isPending}
                                            onCheckedChange={(checked) => toggleInspectionMutation.mutate({ applicationKind: kind.id, optional: checked })}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
