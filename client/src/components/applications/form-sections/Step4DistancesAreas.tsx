import { Dispatch, SetStateAction } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeOptionalFloat, type ApplicationForm } from "@/lib/application-schema";
import {
    Mountain,
    Waves,
    Droplets,
    Wind,
    Tent,
    Bike,
    Landmark,
    Church,
    ShoppingBag,
    Home,
    Castle,
    Sunrise,
    Apple,
    TreePine,
    Snowflake,
    Thermometer,
    Bird,
    Ship,
    Fish,
} from "lucide-react";

// Nearby Attractions within 5-10 km
const NEARBY_ATTRACTIONS = [
    { id: "hikingTrail", label: "Hiking/Trekking Trail", icon: Mountain },
    { id: "riverStream", label: "River/Stream Nearby", icon: Waves },
    { id: "waterfall", label: "Waterfall", icon: Droplets },
    { id: "paraglidingSite", label: "Paragliding Site", icon: Wind },
    { id: "campingGround", label: "Camping Ground", icon: Tent },
    { id: "mountainBiking", label: "Mountain Biking Trail", icon: Bike },
    { id: "historicTemple", label: "Ancient/Historic Temple", icon: Landmark },
    { id: "buddhistMonastery", label: "Buddhist Monastery", icon: Church },
    { id: "handicraftMarket", label: "Local Handicraft Market", icon: ShoppingBag },
    { id: "heritageVillage", label: "Traditional Heritage Village", icon: Home },
    { id: "historicFort", label: "Historic Fort/Heritage Site", icon: Castle },
    { id: "viewpoint", label: "Mountain/Valley Viewpoint", icon: Sunrise },
    { id: "appleOrchards", label: "Apple Orchards", icon: Apple },
    { id: "pineForest", label: "Pine/Deodar Forest", icon: TreePine },
    { id: "snowPoint", label: "Snow Point (Seasonal)", icon: Snowflake },
    { id: "hotSprings", label: "Hot Springs (Natural)", icon: Thermometer },
    { id: "wildlifeSanctuary", label: "Wildlife Sanctuary/National Park", icon: Bird },
    { id: "lakeBoating", label: "Lake/Boating", icon: Ship },
    { id: "fishingSpot", label: "Fishing Spot", icon: Fish },
];

interface Step4DistancesAreasProps {
    form: UseFormReturn<ApplicationForm>;
    selectedAttractions: Record<string, boolean>;
    setSelectedAttractions: Dispatch<SetStateAction<Record<string, boolean>>>;
}

export function Step4DistancesAreas({ form, selectedAttractions, setSelectedAttractions }: Step4DistancesAreasProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Distances & Nearby Attractions</CardTitle>
                <CardDescription>Location details and nearby tourist attractions (all fields optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h4 className="font-medium">Distances from Key Locations (in km)</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="distanceAirport"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Airport</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Distance in KM"
                                            data-testid="input-distance-airport"
                                            min={0}
                                            step="any"
                                            inputMode="decimal"
                                            pattern="^\d*(\.\d*)?$"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(normalizeOptionalFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="distanceRailway"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Railway Station</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Distance in KM"
                                            data-testid="input-distance-railway"
                                            min={0}
                                            step="any"
                                            inputMode="decimal"
                                            pattern="^\d*(\.\d*)?$"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(normalizeOptionalFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="distanceCityCenter"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City Centre</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Distance in KM"
                                            data-testid="input-distance-city-center"
                                            min={0}
                                            step="any"
                                            inputMode="decimal"
                                            pattern="^\d*(\.\d*)?$"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(normalizeOptionalFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="distanceShopping"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Shopping Centre</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Distance in KM"
                                            data-testid="input-distance-shopping"
                                            min={0}
                                            step="any"
                                            inputMode="decimal"
                                            pattern="^\d*(\.\d*)?$"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(normalizeOptionalFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="distanceBusStand"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bus Stand</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Distance in KM"
                                            data-testid="input-distance-bus-stand"
                                            min={0}
                                            step="any"
                                            inputMode="decimal"
                                            pattern="^\d*(\.\d*)?$"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(normalizeOptionalFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Parking Facilities */}
                <div className="space-y-4 border-t pt-4">
                    <FormField
                        control={form.control}
                        name="parkingArea"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Parking Facilities</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Describe parking facilities (e.g., covered parking for 5 cars)"
                                        className="min-h-20"
                                        data-testid="input-parking-area"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>Optional - describe available parking</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Nearby Attractions Section */}
                <div className="space-y-4 border-t pt-4">
                    <div>
                        <h4 className="font-medium">Explore Himachal: Nearby Attractions</h4>
                        <p className="text-sm text-muted-foreground">
                            Select attractions and activities available within 5-20 km of your property
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {NEARBY_ATTRACTIONS.map((attraction) => {
                            const IconComponent = attraction.icon;
                            const isChecked = selectedAttractions[attraction.id] || false;
                            return (
                                <label
                                    key={attraction.id}
                                    htmlFor={`attraction-${attraction.id}`}
                                    className={`flex items-center space-x-3 p-3 border rounded-lg hover:border-primary/30 transition-all cursor-pointer ${isChecked ? 'border-primary bg-primary/5' : ''}`}
                                    data-testid={`checkbox-attraction-${attraction.id}`}
                                >
                                    <Checkbox
                                        id={`attraction-${attraction.id}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) =>
                                            setSelectedAttractions(prev => ({ ...prev, [attraction.id]: !!checked }))
                                        }
                                    />
                                    <div className="flex items-center gap-2 flex-1">
                                        <IconComponent className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">{attraction.label}</span>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
