import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User as UserIcon, Info, AlertTriangle, Sparkles } from "lucide-react";
import {
    GENDER_OPTIONS,
    OWNERSHIP_LABELS,
    type ApplicationForm,
} from "@/lib/application-schema";

interface Step2OwnerInfoProps {
    form: UseFormReturn<ApplicationForm>;
    ownerGender: "male" | "female" | "other" | undefined;
    propertyOwnership: "owned" | "leased" | undefined;
    goToProfile: () => void;
    renderProfileManagedDescription: (fieldLabel?: string) => JSX.Element;
}

export function Step2OwnerInfo({
    form,
    ownerGender,
    propertyOwnership,
    goToProfile,
    renderProfileManagedDescription,
}: Step2OwnerInfoProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <UserIcon className="w-5 h-5 text-primary" />
                    <CardTitle>Owner Information</CardTitle>
                </div>
                <CardDescription>Details of the property owner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="bg-muted/60 border-dashed border-muted">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Profile-managed details</AlertTitle>
                    <AlertDescription className="flex flex-wrap items-center gap-2">
                        Name, contact and Aadhaar information come from your verified profile. Update them via
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-3"
                            onClick={goToProfile}
                        >
                            My Profile
                        </Button>
                        before starting the application.
                    </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="ownerFirstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    First Name <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        ref={field.ref}
                                        name={field.name}
                                        value={field.value ?? ""}
                                        readOnly
                                        aria-readonly="true"
                                        placeholder="First name"
                                        autoComplete="given-name"
                                        autoCapitalize="words"
                                        data-testid="input-owner-first-name"
                                        className="bg-muted cursor-not-allowed"
                                    />
                                </FormControl>
                                {renderProfileManagedDescription("First name")}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="ownerLastName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Last Name <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        ref={field.ref}
                                        name={field.name}
                                        value={field.value ?? ""}
                                        readOnly
                                        aria-readonly="true"
                                        placeholder="Last name"
                                        autoComplete="family-name"
                                        autoCapitalize="words"
                                        data-testid="input-owner-last-name"
                                        className="bg-muted cursor-not-allowed"
                                    />
                                </FormControl>
                                {renderProfileManagedDescription("Last name")}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Owner Full Name (auto-filled)</FormLabel>
                            <FormControl>
                                <Input
                                    ref={field.ref}
                                    name={field.name}
                                    value={field.value ?? ""}
                                    readOnly
                                    data-testid="input-owner-name"
                                    className="bg-muted cursor-not-allowed"
                                />
                            </FormControl>
                            <FormDescription>Generated from first and last name for application records.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="ownerGender"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gender (affects registration fee)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger data-testid="select-owner-gender">
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {GENDER_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>Female owners receive an additional 5% fee discount</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="ownerMobile"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Mobile Number <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        ref={field.ref}
                                        name={field.name}
                                        value={field.value ?? ""}
                                        readOnly
                                        aria-readonly="true"
                                        placeholder="10-digit mobile"
                                        autoComplete="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={10}
                                        data-testid="input-owner-mobile"
                                        className="bg-muted cursor-not-allowed"
                                    />
                                </FormControl>
                                {renderProfileManagedDescription("Mobile number")}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="ownerEmail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Email <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        ref={field.ref}
                                        name={field.name}
                                        type="email"
                                        value={field.value ?? ""}
                                        readOnly
                                        aria-readonly="true"
                                        placeholder="your@email.com"
                                        data-testid="input-owner-email"
                                        className="bg-muted cursor-not-allowed"
                                    />
                                </FormControl>
                                {renderProfileManagedDescription("Email")}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="ownerAadhaar"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Aadhaar Number <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        ref={field.ref}
                                        name={field.name}
                                        value={field.value ?? ""}
                                        readOnly
                                        aria-readonly="true"
                                        placeholder="12-digit Aadhaar"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={12}
                                        data-testid="input-owner-aadhaar"
                                        className="bg-muted cursor-not-allowed"
                                    />
                                </FormControl>
                                {renderProfileManagedDescription("Aadhaar number")}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="propertyOwnership"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Property Ownership <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex gap-4"
                                    data-testid="radio-property-ownership"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="owned" id="owned" data-testid="radio-ownership-owned" />
                                        <label htmlFor="owned" className="text-sm font-medium cursor-pointer">
                                            Owned
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="leased" id="leased" data-testid="radio-ownership-leased" />
                                        <label htmlFor="leased" className="text-sm font-medium cursor-pointer">
                                            {OWNERSHIP_LABELS.leased}
                                        </label>
                                    </div>
                                </RadioGroup>
                            </FormControl>
                            <FormDescription>
                                Specify whether you own the property or have it on lease
                            </FormDescription>
                            {propertyOwnership === "leased" && (
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mt-3" data-testid="alert-lease-not-allowed">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm text-orange-700 dark:text-orange-200">
                                                Lease Deed Applications Not Accepted
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                The tourism department currently processes homestay registrations only for properties under clear ownership. Applications submitted on lease or sale deeds are not entertained.
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Please proceed with an owned property to continue your registration.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Discount Preview for Female Owners */}
                {ownerGender === "female" && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4" data-testid="alert-female-discount">
                        <div className="flex items-start gap-2">
                            <Sparkles className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium text-sm text-green-600 dark:text-green-500">Special Discount Eligible!</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    As a female property owner, you qualify for an additional <strong>5% discount</strong> on registration fees.
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    This discount will be automatically applied to your final fee calculation.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
