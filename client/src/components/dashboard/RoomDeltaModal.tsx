import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Minus, AlertCircle } from "lucide-react";
import { MAX_ROOMS_ALLOWED } from "@shared/fee-calculator";

type RoomBreakdown = {
    single: number;
    double: number;
    family: number;
};

type RoomDeltaModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "add_rooms" | "delete_rooms";
    parentApplicationId: string;
    currentRooms: RoomBreakdown;
    onSuccess: (nextUrl: string) => void;
};

const MIN_ROOMS_AFTER_DELETE = 1;

export function RoomDeltaModal({
    open,
    onOpenChange,
    mode,
    parentApplicationId,
    currentRooms,
    onSuccess,
}: RoomDeltaModalProps) {
    const { toast } = useToast();
    const [delta, setDelta] = useState<RoomBreakdown>({ single: 0, double: 0, family: 0 });

    // Reset delta when modal opens
    useEffect(() => {
        if (open) {
            setDelta({ single: 0, double: 0, family: 0 });
        }
    }, [open]);

    const currentTotal = currentRooms.single + currentRooms.double + currentRooms.family;
    const deltaTotal = delta.single + delta.double + delta.family;

    const targetTotal = mode === "add_rooms"
        ? currentTotal + deltaTotal
        : currentTotal - deltaTotal;

    const isAddMode = mode === "add_rooms";
    const modeLabel = isAddMode ? "Add" : "Delete";
    const modeDescription = isAddMode
        ? "Specify how many rooms you want to add to your approved inventory."
        : "Specify how many rooms you want to remove from your approved inventory.";

    // Validation
    let validationError: string | null = null;
    if (deltaTotal === 0) {
        validationError = `Please specify at least one room to ${modeLabel.toLowerCase()}.`;
    } else if (isAddMode && targetTotal > MAX_ROOMS_ALLOWED) {
        validationError = `HP Homestay Rules permit a maximum of ${MAX_ROOMS_ALLOWED} rooms. This would result in ${targetTotal} rooms.`;
    } else if (!isAddMode) {
        if (delta.single > currentRooms.single || delta.double > currentRooms.double || delta.family > currentRooms.family) {
            validationError = "Cannot delete more rooms than currently exist in that category.";
        } else if (targetTotal < MIN_ROOMS_AFTER_DELETE) {
            validationError = `At least ${MIN_ROOMS_AFTER_DELETE} room must remain after deletion.`;
        }
    }

    const createServiceRequest = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/service-center", {
                baseApplicationId: parentApplicationId,
                serviceType: mode,
                roomDelta: delta,
            });
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Service Request Created",
                description: `Your ${modeLabel.toLowerCase()} rooms request has been initiated.`,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/service-center"] });
            onOpenChange(false);
            if (data.nextUrl) {
                onSuccess(data.nextUrl);
            }
        },
        onError: (error: any) => {
            toast({
                title: "Request Failed",
                description: error.message || "Could not create service request",
                variant: "destructive",
            });
        },
    });

    const handleDeltaChange = (roomType: keyof RoomBreakdown, value: number) => {
        const clampedValue = Math.max(0, Math.floor(value));
        setDelta((prev) => ({ ...prev, [roomType]: clampedValue }));
    };

    const handleSubmit = () => {
        if (validationError) return;
        createServiceRequest.mutate();
    };

    const renderRoomRow = (
        label: string,
        roomType: keyof RoomBreakdown,
        current: number,
    ) => {
        const maxDelta = isAddMode
            ? MAX_ROOMS_ALLOWED - currentTotal
            : current;

        return (
            <div key={roomType} className="flex items-center justify-between gap-4 py-2">
                <div className="flex-1">
                    <Label className="text-sm font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground">Current: {current}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={delta[roomType] <= 0}
                        onClick={() => handleDeltaChange(roomType, delta[roomType] - 1)}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        type="number"
                        min={0}
                        max={maxDelta}
                        value={delta[roomType]}
                        onChange={(e) => handleDeltaChange(roomType, parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={delta[roomType] >= maxDelta}
                        onClick={() => handleDeltaChange(roomType, delta[roomType] + 1)}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{modeLabel} Rooms</DialogTitle>
                    <DialogDescription>{modeDescription}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-lg border p-4 bg-muted/30">
                        <p className="text-sm font-medium mb-2">Current Inventory</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>Single: <span className="font-semibold">{currentRooms.single}</span></div>
                            <div>Double: <span className="font-semibold">{currentRooms.double}</span></div>
                            <div>Family: <span className="font-semibold">{currentRooms.family}</span></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Total: {currentTotal} / {MAX_ROOMS_ALLOWED} rooms
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-medium">
                            Rooms to {modeLabel}
                        </p>
                        {renderRoomRow("Single Bed Rooms", "single", currentRooms.single)}
                        {renderRoomRow("Double Bed Rooms", "double", currentRooms.double)}
                        {renderRoomRow("Family Suites", "family", currentRooms.family)}
                    </div>

                    {deltaTotal > 0 && (
                        <div className="rounded-lg border p-4 bg-primary/5">
                            <p className="text-sm font-medium">
                                {isAddMode ? "After Adding" : "After Deletion"}
                            </p>
                            <p className="text-lg font-semibold text-primary">
                                {targetTotal} rooms total
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {isAddMode ? "+" : "-"}{deltaTotal} rooms {isAddMode ? "added" : "removed"}
                            </p>
                        </div>
                    )}

                    {validationError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{validationError}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!!validationError || createServiceRequest.isPending}
                    >
                        {createServiceRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {modeLabel} {deltaTotal > 0 ? `${deltaTotal} Room${deltaTotal > 1 ? "s" : ""}` : "Rooms"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
