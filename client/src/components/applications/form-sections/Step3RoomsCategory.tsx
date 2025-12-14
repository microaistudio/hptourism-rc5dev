import { Dispatch, SetStateAction } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, BedDouble, Check, Info, Plus, Trash2, ShieldCheck, Video, Flame } from "lucide-react";
import {
    CATEGORY_CARD_INFO,
    ROOM_TYPE_OPTIONS,
    TARIFF_BUCKETS,
    CATEGORY_ORDER,
    MAX_ROOMS_ALLOWED,
    MAX_BEDS_ALLOWED,
    MAX_BEDS_PER_ROOM,
    type Type2Row,
    type RoomCalculationMode,
    type ApplicationForm,
    getRowBedsPerRoom,
    summarizeRows,
    sanitizeGstinInput,
    clampInt,
} from "@/lib/application-schema";
import { type CategoryType } from "@shared/fee-calculator";
import { type CategoryRateBands } from "@shared/appSettings";

// Helper functions local to this component or imported
const getCategoryBadge = (cat: string) => {
    switch (cat) {
        case "silver":
            return { label: "Silver", variant: "secondary" as const, color: "bg-slate-200 text-slate-800" };
        case "gold":
            return { label: "Gold", variant: "default" as const, color: "bg-amber-100 text-amber-800 border-amber-200" };
        case "diamond":
            return { label: "Diamond", variant: "outline" as const, color: "bg-cyan-50 text-cyan-900 border-cyan-200" };
        default:
            return { label: cat, variant: "outline" as const, color: "" };
    }
};

const evaluateBandStatus = (rate: number, band: { min: number; max: number | null }) => {
    if (rate < band.min) return "below";
    if (band.max !== null && rate > band.max) return "above";
    return "within";
};

const formatBandLabel = (band: { min: number; max: number | null }) => {
    if (band.max === null) return `Above ₹${band.min}`;
    return `₹${band.min} - ₹${band.max}`;
};

interface Step3RoomsCategoryProps {
    form: UseFormReturn<ApplicationForm>;
    category: CategoryType;
    totalRooms: number;
    totalBeds: number;
    highestTariffLabel: string;
    highestRoomRate: number;
    categoryRateBands: CategoryRateBands;
    roomCalcMode: RoomCalculationMode;
    type2CategoryConflict: boolean;
    categoryWarnings: string[];
    lockToRecommendedCategory: boolean;
    suggestedCategory: CategoryType | null;
    type2Rows: Type2Row[];
    addType2Row: () => void;
    removeType2Row: (id: string) => void;
    updateType2Row: (id: string, updates: Partial<Type2Row>) => void;
    resetType2Rows: () => void;
    syncAttachedBaths: boolean;
    setSyncAttachedBaths: (value: boolean) => void;
    selectedAmenities: Record<string, boolean>;
    setSelectedAmenities: Dispatch<SetStateAction<Record<string, boolean>>>;
    openAreaConverter: (rowId: string) => void;
    resolvedCategory: CategoryType;
    resolvedCategoryBand: { min: number; max: number | null };
    shouldLockCategoryWarning: boolean;
}

