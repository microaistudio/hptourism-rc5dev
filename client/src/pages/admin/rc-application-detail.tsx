import { useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { HomestayApplication, Document } from "@shared/schema";

type LegacyApplicationResponse = {
  application: HomestayApplication;
  owner: {
    fullName: string | null;
    mobile: string | null;
    email: string | null;
  } | null;
  documents?: Document[];
};

const CATEGORY_OPTIONS = [
  { value: "diamond", label: "Diamond" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
];

const LOCATION_TYPES = [
  { value: "mc", label: "Municipal Corporation / Municipal Council" },
  { value: "tcp", label: "Town & Country Planning / SADA / NP Area" },
  { value: "gp", label: "Gram Panchayat" },
];

const OWNER_GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  "draft",
  "legacy_rc_review",
  "submitted",
  "under_scrutiny",
  "forwarded_to_dtdo",
  "dtdo_review",
  "inspection_scheduled",
  "inspection_under_review",
  "verified_for_payment",
  "payment_pending",
  "approved",
  "rejected",
] as const;

type StatusOption = (typeof STATUS_OPTIONS)[number];

type LegacyApplicationFormValues = {
  propertyName: string;
  category: string;
  locationType: string;
  status: StatusOption;
  projectType: string;
  propertyOwnership: string;
  address: string;
  district: string;
  tehsil: string;
  block: string;
  gramPanchayat: string;
  pincode: string;
  ownerName: string;
  ownerMobile: string;
  ownerEmail: string;
  ownerAadhaar: string;
  ownerGender: string;
  propertyArea: string;
  singleBedRooms: string;
  singleBedRoomRate: string;
  doubleBedRooms: string;
  doubleBedRoomRate: string;
  familySuites: string;
  familySuiteRate: string;
  attachedWashrooms: string;
  distanceAirport: string;
  distanceRailway: string;
  distanceCityCenter: string;
  distanceShopping: string;
  distanceBusStand: string;
  certificateNumber: string;
  certificateIssuedDate: string;
  certificateExpiryDate: string;
  serviceNotes: string;
  guardianName: string;
};

const createDefaultValues = (): LegacyApplicationFormValues => ({
  propertyName: "",
  category: "",
  locationType: "",
  status: "draft",
  projectType: "",
  propertyOwnership: "",
  address: "",
  district: "",
  tehsil: "",
  block: "",
  gramPanchayat: "",
  pincode: "",
  ownerName: "",
  ownerMobile: "",
  ownerEmail: "",
  ownerAadhaar: "",
  ownerGender: "",
  propertyArea: "",
  singleBedRooms: "",
  singleBedRoomRate: "",
  doubleBedRooms: "",
  doubleBedRoomRate: "",
  familySuites: "",
  familySuiteRate: "",
  attachedWashrooms: "",
  distanceAirport: "",
  distanceRailway: "",
  distanceCityCenter: "",
  distanceShopping: "",
  distanceBusStand: "",
  certificateNumber: "",
  certificateIssuedDate: "",
  certificateExpiryDate: "",
  serviceNotes: "",
  guardianName: "",
});

const toInputDate = (value?: Date | string | null) => {
  if (!value) return "";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "";
  }
  return dateValue.toISOString().slice(0, 10);
};

