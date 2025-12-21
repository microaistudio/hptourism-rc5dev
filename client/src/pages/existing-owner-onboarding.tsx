import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow, addYears, format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Handshake, AlertCircle, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { ObjectUploader, type UploadedFileMetadata } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_EXISTING_RC_MIN_ISSUE_DATE } from "@shared/appSettings";
import { getDistricts, getTehsilsForDistrict } from "@shared/regions";

const HP_DISTRICTS = getDistricts();
import type { User, HomestayApplication } from "@shared/schema";

const intakeSchema = z.object({
  ownerName: z.string().min(3, "Owner name is required"),
  ownerMobile: z.string().min(8, "Enter a valid mobile number"),
  ownerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  propertyName: z.string().min(3, "Property name is required"),
  district: z.string().min(2, "District is required"),
  tehsil: z.string().min(2, "Tehsil is required"),
  address: z.string().min(5, "Address is required"),
  pincode: z.string().min(4, "Pincode is required"),
  locationType: z.enum(["gp", "mc", "tcp"]),
  totalRooms: z.coerce.number().int().min(1).max(12),
  guardianName: z.string().min(3, "Father's / care-of name is required"),
  rcNumber: z.string().min(3, "RC number is required"),
  rcIssueDate: z.string().min(4, "Issue date is required"),
  certificateValidityYears: z.enum(["1", "3"]).default("1"),
  rcExpiryDate: z.string().min(4, "Expiry date is required"),
  notes: z.string().optional(),
});

type IntakeFormValues = z.infer<typeof intakeSchema>;

const LOCATION_OPTIONS = [
  { value: "gp", label: "Gram Panchayat" },
  { value: "mc", label: "Municipal Corporation / Municipal Council" },
  { value: "tcp", label: "Town & Country Planning / SADA / NP Area" },
];

