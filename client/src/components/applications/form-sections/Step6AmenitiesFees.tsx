import { Dispatch, SetStateAction } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ApplicationSummaryCard } from "@/components/application/application-summary";
import type { ApplicationForm } from "@/lib/application-schema";
import type { CategoryType } from "@shared/fee-calculator";

interface Amenity {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface FeeCalculation {
    baseFee: number;
    validityDiscount: number;
    femaleOwnerDiscount: number;
    pangiDiscount: number;
    totalFee: number;
    savingsAmount: number;
    savingsPercentage: number;
}

interface Step6AmenitiesFeesProps {
    form: UseFormReturn<ApplicationForm>;
    selectedAmenities: Record<string, boolean>;
    setSelectedAmenities: Dispatch<SetStateAction<Record<string, boolean>>>;
    AMENITIES: Amenity[];
    MANDATORY_AMENITY_IDS: Set<string>;
    category: CategoryType;
    locationType: string;
    certificateValidityYears: string;
    fees: FeeCalculation;
    getCategoryBadge: (cat: string) => { label: string; variant: "default" | "secondary" | "outline" };
    LOCATION_LABEL_MAP: Record<string, string>;
    totalRooms: number;
    activeDraftApplication: any;
    correctionId: string | null;
    selectedAmenitiesCount: number;
}

export function Step6AmenitiesFees({
    form,
    selectedAmenities,
    setSelectedAmenities,
    AMENITIES,
    MANDATORY_AMENITY_IDS,
    category,
    locationType,
    certificateValidityYears,
    fees,
    getCategoryBadge,
    LOCATION_LABEL_MAP,
    totalRooms,
    activeDraftApplication,
    correctionId,
    selectedAmenitiesCount,
}: Step6AmenitiesFeesProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Amenities, Facilities & Fee Summary</CardTitle>
                <CardDescription>Final details and registration fee calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Amenities Section */}
                <div className="space-y-4">
                    <h4 className="font-medium">Property Amenities</h4>
                    <p className="text-sm text-muted-foreground">
                        CCTV surveillance and fire-safety equipment remain locked because you confirmed them in the safety checklist. Other amenities are optional.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {AMENITIES.map((amenity) => {
                            const IconComponent = amenity.icon;
                            const isMandatory = MANDATORY_AMENITY_IDS.has(amenity.id);
                            const isChecked = selectedAmenities[amenity.id] || false;
                            return (
                                <div
                                    key={amenity.id}
                                    className={`flex items-center space-x-3 p-3 border rounded-lg hover-elevate ${isMandatory ? "opacity-90 border-dashed bg-muted/50 cursor-not-allowed" : ""}`}
                                    data-testid={`checkbox-amenity-${amenity.id}`}
                                >
                                    <Checkbox
                                        checked={isChecked}
                                        disabled={isMandatory}
                                        onCheckedChange={(checked) =>
                                            !isMandatory && setSelectedAmenities(prev => ({ ...prev, [amenity.id]: !!checked }))
                                        }
                                    />
                                    <label
                                        className={`flex items-center gap-2 flex-1 ${isMandatory ? "cursor-not-allowed" : "cursor-pointer"}`}
                                        onClick={() => {
                                            if (isMandatory) return;
                                            setSelectedAmenities(prev => ({ ...prev, [amenity.id]: !prev[amenity.id] }));
                                        }}
                                    >
                                        <IconComponent className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">{amenity.label}</span>
                                        {isMandatory && (
                                            <Badge variant="outline" className="text-[10px] uppercase ml-auto">
                                                Mandatory
                                            </Badge>
                                        )}
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Additional Facilities Section */}
                <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Additional Facilities (Optional)</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="ecoFriendlyFacilities"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Eco-Friendly Facilities</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Solar panels, rainwater harvesting, waste management, etc."
                                            className="min-h-20"
                                            data-testid="input-eco-friendly"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="nearestHospital"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nearest Hospital</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Name and distance"
                                            data-testid="input-nearest-hospital"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="keyLocationHighlight1"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nearby Attraction 1</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe a nearby attraction or highlight (max 100 words)"
                                            className="min-h-20"
                                            maxLength={600}
                                            data-testid="input-key-highlight-1"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>Describe in less than 100 words</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="keyLocationHighlight2"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nearby Attraction 2</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe another nearby attraction or highlight (max 100 words)"
                                            className="min-h-20"
                                            maxLength={600}
                                            data-testid="input-key-highlight-2"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>Describe in less than 100 words</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Certificate Validity Selection */}
                <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">Certificate Validity Period</h4>
                    <FormField
                        control={form.control}
                        name="certificateValidityYears"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    >
                                        <div className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover-elevate ${field.value === "1" ? "border-primary bg-primary/5" : "border-border"}`}>
                                            <RadioGroupItem value="1" id="validity-1" className="mt-1" />
                                            <label htmlFor="validity-1" className="flex-1 cursor-pointer">
                                                <div className="font-medium mb-1">1 Year (Standard)</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Annual fee: ₹{fees.baseFee.toFixed(0)}
                                                </div>
                                            </label>
                                        </div>
                                        <div className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover-elevate ${field.value === "3" ? "border-primary bg-primary/5" : "border-border"}`}>
                                            <RadioGroupItem value="3" id="validity-3" className="mt-1" />
                                            <label htmlFor="validity-3" className="flex-1 cursor-pointer">
                                                <div className="font-medium mb-1 flex items-center gap-2">
                                                    3 Years (Lump Sum)
                                                    <Badge variant="default" className="text-xs">10% OFF</Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Save ₹{((fees.baseFee * 3 * 0.10)).toFixed(0)} with 3-year payment
                                                </div>
                                            </label>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                                <FormDescription>
                                    Choose certificate validity period. 3-year lump sum payment receives 10% discount
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Fee Summary Section */}
                <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">Registration Fee Summary</h4>
                    <div className="bg-primary/5 p-6 rounded-lg border-2 border-primary/20">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Category</span>
                                <Badge variant={getCategoryBadge(category).variant}>
                                    {getCategoryBadge(category).label}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Location Type</span>
                                <span className="font-medium text-sm">{LOCATION_LABEL_MAP[locationType] || "—"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Certificate Validity</span>
                                <span className="font-medium">{certificateValidityYears} {certificateValidityYears === "1" ? "year" : "years"}</span>
                            </div>
                            <div className="border-t pt-3 mt-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Base Fee (Annual)</span>
                                    <span className="font-medium">₹{fees.baseFee.toFixed(0)}</span>
                                </div>
                                {certificateValidityYears === "3" && (
                                    <div className="flex justify-between mt-2">
                                        <span className="text-muted-foreground">Total ({certificateValidityYears} years)</span>
                                        <span className="font-medium">₹{(fees.baseFee * 3).toFixed(0)}</span>
                                    </div>
                                )}
                            </div>
                            {(fees.validityDiscount > 0 || fees.femaleOwnerDiscount > 0 || fees.pangiDiscount > 0) && (
                                <div className="border-t pt-3 mt-3">
                                    <div className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">Discounts Applied:</div>
                                    {fees.validityDiscount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">3-year lump sum (10%)</span>
                                            <span className="text-green-600 dark:text-green-400">-₹{fees.validityDiscount.toFixed(0)}</span>
                                        </div>
                                    )}
                                    {fees.femaleOwnerDiscount > 0 && (
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-muted-foreground">Female owner (5%)</span>
                                            <span className="text-green-600 dark:text-green-400">-₹{fees.femaleOwnerDiscount.toFixed(0)}</span>
                                        </div>
                                    )}
                                    {fees.pangiDiscount > 0 && (
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-muted-foreground">Pangi sub-division (50%)</span>
                                            <span className="text-green-600 dark:text-green-400">-₹{fees.pangiDiscount.toFixed(0)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="pt-3 border-t flex justify-between text-lg">
                                <span className="font-semibold">Total Payable</span>
                                <span className="font-bold text-primary" data-testid="text-total-fee">₹{fees.totalFee.toFixed(0)}</span>
                            </div>
                            {fees.savingsAmount > 0 && (
                                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-3">
                                    <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                                        ✨ You save ₹{fees.savingsAmount.toFixed(0)} ({fees.savingsPercentage.toFixed(1)}%)
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <ApplicationSummaryCard
                        className="bg-muted/50 border-0 shadow-none"
                        highlightCategoryBadge={false}
                        application={{
                            applicationNumber: activeDraftApplication?.applicationNumber ?? correctionId ?? undefined,
                            propertyName: form.watch("propertyName") || undefined,
                            address: form.watch("address") || undefined,
                            district: form.watch("district") || undefined,
                            tehsil: form.watch("tehsil") || undefined,
                            tehsilOther: form.watch("tehsilOther") || undefined,
                            pincode: form.watch("pincode") || undefined,
                            ownerName: form.watch("ownerName") || undefined,
                            ownerMobile: form.watch("ownerMobile") || undefined,
                            totalRooms,
                            category: form.watch("category") || undefined,
                        }}
                        owner={{
                            name: form.watch("ownerName"),
                            mobile: form.watch("ownerMobile"),
                            email: form.watch("ownerEmail"),
                        }}
                        extraRows={[
                            { label: "Amenities", value: `${selectedAmenitiesCount} selected` },
                        ]}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
