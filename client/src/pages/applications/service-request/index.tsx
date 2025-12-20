import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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

export default function ServiceRequestHandler() {
    const [location, setLocation] = useLocation();
    const { toast } = useToast();
    const initialized = useRef(false);

    const [conflictDetails, setConflictDetails] = useState<{ id: string; kind: string; status: string } | null>(null);

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/applications/draft", data);
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Request Initiated",
                description: data.message,
            });
            setLocation(`/applications/new?draft=${data.application.id}`);
        },
        onError: (error: any) => {
            // Attempt to parse "409: { ... }" error format from apiRequest
            let status = error.status;
            let existingId = error.existingApplicationId;
            let conflictData: any = {};

            if (!status && error.message && error.message.startsWith("409:")) {
                try {
                    const jsonPart = error.message.substring(4).trim();
                    conflictData = JSON.parse(jsonPart);
                    status = 409;
                    existingId = conflictData.existingApplicationId;
                } catch (e) {
                    console.error("Failed to parse 409 error json", e);
                }
            } else if (status === 409) {
                conflictData = error;
            }

            // If it's a 409 conflict with an existing draft ID
            if (status === 409 && existingId) {
                // Determine kind from message or data if possible, default to "Existing Application"
                // The API message usually says "You already have a pending service request (add rooms)..."
                setConflictDetails({
                    id: existingId,
                    kind: conflictData.kind || "Application",
                    status: conflictData.status || "draft",
                });
                return;
            }

            toast({
                title: "Request Failed",
                description: error.message || "Could not start service request",
                variant: "destructive",
            });
            // Redirect back to dashboard on error
            setTimeout(() => setLocation("/dashboard"), 1500);
        },
    });

    const discardDraftMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/applications/${id}`);
        },
        onSuccess: () => {
            toast({
                title: "Draft Discarded",
                description: "Previous draft removed. Creating new request...",
            });
            setConflictDetails(null);
            // Retry original creation
            const searchParams = new URLSearchParams(window.location.search);
            const type = searchParams.get("type");
            const parentId = searchParams.get("parentId");
            if (type && parentId) {
                createMutation.mutate({
                    applicationKind: type,
                    parentApplicationId: parentId,
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: "Cleanup Failed",
                description: "Could not discard previous draft. Please try manually.",
                variant: "destructive",
            });
        },
    });

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // Parse query params manually since useSearch might be tricky with hash routers or inconsistent
        const searchParams = new URLSearchParams(window.location.search);
        const type = searchParams.get("type");
        const parentId = searchParams.get("parentId");

        if (!type || !parentId) {
            toast({
                title: "Invalid Request",
                description: "Missing required parameters.",
                variant: "destructive",
            });
            setLocation("/dashboard");
            return;
        }

        createMutation.mutate({
            applicationKind: type,
            parentApplicationId: parentId,
        });
    }, [location, setLocation, toast, createMutation]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Initiating Service Request...</h2>
            <p className="text-muted-foreground mt-2">Please wait while we prepare your application.</p>

            <AlertDialog open={!!conflictDetails} onOpenChange={(open) => !open && setConflictDetails(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Conflicting Draft Found</AlertDialogTitle>
                        <AlertDialogDescription>
                            You already have a pending application draft. The system only allows one active draft at a time.
                            <br /><br />
                            Would you like to <strong>Resume</strong> your existing draft or <strong>Discard</strong> it to start this new one?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            if (conflictDetails?.id) {
                                setLocation(`/applications/new?draft=${conflictDetails.id}`);
                            } else {
                                setLocation("/dashboard");
                            }
                        }}>
                            Resume Draft
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                if (conflictDetails?.id) {
                                    discardDraftMutation.mutate(conflictDetails.id);
                                }
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {discardDraftMutation.isPending ? "Discarding..." : "Discard & Continue"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