export default function ExistingOwnerOnboarding() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    staleTime: 5 * 60 * 1000,
  });
  const user = userData?.user;
  const {
    data: activeExistingOwner,
    refetch: refetchActiveExistingOwner,
  } = useQuery<{ application: { id: string; applicationNumber: string; status: string } | null }>({
    queryKey: ["/api/existing-owners/active"],
  });
  const existingApplication = activeExistingOwner?.application ?? null;
  const { data: ownerApplicationsData } = useQuery<{ applications: HomestayApplication[] }>({
    queryKey: ["/api/applications"],
    enabled: user?.role === "property_owner",
    staleTime: 30 * 1000,
  });
  const ownerPrimaryApplication = ownerApplicationsData?.applications?.[0] ?? null;
  const { data: intakeSettings } = useQuery<{ minIssueDate: string }>({
    queryKey: ["/api/existing-owners/settings"],
    queryFn: async () => {
      const res = await fetch("/api/existing-owners/settings", { credentials: "include" });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const [certificateFiles, setCertificateFiles] = useState<UploadedFileMetadata[]>([]);
  const [identityProofFiles, setIdentityProofFiles] = useState<UploadedFileMetadata[]>([]);
  const [additionalDocuments, setAdditionalDocuments] = useState<UploadedFileMetadata[]>([]);
  const [submissionResult, setSubmissionResult] = useState<{ applicationNumber: string } | null>(null);
  const [lastSavedDraftAt, setLastSavedDraftAt] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const draftStorageKey = user?.id ? `existing-owner-draft:${user.id}` : null;
  const defaults = useMemo<IntakeFormValues>(
    () => ({
      ownerName: user?.fullName ?? "",
      ownerMobile: user?.mobile ?? "",
      ownerEmail: user?.email ?? "",
      propertyName: "",
      district: user?.district ?? "",
      tehsil: "",
      address: "",
      pincode: "",
      locationType: "gp",
      totalRooms: 1,
      guardianName: "",
      rcNumber: "",
      rcIssueDate: "",
      certificateValidityYears: "1",
      rcExpiryDate: "",
      notes: "",
    }),
    [user],
  );

  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: defaults,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const watchedIssueDate = form.watch("rcIssueDate");
  const watchedValidityYears = form.watch("certificateValidityYears");
  const watchedDistrict = form.watch("district");
  const watchedTehsil = form.watch("tehsil");
  const baseTehsilOptions = watchedDistrict ? getTehsilsForDistrict(watchedDistrict) : [];
  // Ensure the current tehsil value is always in the options (handles draft restore)
  const tehsilOptions = useMemo(() => {
    if (watchedTehsil && !baseTehsilOptions.includes(watchedTehsil)) {
      return [watchedTehsil, ...baseTehsilOptions];
    }
    return baseTehsilOptions;
  }, [baseTehsilOptions, watchedTehsil]);
  const cutoffIsoDate = useMemo(() => {
    if (!intakeSettings?.minIssueDate) {
      return DEFAULT_EXISTING_RC_MIN_ISSUE_DATE;
    }
    const parsed = new Date(intakeSettings.minIssueDate);
    if (Number.isNaN(parsed.getTime())) {
      return DEFAULT_EXISTING_RC_MIN_ISSUE_DATE;
    }
    return parsed.toISOString().slice(0, 10);
  }, [intakeSettings]);
  const cutoffDisplay = useMemo(() => {
    if (!cutoffIsoDate) {
      return null;
    }
    const parsed = new Date(cutoffIsoDate);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }, [cutoffIsoDate]);

  // Auto-calculate expiry date when issue date or validity years change
  useEffect(() => {
    if (watchedIssueDate && watchedValidityYears) {
      const issueDate = new Date(watchedIssueDate);
      if (!Number.isNaN(issueDate.getTime())) {
        const years = parseInt(watchedValidityYears, 10);
        const expiryDate = addYears(issueDate, years);
        const formattedExpiry = format(expiryDate, "yyyy-MM-dd");
        form.setValue("rcExpiryDate", formattedExpiry, { shouldValidate: true });
      }
    }
  }, [watchedIssueDate, watchedValidityYears, form]);

  const [isHydrated, setIsHydrated] = useState(false);
  const loadedDraft = useRef(false);

  // Fetch draft from API
  const { data: draftData, refetch: refetchDraft } = useQuery<{
    draft: {
      id: string;
      values: Partial<IntakeFormValues>;
      certificateDocuments: UploadedFileMetadata[];
      identityProofDocuments: UploadedFileMetadata[];
      savedAt: string;
    } | null;
  }>({
    queryKey: ["/api/existing-owners/draft"],
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // Step 1: Hydrate form with user defaults
  useEffect(() => {
    if (user && !isHydrated) {
      form.reset(defaults);
      setIsHydrated(true);
    }
  }, [user, defaults, form, isHydrated]);

  // Step 2: Load draft from API after hydration
  useEffect(() => {
    if (!isHydrated || loadedDraft.current || !draftData) {
      return;
    }
    loadedDraft.current = true;

    if (!draftData.draft) {
      return;
    }

    const { values, certificateDocuments, identityProofDocuments, savedAt } = draftData.draft;

    if (values) {
      form.reset({
        ...defaults,
        ...values,
      });
      // Explicitly re-set tehsil after a micro-delay to fix Select component timing issue
      if (values.tehsil) {
        setTimeout(() => {
          form.setValue("tehsil", values.tehsil, { shouldValidate: true });
        }, 50);
      }
    }
    if (Array.isArray(certificateDocuments)) {
      setCertificateFiles(certificateDocuments);
    }
    if (Array.isArray(identityProofDocuments)) {
      setIdentityProofFiles(identityProofDocuments);
    }
    if (savedAt) {
      setLastSavedDraftAt(savedAt);
    }
  }, [isHydrated, draftData, defaults, form]);

  const intakeMutation = useMutation({
    mutationFn: async (payload: {
      values: IntakeFormValues;
      documents: UploadedFileMetadata[];
      identityProof: UploadedFileMetadata[];
    }) => {
      const response = await fetch("/api/existing-owners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload.values,
          certificateDocuments: payload.documents,
          identityProofDocuments: payload.identityProof,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const error: Error & { applicationId?: string } = new Error(
          body?.message || "Failed to submit onboarding request",
        );
        if (body?.applicationId) {
          error.applicationId = body.applicationId;
        }
        throw error;
      }

      return response.json() as Promise<{
        application: { applicationNumber: string; id?: string };
        message?: string;
      }>;
    },
    onSuccess: (data) => {
      setSubmissionResult({ applicationNumber: data.application.applicationNumber });
      toast({
        title: "Submitted for verification",
        description: "The Admin-RC desk will review your certificate shortly.",
      });
      form.reset(defaults);
      setCertificateFiles([]);
      setIdentityProofFiles([]);
      if (draftStorageKey) {
        localStorage.removeItem(draftStorageKey);
        setLastSavedDraftAt(null);
      }
      void refetchActiveExistingOwner();
      if (data.application.id) {
        setLocation(`/applications/${data.application.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Could not submit request",
        description: error.message,
      });
      if (error?.applicationId) {
        setLocation(`/applications/${error.applicationId}`);
      }
    },
  });

  useEffect(() => {
    // Only redirect for NEW registration applications (not renewals/existing owner apps)
    // This page handles existing owner applications including drafts
    const shouldRedirectPrimary = ownerPrimaryApplication &&
      ownerPrimaryApplication.applicationKind !== "renewal" &&
      ownerPrimaryApplication.status !== "legacy_rc_draft";

    if (shouldRedirectPrimary) {
      setLocation(`/applications/${ownerPrimaryApplication.id}`);
      return;
    }

    // existingApplication comes from /api/existing-owners/active which already excludes drafts
    if (existingApplication) {
      setLocation(`/applications/${existingApplication.id}`);
    }
  }, [ownerPrimaryApplication, existingApplication, setLocation]);

  const handleSaveDraft = async () => {
    if (!user) {
      toast({
        title: "Unable to save draft",
        description: "Please wait for your profile to load and try again.",
        variant: "destructive",
      });
      return;
    }
    setIsSavingDraft(true);
    try {
      const values = form.getValues();
      const payload = {
        ...values,
        certificateDocuments: certificateFiles,
        identityProofDocuments: identityProofFiles,
      };

      const response = await fetch("/api/existing-owners/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Failed to save draft");
      }

      setLastSavedDraftAt(new Date().toISOString());
      void refetchDraft();
      toast({
        title: "Draft saved",
        description: "Your progress has been saved to the server.",
      });
    } catch (error) {
      console.error("[existing-owner] Failed to save draft", error);
      toast({
        title: "Failed to save draft",
        description: (error as Error)?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = (values: IntakeFormValues) => {
    if (certificateFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Certificate scan required",
        description: "Upload a copy of your signed RC before submitting.",
      });
      return;
    }
    if (identityProofFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Identity proof required",
        description: "Upload a copy of your Aadhaar or government ID to continue.",
      });
      return;
    }
    intakeMutation.mutate({ values, documents: certificateFiles, identityProof: identityProofFiles });
  };

  const canSubmit =
    form.formState.isValid &&
    certificateFiles.length > 0 &&
    identityProofFiles.length > 0 &&
    !intakeMutation.isPending;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Handshake className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Existing Owner Onboarding</h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Already have a valid Homestay certificate? Use these options to migrate into the new HP Tourism portal so you can renew,
          amend rooms, or download digital certificates without reapplying from scratch.
        </p>
      </div>

      <Alert>
        <AlertTitle>Verify Existing License</AlertTitle>
        <AlertDescription>
          Share your current certificate details below. Our Admin-RC desk will validate the document, assign a digital RC number, and
          unlock renewals, room amendments, and cancellations directly from the portal.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Submit your current license</CardTitle>
          <CardDescription>
            Provide the basic owner/property details, upload a scanned copy of your signed certificate, and attach a government ID
            proof. We are onboarding licenses that were issued on or after{" "}
            <span className="font-semibold">{cutoffDisplay ?? "1 January 2022"}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {submissionResult && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
              <AlertTitle>Request received</AlertTitle>
              <AlertDescription>
                Ticket <span className="font-semibold">{submissionResult.applicationNumber}</span> is now in the Admin-RC queue. You
                will receive an update once the editor verifies your document.
              </AlertDescription>
            </Alert>
          )}

          {existingApplication && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Onboarding in progress</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  Application <span className="font-semibold">{existingApplication.applicationNumber}</span> is already
                  awaiting Admin-RC verification. You’ll receive an update once the certificate is validated.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/applications/${existingApplication.id}`)}
                >
                  View request
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!existingApplication && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name as per RC" {...field} />
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
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit mobile" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="ownerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Father's / Care-of Name</FormLabel>
                        <FormControl>
                          <Input placeholder="As printed on certificate" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="propertyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Homestay name" {...field} />
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
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("tehsil", "");
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="tehsil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tehsil</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!watchedDistrict || tehsilOptions.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={watchedDistrict ? "Select tehsil" : "Select district first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tehsilOptions.map((tehsil) => (
                              <SelectItem key={tehsil} value={tehsil}>
                                {tehsil}
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
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input placeholder="6-digit pincode" {...field} />
                        </FormControl>
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
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Village / Ward, Post Office, additional directions…" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOCATION_OPTIONS.map((option) => (
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
                    name="totalRooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Approved Rooms</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={12} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="hidden md:block" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="rcNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RC / Certificate Number</FormLabel>
                        <FormControl>
                          <Input placeholder="HP-HS-XXXX-000123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rcIssueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue Date</FormLabel>
                        <FormControl>
                          <Input type="date" min={cutoffIsoDate} {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Accepted for certificates issued on or after <span className="font-medium">{cutoffDisplay ?? "01 January 2022"}</span>.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="certificateValidityYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Validity Period
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="1" id="validity-1" />
                              <label htmlFor="validity-1" className="text-sm cursor-pointer">1 Year</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="3" id="validity-3" />
                              <label htmlFor="validity-3" className="text-sm cursor-pointer">3 Years</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Auto-calculates expiry from issue date
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rcExpiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validity Upto</FormLabel>
                        <FormControl>
                          <Input type="date" min={form.watch("rcIssueDate") || cutoffIsoDate} {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Editable if different from auto-calculated
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Share any remarks for the Admin-RC editor" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Owner ID Proof (Aadhaar or Govt ID) <span className="text-destructive">*</span></p>
                  <ObjectUploader
                    label={identityProofFiles.length > 0 ? "Replace ID Proof" : "Upload ID Proof"}
                    maxFiles={2}
                    accept=".pdf"
                    onUploadComplete={setIdentityProofFiles}
                    existingFiles={identityProofFiles}
                    isMissing={identityProofFiles.length === 0}
                  />
                  {identityProofFiles.length === 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Attach at least one clear PDF copy of Aadhaar or any government ID.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Upload Signed Certificate <span className="text-destructive">*</span></p>
                  <ObjectUploader
                    label={certificateFiles.length > 0 ? "Replace Certificate" : "Upload Certificate"}
                    maxFiles={1}
                    accept=".pdf"
                    onUploadComplete={setCertificateFiles}
                    existingFiles={certificateFiles}
                    isMissing={certificateFiles.length === 0}
                  />
                  {certificateFiles.length === 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Upload a PDF of the most recent signed certificate.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Additional Supporting Documents (Optional)</p>
                  <ObjectUploader
                    label={additionalDocuments.length > 0 ? "Add More Documents" : "Add Documents"}
                    maxFiles={5}
                    accept=".pdf,.jpg,.jpeg"
                    category="photos"
                    onUploadComplete={setAdditionalDocuments}
                    existingFiles={additionalDocuments}
                  />
                  <p className="text-xs text-muted-foreground">
                    You may upload additional supporting documents (PDF or JPG format).
                  </p>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Submission automatically routes to the Admin-RC editor. You will receive a notification once the details are verified.
                    </p>
                    {lastSavedDraftAt && (
                      <p className="text-xs text-muted-foreground">
                        Draft saved {formatDistanceToNow(new Date(lastSavedDraftAt), { addSuffix: true })}.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft || !user}
                    >
                      {isSavingDraft ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Draft"
                      )}
                    </Button>
                    <Button type="submit" disabled={!canSubmit}>
                      {intakeMutation.isPending ? "Submitting..." : "Submit for Verification"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