const mapApplicationToFormValues = (application: HomestayApplication): LegacyApplicationFormValues => ({
  propertyName: application.propertyName ?? "",
  category: application.category ?? "",
  locationType: application.locationType ?? "",
  status: (application.status as StatusOption) ?? "draft",
  projectType: application.projectType ?? "",
  propertyOwnership: application.propertyOwnership ?? "",
  address: application.address ?? "",
  district: application.district ?? "",
  tehsil: application.tehsil ?? "",
  block: application.block ?? "",
  gramPanchayat: application.gramPanchayat ?? "",
  pincode: application.pincode ?? "",
  ownerName: application.ownerName ?? "",
  ownerMobile: application.ownerMobile ?? "",
  ownerEmail: application.ownerEmail ?? "",
  ownerAadhaar: application.ownerAadhaar ?? "",
  ownerGender: application.ownerGender ?? "",
  propertyArea: application.propertyArea ? String(application.propertyArea) : "",
  singleBedRooms: application.singleBedRooms ? String(application.singleBedRooms) : "",
  singleBedRoomRate: application.singleBedRoomRate ? String(application.singleBedRoomRate) : "",
  doubleBedRooms: application.doubleBedRooms ? String(application.doubleBedRooms) : "",
  doubleBedRoomRate: application.doubleBedRoomRate ? String(application.doubleBedRoomRate) : "",
  familySuites: application.familySuites ? String(application.familySuites) : "",
  familySuiteRate: application.familySuiteRate ? String(application.familySuiteRate) : "",
  attachedWashrooms: application.attachedWashrooms ? String(application.attachedWashrooms) : "",
  distanceAirport: application.distanceAirport ? String(application.distanceAirport) : "",
  distanceRailway: application.distanceRailway ? String(application.distanceRailway) : "",
  distanceCityCenter: application.distanceCityCenter ? String(application.distanceCityCenter) : "",
  distanceShopping: application.distanceShopping ? String(application.distanceShopping) : "",
  distanceBusStand: application.distanceBusStand ? String(application.distanceBusStand) : "",
  certificateNumber: application.certificateNumber ?? "",
  certificateIssuedDate: toInputDate(application.certificateIssuedDate),
  certificateExpiryDate: toInputDate(application.certificateExpiryDate),
  serviceNotes: application.serviceNotes ?? "",
  guardianName: application.guardianName ?? application.serviceContext?.legacyGuardianName ?? "",
});

const buildPayloadFromValues = (values: LegacyApplicationFormValues) => {
  const toNullable = (value: string) => (value && value.trim().length > 0 ? value.trim() : null);
  const toNumber = (value: string) => (value && value.trim().length > 0 ? Number(value) : null);
  const toDateIso = (value: string) => (value && value.trim().length > 0 ? new Date(value).toISOString() : null);

  return {
    propertyName: values.propertyName.trim(),
    category: values.category || null,
    locationType: values.locationType || null,
    status: values.status,
    projectType: values.projectType || null,
    propertyOwnership: values.propertyOwnership || null,
    address: toNullable(values.address),
    district: toNullable(values.district),
    tehsil: toNullable(values.tehsil),
    block: toNullable(values.block),
    gramPanchayat: toNullable(values.gramPanchayat),
    pincode: toNullable(values.pincode),
    ownerName: toNullable(values.ownerName),
    ownerMobile: toNullable(values.ownerMobile),
    ownerEmail: toNullable(values.ownerEmail),
    ownerAadhaar: toNullable(values.ownerAadhaar),
    ownerGender: values.ownerGender || null,
    propertyArea: toNumber(values.propertyArea),
    singleBedRooms: toNumber(values.singleBedRooms),
    singleBedRoomRate: toNumber(values.singleBedRoomRate),
    doubleBedRooms: toNumber(values.doubleBedRooms),
    doubleBedRoomRate: toNumber(values.doubleBedRoomRate),
    familySuites: toNumber(values.familySuites),
    familySuiteRate: toNumber(values.familySuiteRate),
    attachedWashrooms: toNumber(values.attachedWashrooms),
    distanceAirport: toNumber(values.distanceAirport),
    distanceRailway: toNumber(values.distanceRailway),
    distanceCityCenter: toNumber(values.distanceCityCenter),
    distanceShopping: toNumber(values.distanceShopping),
    distanceBusStand: toNumber(values.distanceBusStand),
    certificateNumber: toNullable(values.certificateNumber),
    certificateIssuedDate: toDateIso(values.certificateIssuedDate),
    certificateExpiryDate: toDateIso(values.certificateExpiryDate),
    serviceNotes: toNullable(values.serviceNotes),
    guardianName: toNullable(values.guardianName),
  };
};

