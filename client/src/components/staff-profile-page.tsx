import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, User, Shield, AtSign, Save, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";

const staffProfileFormSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  firstName: z.string().min(1).optional().or(z.literal("")),
  lastName: z.string().min(1).optional().or(z.literal("")),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  alternatePhone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number").optional().or(z.literal("")),
  officePhone: z.string().regex(/^[0-9+\-()\s]{5,20}$/, "Enter a valid office contact number").optional().or(z.literal("")),
  designation: z.string().max(120).optional().or(z.literal("")),
  department: z.string().max(120).optional().or(z.literal("")),
  employeeId: z.string().max(50).optional().or(z.literal("")),
  officeAddress: z.string().max(500).optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type StaffProfileFormValues = z.infer<typeof staffProfileFormSchema>;

interface StaffProfilePageProps {
  roleBadgeLabel: string;
  roleBadgeClassName?: string;
  changePasswordEndpoint?: string;
  updateProfileEndpoint?: string;
  roleHelperText?: string;
}

const mapUserToFormValues = (user: UserType): StaffProfileFormValues => ({
  fullName: user.fullName || "",
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  mobile: user.mobile || "",
  email: user.email || "",
  alternatePhone: user.alternatePhone || "",
  officePhone: user.officePhone || "",
  designation: user.designation || "",
  department: user.department || "",
  employeeId: user.employeeId || "",
  officeAddress: user.officeAddress || "",
});

export default function StaffProfilePage({
  roleBadgeLabel,
  roleBadgeClassName,
  changePasswordEndpoint = "/api/staff/change-password",
  updateProfileEndpoint = "/api/staff/profile",
  roleHelperText = "Role, username, and district assignments are centrally managed. Contact the system administrator for changes.",
}: StaffProfilePageProps) {
  const { toast } = useToast();

  const { data: userData, isLoading } = useQuery<{ user: UserType }>({
    queryKey: ["/api/auth/me"],
  });

  const user = userData?.user;

  const profileForm = useForm<StaffProfileFormValues>({
    resolver: zodResolver(staffProfileFormSchema),
    defaultValues: {
      fullName: "",
      firstName: "",
      lastName: "",
      mobile: "",
      email: "",
      alternatePhone: "",
      officePhone: "",
      designation: "",
      department: "",
      employeeId: "",
      officeAddress: "",
    },
    values: user ? mapUserToFormValues(user) : undefined,
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: StaffProfileFormValues) => {
      await apiRequest("PATCH", updateProfileEndpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile updated",
        description: "Your staff profile information has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: error.message || "Please try again.",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await apiRequest("POST", changePasswordEndpoint, data);
    },
    onSuccess: () => {
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password updated",
        description: "Use your new password the next time you log in.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to change password",
        description: error.message || "Please verify your credentials and try again.",
      });
    },
  });

  const onProfileSubmit = (data: StaffProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Unable to load profile information.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Profile</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your personal details, official contact information, and credentials
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Role & Assignment
              </span>
            </div>
            <CardDescription>{roleHelperText}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Role</Label>
              <Badge variant="outline" className={roleBadgeClassName || "bg-blue-50 text-blue-700 dark:bg-blue-950/20"}>
                {roleBadgeLabel}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Assigned District</Label>
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/20">
                {user.district || "Not Assigned"}
              </Badge>
            </div>
          </div>

          {user.username && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AtSign className="h-4 w-4" />
                Username (read-only)
              </Label>
              <Input value={user.username} disabled className="lowercase bg-muted" />
            </div>
          )}
        </CardContent>
      </Card>

      <Form {...profileForm}>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal & Contact Information</CardTitle>
              <CardDescription>Keep your personal and contact details up to date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={profileForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        characterRestriction="alpha-space"
                        maxLength={120}
                        data-testid="input-full-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Given name"
                          characterRestriction="alpha-space"
                          maxLength={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Surname"
                          characterRestriction="alpha-space"
                          maxLength={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="10-digit mobile"
                          characterRestriction="numeric"
                          maxLength={10}
                          data-testid="input-mobile"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="alternatePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternate Mobile (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Alternate 10-digit mobile"
                          characterRestriction="numeric"
                          maxLength={10}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Official Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="name@department.gov.in" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="officePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 0177-2658127"
                          maxLength={20}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Official Details</CardTitle>
              <CardDescription>Share how applicants and colleagues can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. District Tourism Development Officer"
                          maxLength={120}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department / Office</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Department / Office name"
                          maxLength={120}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileForm.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee / Staff ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ID or reference number" maxLength={50} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="officeAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office Address</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Building, street, town, PIN"
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? (
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

      <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter current password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 6 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Re-enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="default"
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
