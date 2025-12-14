import { useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";
import { getTehsilsForDistrict } from "@shared/regions";
import {
    HP_STATE,
    HP_DISTRICTS,
    LOCATION_TYPES,
    PROJECT_TYPE_OPTIONS,
    PINCODE_PREFIX,
    PINCODE_SUFFIX_LENGTH,
    sanitizePincodeSuffix,
    type ApplicationForm,
} from "@/lib/application-schema";

interface Step1PropertyDetailsProps {
    form: UseFormReturn<ApplicationForm>;
    step: number;
    isServiceDraft: boolean;
    watchedDistrict: string;
    locationType: "mc" | "tcp" | "gp";
    pincodeSuffixValue: string;
    showPincodeHint: boolean;
    gramFieldConfig: {
        label: string;
        placeholder: string;
        description: string;
        requiredMessage: string;
    } | null;
    urbanBodyConfig: {
        label: string;
        placeholder: string;
        description: string;
    };
}

export function Step1PropertyDetails({
    form,
    step,
    isServiceDraft,
    watchedDistrict,
    locationType,
    pincodeSuffixValue,
    showPincodeHint,
    gramFieldConfig,
    urbanBodyConfig,
}: Step1PropertyDetailsProps) {
    const isHydratingDraft = useRef(false);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <Home className="w-5 h-5 text-primary" />
                    <CardTitle>Property Details</CardTitle>
                </div>
                <CardDescription>Basic information about your homestay property</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isServiceDraft && (
                    <p className="text-sm text-muted-foreground">
                        Property identity is inherited from your approved application. Start a new registration if structural details need to change.
                    </p>
                )}
                <fieldset disabled={isServiceDraft} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="propertyName"
                            rules={{ required: "Property name is required" }}
                            render={({ field, fieldState }) => (
                                <FormItem>
                                    <FormLabel>
                                        Homestay Name <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., Himalayan View Homestay"
                                            data-testid="input-property-name"
                                            aria-invalid={fieldState.invalid}
                                            className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>Choose a memorable name for your homestay</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="projectType"
                            rules={{ required: "Property type is required" }}
                            render={({ field, fieldState }) => (
                                <FormItem>
                                    <FormLabel>
                                        New Registration <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger
                                                aria-invalid={fieldState.invalid}
                                                className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                                            >
                                                <SelectValue placeholder="Select registration type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {PROJECT_TYPE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Submit a fresh homestay registration.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* LGD Hierarchical Address - State, District & Tehsil */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <FormLabel>State</FormLabel>
                            <Input value={HP_STATE} readOnly disabled className="bg-muted/60" aria-readonly />
                            <p className="text-xs text-muted-foreground">Portal currently supports Himachal Pradesh only.</p>
                        </div>

                        <FormField
                            control={form.control}
                            name="district"
                            rules={{ required: "District is required" }}
                            render={({ field, fieldState }) => (
                                <FormItem>
                                    <FormLabel>
                                        District <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            if (isHydratingDraft.current) {
                                                return;
                                            }

                                            form.setValue('gramPanchayat', '');
                                            form.setValue('urbanBody', '');
                                            form.setValue('ward', '');
                                            form.clearErrors("ward");

                                            const tehsilOptions = getTehsilsForDistrict(value);
                                            const nextTehsilValue =
                                                tehsilOptions.length === 0 ? '__other' : '';
                                            form.setValue('tehsil', nextTehsilValue, {
                                                shouldDirty: false,
                                                shouldValidate: step >= 1,
                                            });
                                            form.setValue('tehsilOther', '', {
                                                shouldDirty: false,
                                                shouldValidate: step >= 1,
                                            });
                                        }}
                                        value={field.value || undefined}
                                    >
                                        <FormControl>
                                            <SelectTrigger
                                                data-testid="select-district"
                                                className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder="Select district" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {HP_DISTRICTS.map((district) => (
                                                <SelectItem key={district} value={district}>
                                                    {district}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Select your district first</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="tehsil"
                            render={({ field, fieldState }) => (
                                <FormItem>
                                    <FormLabel>
                                        Tehsil <span className="text-destructive">*</span>
                                    </FormLabel>
                                    {(() => {
                                        const districtValue = watchedDistrict || '';
                                        const fallbackTehsils = getTehsilsForDistrict(districtValue);
                                        const currentTehsil = field.value;
                                        const includeCurrentValue =
                                            currentTehsil &&
                                            typeof currentTehsil === "string" &&
                                            !fallbackTehsils.includes(currentTehsil);

                                        return (
                                            <Select
                                                onValueChange={(value) => {
                                                    const previousTehsil = form.getValues('tehsil');
                                                    field.onChange(value);

                                                    if (isHydratingDraft.current) {
                                                        return;
                                                    }

                                                    const tehsilChanged = value !== previousTehsil;
                                                    if (!isHydratingDraft.current && tehsilChanged) {
                                                        form.setValue('gramPanchayat', '', { shouldDirty: false, shouldValidate: step >= 1 });
                                                        form.setValue('urbanBody', '', { shouldDirty: false, shouldValidate: step >= 1 });
                                                        form.setValue('ward', '', { shouldDirty: false, shouldValidate: step >= 1 });
                                                        form.clearErrors("ward");
                                                    }

                                                    if (!isHydratingDraft.current && value !== '__other') {
                                                        form.setValue('tehsilOther', '', { shouldDirty: false, shouldValidate: step >= 1 });
                                                    }
                                                }}
                                                value={field.value || undefined}
                                                disabled={!districtValue}
                                            >
                                                <FormControl>
                                                    <SelectTrigger
                                                        data-testid="select-tehsil"
                                                        className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                                                        aria-invalid={fieldState.invalid}
                                                    >
                                                        <SelectValue placeholder="Select tehsil" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {fallbackTehsils.map((tehsil) => (
                                                        <SelectItem key={tehsil} value={tehsil}>
                                                            {tehsil}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="__other">Other (Manual Entry)</SelectItem>
                                                    {includeCurrentValue && (
                                                        <SelectItem key={currentTehsil} value={currentTehsil}>
                                                            {currentTehsil}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        );
                                    })()}
                                    <FormDescription>Select tehsil after district</FormDescription>
                                    <FormMessage />
                                    {form.watch('tehsil') === '__other' && (
                                        <FormField
                                            control={form.control}
                                            name="tehsilOther"
                                            rules={{ required: "Please enter the tehsil name" }}
                                            render={({ field, fieldState }) => (
                                                <FormItem className="mt-3">
                                                    <FormLabel>Manual Tehsil Entry <span className="text-destructive">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Type tehsil or subdivision name"
                                                            data-testid="input-tehsil-other"
                                                            value={field.value ?? ""}
                                                            onChange={(event) => field.onChange(event.target.value)}
                                                            aria-invalid={fieldState.invalid}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>Provide the correct tehsil if it is not listed above.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="locationType"
                        rules={{ required: "Location type is required" }}
                        render={({ field, fieldState }) => (
                            <FormItem>
                                <FormLabel>
                                    Location Type (affects registration fee) <span className="text-destructive">*</span>
                                </FormLabel>
                                <Select
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        if (value === "gp") {
                                            form.setValue("urbanBody", "", { shouldDirty: false, shouldValidate: step >= 1 });
                                            form.setValue("ward", "", { shouldDirty: false, shouldValidate: step >= 1 });
                                            form.clearErrors("ward");
                                        }
                                    }}
                                    value={field.value || undefined}
                                >
                                    <FormControl>
                                        <SelectTrigger
                                            data-testid="select-location-type"
                                            className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                                            aria-invalid={fieldState.invalid}
                                        >
                                            <SelectValue placeholder="Select location type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {LOCATION_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>Rural (GP) or Urban (MC/TCP) - Required for fee calculation</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {gramFieldConfig && (
                        <FormField
                            control={form.control}
                            name="gramPanchayat"
                            rules={{
                                validate: (value) => {
                                    if (!value?.trim()) {
                                        return gramFieldConfig.requiredMessage;
                                    }
                                    return true;
                                },
                            }}
                            render={({ field, fieldState }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1">
                                        {gramFieldConfig.label}
                                        <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={gramFieldConfig.placeholder}
                                            data-testid="input-gram-panchayat"
                                            value={field.value ?? ""}
                                            onChange={(event) => field.onChange(event.target.value)}
                                            aria-invalid={fieldState.invalid}
                                        />
                                    </FormControl>
                                    <FormDescription>{gramFieldConfig.description}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Conditional: Urban Address (MC/TCP) */}
                    {(locationType === 'mc' || locationType === 'tcp') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="urbanBody"
                                rules={{ required: "Urban local body is required" }}
                                render={({ field, fieldState }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {urbanBodyConfig.label} <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={urbanBodyConfig.placeholder}
                                                data-testid="input-urban-body"
                                                value={field.value ?? ""}
                                                onChange={(event) => {
                                                    field.onChange(event.target.value);
                                                    form.setValue("ward", "", { shouldDirty: false, shouldValidate: step >= 1 });
                                                    form.clearErrors("ward");
                                                }}
                                                aria-invalid={fieldState.invalid}
                                            />
                                        </FormControl>
                                        <FormDescription>{urbanBodyConfig.description}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ward"
                                render={({ field, fieldState }) => (
                                    <FormItem>
                                        <FormLabel>Ward / Zone (optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ward number or zone"
                                                data-testid="input-ward-manual"
                                                value={field.value ?? ""}
                                                onChange={(event) => field.onChange(event.target.value)}
                                                aria-invalid={fieldState.invalid}
                                            />
                                        </FormControl>
                                        <FormDescription>Provide the ward or zone if assigned by the urban body.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    <FormField
                        control={form.control}
                        name="address"
                        rules={{ required: "Address is required" }}
                        render={({ field, fieldState }) => (
                            <FormItem>
                                <FormLabel>
                                    House/Building Number, Street & Locality <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="e.g., House No. 123, Main Road, Near Post Office"
                                        className={`min-h-20 ${fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                        data-testid="input-address"
                                        aria-invalid={fieldState.invalid}
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>Specific address details with landmarks</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="pincode"
                        rules={{
                            required: "PIN code is required",
                            validate: (value) => (/^[1-9]\d{5}$/.test(value) ? true : "Enter a valid 6-digit PIN code"),
                        }}
                        render={({ field, fieldState }) => (
                            <FormItem>
                                <FormLabel>
                                    PIN Code <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center rounded-md border bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">
                                            {PINCODE_PREFIX}-
                                        </span>
                                        <Input
                                            placeholder="Last 4 digits"
                                            data-testid="input-pincode"
                                            aria-invalid={fieldState.invalid}
                                            className={`bg-muted/60 ${showPincodeHint ? "border-amber-500 focus-visible:ring-amber-500 ring-offset-background" : ""
                                                }`}
                                            value={pincodeSuffixValue}
                                            onChange={(event) => {
                                                const suffix = sanitizePincodeSuffix(event.target.value);
                                                field.onChange((PINCODE_PREFIX + suffix).slice(0, 6));
                                            }}
                                            onBlur={(event) => {
                                                const suffix = sanitizePincodeSuffix(event.target.value);
                                                field.onChange((PINCODE_PREFIX + suffix).slice(0, 6));
                                                field.onBlur();
                                            }}
                                        />
                                    </div>
                                </FormControl>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Prefix <span className="font-semibold">{PINCODE_PREFIX}</span> is fixed—enter the last 4 digits of your PIN code.
                                </p>
                                {showPincodeHint && (
                                    <p className="text-xs text-amber-600 mt-1">Enter all remaining digits to continue.</p>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="telephone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telephone (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Landline number" data-testid="input-telephone" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </fieldset>
            </CardContent>
        </Card>
    );
}