export default function AdminRcApplicationDetail() {
  const [, params] = useRoute<{ id: string }>("/admin/rc-applications/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const applicationId = params?.id;

  const form = useForm<LegacyApplicationFormValues>({
    defaultValues: useMemo(() => createDefaultValues(), []),
  });

  const { data, isLoading, error } = useQuery<LegacyApplicationResponse>({
    queryKey: ["/api/admin-rc/applications", applicationId],
    enabled: Boolean(applicationId),
  });

  useEffect(() => {
    if (data?.application) {
      form.reset(mapApplicationToFormValues(data.application));
    }
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: LegacyApplicationFormValues) => {
      const payload = buildPayloadFromValues(values);
      const response = await apiRequest("PATCH", `/api/admin-rc/applications/${applicationId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-rc/applications", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-rc/applications"] });
      toast({
        title: "Application updated",
        description: "All changes have been saved.",
      });
    },
    onError: (mutationError: any) => {
      toast({
        title: "Save failed",
        description: mutationError?.message || "Unable to save changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!applicationId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Invalid request</CardTitle>
            <CardDescription>Application identifier is missing.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const application = data?.application;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Legacy Application Editor</h1>
          <p className="text-muted-foreground">
            Update certificate-ready information for historical RC owners. Changes apply immediately after saving.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => navigate("/admin/rc-applications")} disabled={updateMutation.isPending}>
            Back to queue
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/admin/rc-applications/${applicationId}/certificate`)}
          >
            Preview certificate
          </Button>
          <Button onClick={form.handleSubmit((values) => updateMutation.mutate(values))} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load application. Please try again.
        </div>
      ) : !application ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Application not found or not part of the legacy queue.
        </div>
      ) : (
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
            <Card>
              <CardHeader>
                <CardTitle>{application.propertyName}</CardTitle>
                <CardDescription>
                  Application #{application.applicationNumber} • Owner mobile {application.ownerMobile || "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="propertyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter property name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location type" />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCATION_TYPES.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <Separator />
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Type</FormLabel>
                      <FormControl>
                        <Input placeholder="new_project / new_rooms" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="propertyOwnership"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership</FormLabel>
                      <FormControl>
                        <Input placeholder="owned / leased" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Owner information</CardTitle>
                <CardDescription>Update personal details for the certificate printout.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerGender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {OWNER_GENDERS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guardianName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father / Guardian Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Late Shri Krishan Chand Sharma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Mobile</FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit mobile" maxLength={10} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="owner@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerAadhaar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhaar</FormLabel>
                      <FormControl>
                        <Input placeholder="12-digit Aadhaar" maxLength={12} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location & Address</CardTitle>
                <CardDescription>Ensure LGD hierarchy is accurate for district reports.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Property address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <FormControl>
                        <Input placeholder="District" {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input placeholder="Tehsil" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="block"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block</FormLabel>
                      <FormControl>
                        <Input placeholder="Block" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gramPanchayat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Village / Locality (PO)</FormLabel>
                      <FormControl>
                        <Input placeholder="Village or Gram Panchayat" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="Pincode" maxLength={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Room & Distance Details</CardTitle>
                <CardDescription>Update counts and measurements for the certificate.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="propertyArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Built-up Area (sq.ft)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="singleBedRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Single Rooms</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="doubleBedRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Double Rooms</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="familySuites"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family Suites</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="attachedWashrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attached Washrooms</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-3 grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="singleBedRoomRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Single Room Rate (₹/night)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="doubleBedRoomRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Double Room Rate (₹/night)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="familySuiteRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family Suite Rate (₹/night)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-3 grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="distanceAirport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distance to Airport (km)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="0.1" {...field} />
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
                        <FormLabel>Distance to Railway (km)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="0.1" {...field} />
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
                        <FormLabel>Distance to City Centre (km)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="0.1" {...field} />
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
                        <FormLabel>Distance to Market (km)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="0.1" {...field} />
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
                        <FormLabel>Distance to Bus Stand (km)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="0.1" {...field} />
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
                <CardTitle>Certificate metadata</CardTitle>
                <CardDescription>Fill in RC number and validity dates when finalizing.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="certificateNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RC Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., HP-HH-22-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="certificateIssuedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="certificateExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Till</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Internal notes</CardTitle>
                <CardDescription>Visible to Admin RC users only.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="serviceNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Remarks for certificate printing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}
