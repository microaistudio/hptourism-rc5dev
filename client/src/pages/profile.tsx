import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef } from "react";
import { userProfileFormSchema, type UserProfile } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Save, User, ShieldCheck } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { DEFAULT_STATE, getDistricts, getTehsilsForDistrict } from "@shared/regions";
import { useLocation } from "wouter";

const changePasswordSchema = z
  .object({
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm the new password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

const HP_STATE = DEFAULT_STATE;

export default function ProfilePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch current user
  const { data: userData } = useQuery<{ user: UserType }>({
    queryKey: ['/api/auth/me'],
  });

  const user = userData?.user;

  // Fetch existing profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery<UserProfile>({
    queryKey: ['/api/profile'],
    enabled: !!user && user.role === "property_owner",
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });
  const isHydratingDraft = useRef(false);

  // Form with default values from profile or user
  const form = useForm({
    resolver: zodResolver(userProfileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "male",
      aadhaarNumber: "",
      mobile: "",
      email: "",
      district: "",
      tehsil: "",
      gramPanchayat: "",
      urbanBody: "",
      ward: "",
      address: "",
      pincode: "",
      telephone: "",
    },
  });

  const changePasswordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    if (user.role && user.role !== "property_owner") {
      if (user.role === "dealing_assistant") {
        navigate("/da/profile");
      } else if (user.role === "district_tourism_officer") {
        navigate("/dtdo/profile");
      } else {
        navigate("/");
      }
    }
  }, [user, navigate]);

  // Reset form when profile data is loaded
  useEffect(() => {
    if (profile) {
      isHydratingDraft.current = true;
      // Split fullName into firstName and lastName
      const nameParts = (profile.fullName || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      form.reset({
        firstName: firstName,
        lastName: lastName,
        gender: profile.gender as "male" | "female",
        aadhaarNumber: profile.aadhaarNumber || "",
        mobile: profile.mobile,
        email: profile.email || "",
        district: profile.district || "",
        tehsil: profile.tehsil || "",
        gramPanchayat: profile.gramPanchayat || "",
        urbanBody: profile.urbanBody || "",
        ward: profile.ward || "",
        address: profile.address || "",
        pincode: profile.pincode || "",
        telephone: profile.telephone || "",
      });
      setTimeout(() => {
        isHydratingDraft.current = false;
      }, 0);
    } else if (user) {
      // If no profile, pre-fill from user data
      // Split fullName into firstName and lastName
      const nameParts = (user.fullName || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      form.reset({
        firstName: firstName,
        lastName: lastName,
        gender: "male",
        aadhaarNumber: user.aadhaarNumber || "",
        mobile: user.mobile || "",
        email: user.email || "",
        district: user.district || "",
        tehsil: "",
        gramPanchayat: "",
        urbanBody: "",
        ward: "",
        address: "",
        pincode: "",
        telephone: "",
      });
    }
  }, [profile, user, form]);

  // Save/Update profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({
        title: "Profile saved successfully",
        description: "Your profile information has been updated. This will be used to auto-fill future applications.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to save profile",
        description: error.message || "Please try again.",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof changePasswordSchema>) => {
      return await apiRequest("POST", "/api/owner/change-password", payload);
    },
    onSuccess: () => {
      changePasswordForm.reset();
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to change password",
        description: error?.message || "Please check your current password and try again.",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Combine firstName and lastName into fullName for the API
    const { firstName, lastName, ...rest } = data;
    const submitData = {
      ...rest,
      fullName: `${firstName} ${lastName}`.trim(),
    };
    saveProfileMutation.mutate(submitData);
  };

  const onChangePassword = (values: z.infer<typeof changePasswordSchema>) => {
    changePasswordMutation.mutate(values);
  };

  if (user && user.role !== "property_owner") {
    return null;
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Profile</h1>
        </div>
        <p className="text-muted-foreground">
          Save your default information here to auto-fill future homestay registration applications.
          You can always override these values when filling out an application.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your basic personal details that will be used across all applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your first name"
                          data-testid="input-profile-firstname"
                          characterRestriction="alpha-space"
                          maxLength={50}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your last name"
                          data-testid="input-profile-lastname"
                          characterRestriction="alpha-space"
                          maxLength={50}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-profile-gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Female property owners receive an additional 5% discount on registration fees
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="aadhaarNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123456789012"
                          maxLength={12}
                          data-testid="input-profile-aadhaar"
                          characterRestriction="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="9876543210"
                          maxLength={10}
                          data-testid="input-profile-mobile"
                          characterRestriction="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="your.email@example.com"
                        data-testid="input-profile-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>
                Your contact address details (LGD hierarchical format)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <FormLabel>State</FormLabel>
                  <Input value={HP_STATE} readOnly disabled className="bg-muted/60" aria-readonly />
                  <p className="text-xs text-muted-foreground">Homestay pilot currently covers Himachal Pradesh.</p>
                </div>
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (isHydratingDraft.current) {
                            return;
                          }
                          form.setValue('tehsil', '');
                          form.setValue('gramPanchayat', '');
                          form.setValue('urbanBody', '');
                          form.setValue('ward', '');
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-profile-district">
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getDistricts().map((district) => (
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tehsil</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset GP when tehsil changes
                          form.setValue('gramPanchayat', '');
                          form.setValue('urbanBody', '');
                          form.setValue('ward', '');
                        }}
                        value={field.value}
                        disabled={!form.watch('district')}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-profile-tehsil">
                            <SelectValue placeholder="Select tehsil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getTehsilsForDistrict(form.watch('district')).map((tehsil) => (
                            <SelectItem key={tehsil} value={tehsil}>
                              {tehsil}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Select tehsil after district</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gramPanchayat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Village / Locality (PO)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Village, locality, or Post Office"
                          data-testid="input-profile-gp"
                        />
                      </FormControl>
                      <FormDescription>Required for Gram Panchayat areas; optional for MC/TCP.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="urbanBody"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Urban Body / MC / TCP (for urban areas)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Type your MC/TCP/Nagar Panchayat"
                          data-testid="input-profile-urban-body"
                          aria-invalid={fieldState.invalid}
                        />
                      </FormControl>
                      <FormDescription>Enter the name of the urban local body manually.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ward"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Ward / Zone (for urban areas)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter ward or zone"
                          data-testid="input-profile-ward-manual"
                          aria-invalid={fieldState.invalid}
                        />
                      </FormControl>
                      <FormDescription>Enter the ward / zone number manually.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="House/Building number, Street, Locality"
                        rows={3}
                        data-testid="input-profile-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="171001"
                          maxLength={6}
                          data-testid="input-profile-pincode"
                          characterRestriction="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telephone (Landline)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0177-2812345"
                          data-testid="input-profile-telephone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="submit"
              disabled={saveProfileMutation.isPending || !form.formState.isDirty}
              data-testid="button-save-profile"
            >
              {saveProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Update your password regularly to keep the account secure.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...changePasswordForm}>
            <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="grid gap-4 md:grid-cols-2">
              <FormField
                control={changePasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Re-enter new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-3 flex justify-end">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