export function Step3RoomsCategory({
    form,
    category,
    totalRooms,
    totalBeds,
    highestTariffLabel,
    highestRoomRate,
    categoryRateBands,
    roomCalcMode,
    type2CategoryConflict,
    categoryWarnings,
    lockToRecommendedCategory,
    suggestedCategory,
    type2Rows,
    addType2Row,
    removeType2Row,
    updateType2Row,
    resetType2Rows,
    syncAttachedBaths,
    setSyncAttachedBaths,
    selectedAmenities,
    setSelectedAmenities,
    openAreaConverter,
    resolvedCategory,
    resolvedCategoryBand,
    shouldLockCategoryWarning,
}: Step3RoomsCategoryProps) {
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Rooms & Category Selection</CardTitle>
                    <CardDescription>
                        Configure your rooms and select a homestay category.
                        <br />
                        <span className="text-xs text-muted-foreground">
                            Max {MAX_ROOMS_ALLOWED} rooms and {MAX_BEDS_ALLOWED} beds allowed.
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
                        <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Total Rooms Configured</div>
                            <div className={`text-2xl font-semibold text-slate-900 ${totalRooms > MAX_ROOMS_ALLOWED ? "text-destructive" : ""}`}>
                                {totalRooms}
                            </div>
                            <div className="text-xs text-muted-foreground">Limit: {MAX_ROOMS_ALLOWED} rooms</div>
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Total Beds Planned</div>
                            <div className={`text-2xl font-semibold text-slate-900 ${totalBeds > MAX_BEDS_ALLOWED ? "text-destructive" : ""}`}>
                                {totalBeds}
                            </div>
                            <div className="text-xs text-muted-foreground">Limit: {MAX_BEDS_ALLOWED} beds</div>
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Highest Tariff Range</div>
                            <div className="text-base md:text-lg font-semibold text-foreground leading-snug">
                                {highestTariffLabel}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Selected Category</div>
                            <div className="mt-1">
                                <Badge variant={getCategoryBadge(category).variant} className="text-sm font-semibold">
                                    {getCategoryBadge(category).label}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Category Selection Cards */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium">Select Category</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {CATEGORY_CARD_INFO.map((info) => {
                                const isSelected = category === info.value;
                                const isApplicable = suggestedCategory === info.value;
                                const isDisabled = lockToRecommendedCategory && !isApplicable;
                                const band = categoryRateBands[info.value];

                                // Metallic color schemes for each category
                                const categoryStyles = {
                                    silver: {
                                        background: isSelected
                                            ? "bg-gradient-to-br from-slate-100 via-gray-200 to-slate-300 border-slate-400"
                                            : "bg-gradient-to-br from-slate-50 to-gray-100 hover:from-slate-100 hover:to-gray-200",
                                        text: "text-slate-700",
                                        badge: "bg-slate-500 text-white"
                                    },
                                    gold: {
                                        background: isSelected
                                            ? "bg-gradient-to-br from-amber-100 via-yellow-200 to-amber-300 border-amber-500"
                                            : "bg-gradient-to-br from-amber-50 to-yellow-100 hover:from-amber-100 hover:to-yellow-200",
                                        text: "text-amber-800",
                                        badge: "bg-amber-500 text-white"
                                    },
                                    diamond: {
                                        background: isSelected
                                            ? "bg-gradient-to-br from-cyan-100 via-purple-100 to-pink-100 border-purple-400"
                                            : "bg-gradient-to-br from-cyan-50 to-purple-50 hover:from-cyan-100 hover:to-purple-100",
                                        text: "text-purple-800",
                                        badge: "bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
                                    }
                                };

                                const styles = categoryStyles[info.value as keyof typeof categoryStyles] || categoryStyles.silver;

                                return (
                                    <div
                                        key={info.value}
                                        onClick={() => {
                                            if (!isDisabled) {
                                                form.setValue("category", info.value);
                                            }
                                        }}
                                        className={`
                      relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all hover-elevate
                      ${styles.background}
                      ${isSelected ? "shadow-lg ring-2 ring-primary/50" : "hover:shadow-md"}
                      ${isDisabled ? "opacity-50 cursor-not-allowed grayscale" : ""}
                    `}
                                    >
                                        {isApplicable && (
                                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${styles.badge} text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm`}>
                                                Applicable
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className={`font-semibold ${styles.text}`}>{info.title}</h3>
                                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-3 flex-1">
                                            {info.description}
                                        </p>
                                        <div className="mt-auto pt-3 border-t border-current/10 text-xs font-medium text-muted-foreground">
                                            Tariff Range: <span className={`${styles.text} font-semibold`}>{formatBandLabel(band)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Room Calculation Mode Display */}
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                {roomCalcMode === "direct"
                                    ? "Using direct tariff rates (Admin Mode)"
                                    : "Using standard tariff buckets"}
                            </span>
                        </div>
                        {roomCalcMode === "direct" && (
                            <Badge variant="outline" className="bg-white dark:bg-black">
                                Exact Rates
                            </Badge>
                        )}
                    </div>


                    {/* Dynamic Room Configuration */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Room Configuration</label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs"
                                onClick={resetType2Rows}
                                disabled={type2Rows.length <= 1 && type2Rows[0].quantity === 1}
                            >
                                Reset Rooms
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {type2Rows.map((row, index) => {
                                const { rooms: roomsUsedElsewhere, beds: bedsUsedElsewhere } = summarizeRows(type2Rows, row.id);
                                const remainingRooms = Math.max(0, MAX_ROOMS_ALLOWED - roomsUsedElsewhere);
                                const remainingBeds = Math.max(0, MAX_BEDS_ALLOWED - bedsUsedElsewhere);
                                const currentBedsPerRoom = Math.max(1, getRowBedsPerRoom(row));
                                const maxRoomsByBeds = Math.floor(remainingBeds / currentBedsPerRoom);
                                const maxRoomsForRow = Math.max(1, Math.min(remainingRooms, maxRoomsByBeds));
                                const quantityOptions = Array.from({ length: maxRoomsForRow }, (_, idx) => idx + 1);
                                const maxBedsForRow =
                                    row.quantity > 0
                                        ? Math.max(
                                            1,
                                            Math.min(
                                                MAX_BEDS_PER_ROOM,
                                                Math.floor(remainingBeds / Math.max(1, row.quantity)),
                                            ),
                                        )
                                        : Math.max(1, Math.min(MAX_BEDS_PER_ROOM, remainingBeds || 1));
                                const bedOptions = Array.from({ length: maxBedsForRow }, (_, idx) => idx + 1);

                                // Clamp values if limits shrink because of other rows
                                if (row.quantity > maxRoomsForRow) {
                                    updateType2Row(row.id, { quantity: maxRoomsForRow });
                                }
                                if (getRowBedsPerRoom(row) > maxBedsForRow) {
                                    updateType2Row(row.id, { bedsPerRoom: maxBedsForRow });
                                }

                                // Determine rate status for direct mode
                                let rateStatus: "below" | "within" | "above" = "within";
                                if (roomCalcMode === "direct" && typeof row.customRate === "number") {
                                    rateStatus = evaluateBandStatus(row.customRate, resolvedCategoryBand);
                                }

                                return (
                                    <div
                                        key={row.id}
                                        className="relative grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-lg border transition-all bg-card hover:border-primary/30"
                                    >
                                        {/* Room Type */}
                                        <div className="md:col-span-3">
                                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
                                                Room Type
                                            </label>
                                            <Select
                                                value={row.roomType}
                                                onValueChange={(val: any) => updateType2Row(row.id, { roomType: val })}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ROOM_TYPE_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Quantity & Beds */}
                                        <div className="md:col-span-3 grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
                                                    Count
                                                </label>
                                                <Select
                                                    value={String(row.quantity)}
                                                    onValueChange={(val) => {
                                                        const nextQty = clampInt(val);
                                                        const nextMaxBeds =
                                                            nextQty > 0
                                                                ? Math.max(
                                                                    1,
                                                                    Math.min(
                                                                        MAX_BEDS_PER_ROOM,
                                                                        Math.floor(
                                                                            remainingBeds / Math.max(1, nextQty),
                                                                        ),
                                                                    ),
                                                                )
                                                                : maxBedsForRow;
                                                        const clampedBeds = Math.min(getRowBedsPerRoom(row), nextMaxBeds);
                                                        updateType2Row(row.id, {
                                                            quantity: nextQty,
                                                            bedsPerRoom: clampedBeds,
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {quantityOptions.map((qty) => (
                                                            <SelectItem key={qty} value={String(qty)}>
                                                                {qty} Rms
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
                                                    Beds/Rm
                                                </label>
                                                <Select
                                                    value={String(getRowBedsPerRoom(row))}
                                                    onValueChange={(val) => {
                                                        const nextBeds = clampInt(val);
                                                        const maxRoomsByBedsNext = Math.floor(
                                                            remainingBeds / Math.max(1, nextBeds),
                                                        );
                                                        const allowableRooms = Math.min(remainingRooms, maxRoomsByBedsNext);
                                                        const clampedRooms = Math.min(row.quantity, Math.max(0, allowableRooms));
                                                        updateType2Row(row.id, {
                                                            bedsPerRoom: nextBeds,
                                                            quantity: clampedRooms,
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {bedOptions.map((beds) => (
                                                            <SelectItem key={beds} value={String(beds)}>
                                                                {beds} Beds
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Tariff / Rate */}
                                        <div className="md:col-span-3">
                                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
                                                {roomCalcMode === "direct" ? "Nightly Rate" : "Tariff Range"}
                                            </label>

                                            {roomCalcMode === "direct" ? (
                                                (() => {
                                                    const isRateMissing = row.quantity > 0 && (row.customRate === "" || row.customRate === undefined || row.customRate === null || row.customRate <= 0);
                                                    return (
                                                        <div>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">₹</span>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    placeholder="Enter tariff"
                                                                    className={`h-9 pl-7 w-full ${isRateMissing ? "ring-2 ring-amber-500 border-amber-500 focus:ring-amber-500" : ""}`}
                                                                    value={row.customRate === "" ? "" : row.customRate}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                                                                        updateType2Row(row.id, { customRate: val });
                                                                    }}
                                                                />
                                                            </div>
                                                            {isRateMissing && (
                                                                <p className="text-xs text-amber-600 mt-1 font-medium">Required</p>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <Select
                                                    value={row.tariffBucket}
                                                    onValueChange={(val: any) => updateType2Row(row.id, { tariffBucket: val })}
                                                >
                                                    <SelectTrigger className={`h-9 ${
                                                        // Highlight if bucket exceeds category
                                                        CATEGORY_ORDER[TARIFF_BUCKETS.find(b => b.value === row.tariffBucket)?.minCategory || "silver"] > CATEGORY_ORDER[category]
                                                            ? "border-destructive text-destructive"
                                                            : ""
                                                        }`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TARIFF_BUCKETS.map((bucket) => (
                                                            <SelectItem key={bucket.value} value={bucket.value}>
                                                                {bucket.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>

                                        {/* Area */}
                                        <div className="md:col-span-2">
                                            <div className="flex gap-1">
                                                <div className="flex flex-col">
                                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">Qty</label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={row.area ?? ""}
                                                        placeholder="0"
                                                        className="h-9 w-20"
                                                        onChange={(e) => updateType2Row(row.id, { area: e.target.value === "" ? "" : Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">Unit (Area)</label>
                                                    <Select
                                                        value={row.areaUnit || "sqm"}
                                                        onValueChange={(val) => updateType2Row(row.id, { areaUnit: val })}
                                                    >
                                                        <SelectTrigger className="h-9 w-[78px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="sqm">Sq.M</SelectItem>
                                                            <SelectItem value="sqft">Sq.Ft</SelectItem>
                                                            <SelectItem value="kanal">Kanal</SelectItem>
                                                            <SelectItem value="marla">Marla</SelectItem>
                                                            <SelectItem value="bigha">Bigha</SelectItem>
                                                            <SelectItem value="biswas">Biswas</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <div className="md:col-span-1 flex items-end justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={() => removeType2Row(row.id)}
                                                disabled={type2Rows.length === 1}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed"
                            onClick={addType2Row}
                            disabled={totalRooms >= MAX_ROOMS_ALLOWED}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Another Room Type
                        </Button>
                    </div>

                    {/* Attached Washrooms */}
                    <div className={`flex items-start space-x-3 p-4 rounded-lg border ${!syncAttachedBaths ? "bg-destructive/10 border-destructive/50" : "bg-muted/30"}`}>
                        <Checkbox
                            id="attached-baths"
                            checked={syncAttachedBaths}
                            onCheckedChange={(checked) => {
                                const val = !!checked;
                                setSyncAttachedBaths(val);
                                if (val) {
                                    form.setValue("attachedWashrooms", totalRooms);
                                }
                            }}
                        />
                        <div className="space-y-1">
                            <label
                                htmlFor="attached-baths"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                All rooms have attached washrooms
                            </label>
                            {syncAttachedBaths ? (
                                <p className="text-xs text-muted-foreground">
                                    Total attached washrooms: {totalRooms}
                                </p>
                            ) : (
                                <p className="text-xs text-destructive font-medium">
                                    ⚠️ Required: All rooms must have attached washrooms as per HP Tourism guidelines
                                </p>
                            )}
                        </div>
                    </div>

                    {/* GSTIN Field (Conditional) */}
                    {(category === "gold" || category === "diamond") && (
                        <div className="pt-4 border-t">
                            <FormField
                                control={form.control}
                                name="gstin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GSTIN Number</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="22AAAAA0000A1Z5"
                                                maxLength={15}
                                                {...field}
                                                onChange={(e) => field.onChange(sanitizeGstinInput(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Required for Gold and Diamond categories
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Safety Checklist Card */}
            <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-blue-500" />
                        <CardTitle>Mandatory Safety Checklist</CardTitle>
                    </div>
                    <CardDescription>
                        Confirm availability of critical safety infrastructure
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`flex items-start space-x-3 p-3 border rounded-lg transition-colors ${selectedAmenities["cctv"] ? "bg-blue-50/50 border-blue-200" : "hover:bg-muted/50"}`}>
                            <Checkbox
                                id="check-cctv"
                                checked={selectedAmenities["cctv"] || false}
                                onCheckedChange={(checked) =>
                                    setSelectedAmenities(prev => ({ ...prev, cctv: !!checked }))
                                }
                            />
                            <label htmlFor="check-cctv" className="grid gap-1.5 cursor-pointer">
                                <div className="font-medium flex items-center gap-2">
                                    <Video className="w-4 h-4 text-muted-foreground" />
                                    CCTV Surveillance
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Required at entrance and common areas
                                </p>
                            </label>
                        </div>

                        <div className={`flex items-start space-x-3 p-3 border rounded-lg transition-colors ${selectedAmenities["fireSafety"] ? "bg-blue-50/50 border-blue-200" : "hover:bg-muted/50"}`}>
                            <Checkbox
                                id="check-fire"
                                checked={selectedAmenities["fireSafety"] || false}
                                onCheckedChange={(checked) =>
                                    setSelectedAmenities(prev => ({ ...prev, fireSafety: !!checked }))
                                }
                            />
                            <label htmlFor="check-fire" className="grid gap-1.5 cursor-pointer">
                                <div className="font-medium flex items-center gap-2">
                                    <Flame className="w-4 h-4 text-muted-foreground" />
                                    Fire Safety Equipment
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Extinguishers and smoke detectors installed
                                </p>
                            </label>
                        </div>
                    </div>

                    {(!selectedAmenities["cctv"] || !selectedAmenities["fireSafety"]) && (
                        <Alert variant="destructive" className="py-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="text-sm font-medium">Safety Requirements Incomplete</AlertTitle>
                            <AlertDescription className="text-xs">
                                You must confirm both CCTV and Fire Safety equipment availability to proceed.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
