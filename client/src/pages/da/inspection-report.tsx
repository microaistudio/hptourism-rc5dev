import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { differenceInCalendarDays, format, subDays } from "date-fns";
import { ArrowLeft, Save, Send, CheckCircle, XCircle, AlertCircle, Calendar, MapPin, User, FileText, Shield, Star, CheckSquare, SquareX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const EARLY_OVERRIDE_WINDOW_DAYS: number = 7;

const inspectionReportSchema = z.object({
  actualInspectionDate: z.string().min(1, "Inspection date is required"),
  roomCountVerified: z.boolean().optional(),
  actualRoomCount: z.number().int().min(0).optional(),
  categoryMeetsStandards: z.boolean().optional(),
  recommendedCategory: z.enum(['diamond', 'gold', 'silver']).optional(),
  
  // ANNEXURE-III Mandatory Checklist (18 points)
  mandatoryChecklist: z.object({
    applicationForm: z.boolean(),
    documents: z.boolean(),
    onlinePayment: z.boolean(),
    wellMaintained: z.boolean(),
    cleanRooms: z.boolean(),
    comfortableBedding: z.boolean(),
    roomSize: z.boolean(),
    cleanKitchen: z.boolean(),
    cutleryCrockery: z.boolean(),
    waterFacility: z.boolean(),
    wasteDisposal: z.boolean(),
    energySavingLights: z.boolean(),
    visitorBook: z.boolean(),
    doctorDetails: z.boolean(),
    luggageAssistance: z.boolean(),
    fireEquipment: z.boolean(),
    guestRegister: z.boolean(),
    cctvCameras: z.boolean(),
  }),
  mandatoryRemarks: z.string().optional(),
  
  // ANNEXURE-III Desirable Checklist (18 points)
  desirableChecklist: z.object({
    parking: z.boolean(),
    attachedBathroom: z.boolean(),
    toiletAmenities: z.boolean(),
    hotColdWater: z.boolean(),
    waterConservation: z.boolean(),
    diningArea: z.boolean(),
    wardrobe: z.boolean(),
    storage: z.boolean(),
    furniture: z.boolean(),
    laundry: z.boolean(),
    refrigerator: z.boolean(),
    lounge: z.boolean(),
    heatingCooling: z.boolean(),
    luggageHelp: z.boolean(),
    safeStorage: z.boolean(),
    securityGuard: z.boolean(),
    himachaliCrafts: z.boolean(),
    rainwaterHarvesting: z.boolean(),
  }),
  desirableRemarks: z.string().optional(),
  
  // Legacy fields for compatibility
  fireSafetyCompliant: z.boolean().optional(),
  structuralSafety: z.boolean().optional(),
  overallSatisfactory: z.boolean().optional(),
  recommendation: z.enum(['approve', 'raise_objections']),
  detailedFindings: z.string().min(20, "Detailed findings must be at least 20 characters"),
  objectionDetails: z.string().optional(),
  earlyInspectionOverride: z.boolean().optional(),
  earlyInspectionReason: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.earlyInspectionOverride) {
    if (!data.earlyInspectionReason || data.earlyInspectionReason.trim().length < 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['earlyInspectionReason'],
        message: "Please provide at least 15 characters explaining why the inspection happened before the scheduled date.",
      });
    }
  }

  if (data.roomCountVerified === false && data.recommendation !== 'raise_objections') {
    if (typeof data.actualRoomCount !== "number" || Number.isNaN(data.actualRoomCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actualRoomCount'],
        message: "Enter the verified room count if it does not match the application.",
      });
    }
  }

  if (data.categoryMeetsStandards === false && data.recommendation !== 'raise_objections') {
    if (!data.recommendedCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recommendedCategory'],
        message: "Select the category you recommend when standards are not met.",
      });
    }
  }

  if (data.recommendation === 'approve') {
    const mandatoryValues = Object.values(data.mandatoryChecklist || {});
    if (!mandatoryValues.every(Boolean)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mandatoryChecklist'],
        message: "Turn on all mandatory checklist items before recommending verification.",
      });
    }
    if (data.roomCountVerified !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['roomCountVerified'],
        message: "Room count must match before recommending verification.",
      });
    }
    if (data.categoryMeetsStandards !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryMeetsStandards'],
        message: "Confirm that the category meets standards before recommending verification.",
      });
    }
    if (data.overallSatisfactory !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['overallSatisfactory'],
        message: "Mark the property as satisfactory before recommending verification.",
      });
    }
  } else if (data.recommendation === 'raise_objections') {
    if (!data.objectionDetails || data.objectionDetails.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['objectionDetails'],
        message: "Provide objection details (minimum 10 characters).",
      });
    }
  }
});

type InspectionReportForm = z.infer<typeof inspectionReportSchema>;

type InspectionData = {
  order: {
    id: string;
    inspectionDate: string;
    inspectionAddress: string;
    specialInstructions?: string;
  };
  application: {
    id: string;
    applicationNumber: string;
    propertyName: string;
    category: string;
    totalRooms: number;
    dtdoRemarks?: string | null;
  };
  owner: {
    fullName: string;
    mobile: string;
    email: string;
  } | null;
  reportSubmitted: boolean;
  existingReport?: any;
};

const MANDATORY_CHECKPOINTS = [
  { key: 'applicationForm', label: 'Application form as per ANNEXURE I' },
  { key: 'documents', label: 'Documents list as per ANNEXURE II' },
  { key: 'onlinePayment', label: 'Online payment facility (UPI/Net Banking/Cards)' },
  { key: 'wellMaintained', label: 'Well-maintained furnished home with quality flooring' },
  { key: 'cleanRooms', label: 'Clean, airy, pest-free rooms with external ventilation' },
  { key: 'comfortableBedding', label: 'Comfortable bedding with quality fabrics' },
  { key: 'roomSize', label: 'Minimum room & bathroom size compliance' },
  { key: 'cleanKitchen', label: 'Smoke-free, clean, hygienic, odor-free kitchen' },
  { key: 'cutleryCrockery', label: 'Good quality cutlery and crockery' },
  { key: 'waterFacility', label: 'RO/Aquaguard/Mineral water availability' },
  { key: 'wasteDisposal', label: 'Waste disposal as per municipal laws' },
  { key: 'energySavingLights', label: 'Energy-saving lights (CFL/LED) in rooms & public areas' },
  { key: 'visitorBook', label: 'Visitor book and feedback facilities' },
  { key: 'doctorDetails', label: 'Doctor names, addresses, phone numbers displayed' },
  { key: 'luggageAssistance', label: 'Lost luggage assistance facilities' },
  { key: 'fireEquipment', label: 'Basic fire equipment available' },
  { key: 'guestRegister', label: 'Guest check-in/out register (with passport details for foreigners)' },
  { key: 'cctvCameras', label: 'CCTV cameras in common areas' },
] as const;

const DESIRABLE_CHECKPOINTS = [
  { key: 'parking', label: 'Parking with adequate road width' },
  { key: 'attachedBathroom', label: 'Attached private bathroom with toiletries' },
  { key: 'toiletAmenities', label: 'Toilet with seat, lid, and toilet paper' },
  { key: 'hotColdWater', label: 'Hot & cold running water with sewage connection' },
  { key: 'waterConservation', label: 'Water conservation taps/showers' },
  { key: 'diningArea', label: 'Dining area serving fresh & hygienic food' },
  { key: 'wardrobe', label: 'Wardrobe with minimum 4 hangers in guest rooms' },
  { key: 'storage', label: 'Cabinets or drawers for storage in rooms' },
  { key: 'furniture', label: 'Quality chairs, work desk, and furniture' },
  { key: 'laundry', label: 'Washing machine/dryer or laundry services' },
  { key: 'refrigerator', label: 'Refrigerator in homestay' },
  { key: 'lounge', label: 'Lounge or sitting arrangement in lobby' },
  { key: 'heatingCooling', label: 'Heating & cooling in closed public rooms' },
  { key: 'luggageHelp', label: 'Assistance with luggage on request' },
  { key: 'safeStorage', label: 'Safe storage facilities in rooms' },
  { key: 'securityGuard', label: 'Security guard facilities' },
  { key: 'himachaliCrafts', label: 'Promotion of Himachali handicrafts & architecture' },
  { key: 'rainwaterHarvesting', label: 'Rainwater harvesting system' },
] as const;

const buildChecklistDefaults = (checkpoints: readonly { key: string }[]) =>
  checkpoints.reduce<Record<string, boolean>>((acc, checkpoint) => {
    acc[checkpoint.key] = false;
    return acc;
  }, {});

export default function DAInspectionReport() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<InspectionData>({
    queryKey: [`/api/da/inspections/${id}`],
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

  const form = useForm<InspectionReportForm>({
    resolver: zodResolver(inspectionReportSchema),
    mode: "onChange",
    defaultValues: {
      actualInspectionDate: format(new Date(), 'yyyy-MM-dd'),
      roomCountVerified: undefined,
      categoryMeetsStandards: undefined,
      mandatoryChecklist: buildChecklistDefaults(MANDATORY_CHECKPOINTS) as any,
      mandatoryRemarks: '',
      desirableChecklist: buildChecklistDefaults(DESIRABLE_CHECKPOINTS) as any,
      desirableRemarks: '',
      fireSafetyCompliant: false,
      structuralSafety: false,
      overallSatisfactory: undefined,
      recommendedCategory: undefined,
      actualRoomCount: undefined,
      recommendation: 'approve',
      detailedFindings: '',
      objectionDetails: '',
      earlyInspectionOverride: false,
      earlyInspectionReason: '',
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: async (reportData: InspectionReportForm) => {
      return await apiRequest('POST', `/api/da/inspections/${id}/submit-report`, reportData);
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Your inspection report has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/da/inspections'] });
      queryClient.invalidateQueries({ queryKey: [`/api/da/inspections/${id}`] });
      refetch();
      setLocation('/da/inspections');
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: InspectionReportForm) => {
    submitReportMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data || data.reportSubmitted) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            {data?.reportSubmitted ? (
              <>
                <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-medium">Report Already Submitted</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You have already submitted a report for this inspection.
                </p>
                <Button className="mt-4" onClick={() => setLocation('/da/inspections')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Inspections
                </Button>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Inspection Not Found</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  The inspection order you're looking for doesn't exist.
                </p>
                <Button className="mt-4" onClick={() => setLocation('/da/inspections')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Inspections
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { order, application, owner } = data;
  const scheduledDate = new Date(order.inspectionDate);
  const today = new Date();
  const earlyOverrideEnabled = form.watch('earlyInspectionOverride') ?? false;
  const earliestOverrideDateObj = subDays(scheduledDate, EARLY_OVERRIDE_WINDOW_DAYS);
  const minDate = format(scheduledDate, 'yyyy-MM-dd');
  const todayDateOnly = format(today, 'yyyy-MM-dd');
  const scheduleHasStarted = scheduledDate <= today;
  const baseMaxDateObj = scheduleHasStarted ? today : scheduledDate;
  const maxDate = format(baseMaxDateObj, 'yyyy-MM-dd');
  const overrideWindowOpen = earliestOverrideDateObj <= baseMaxDateObj;
  const computedMinDateObj = earlyOverrideEnabled
    ? (overrideWindowOpen ? earliestOverrideDateObj : baseMaxDateObj)
    : scheduledDate;
  const computedMinDate = format(computedMinDateObj, 'yyyy-MM-dd');
  const earliestOverrideDate = format(earliestOverrideDateObj, 'yyyy-MM-dd');
  const overdueDays = Math.max(0, differenceInCalendarDays(today, scheduledDate));
  const isOverdue = overdueDays > 0;
  const earlyOverrideWindowLabel = `${EARLY_OVERRIDE_WINDOW_DAYS} day${EARLY_OVERRIDE_WINDOW_DAYS === 1 ? '' : 's'}`;

  const mandatoryChecklistValues = form.watch('mandatoryChecklist') || {};
  const desirableChecklistValues = form.watch('desirableChecklist') || {};
  const mandatoryValues = Object.values(mandatoryChecklistValues);
  const desirableValues = Object.values(desirableChecklistValues);
  const mandatoryCheckedCount = mandatoryValues.filter(Boolean).length;
  const desirableCheckedCount = desirableValues.filter(Boolean).length;
  const mandatoryTotal = MANDATORY_CHECKPOINTS.length;
  const desirableTotal = DESIRABLE_CHECKPOINTS.length;
  const mandatoryComplete = mandatoryCheckedCount === mandatoryTotal;
  const recommendationValue = form.watch("recommendation");
  const requiresFullChecklist = recommendationValue !== "raise_objections";
  const canSubmit = form.formState.isValid && (!requiresFullChecklist || mandatoryComplete);

  const mandatoryPalette = [
    "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
    "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100",
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-100",
    "border-lime-200 bg-lime-50 text-lime-900 dark:border-lime-900 dark:bg-lime-950/40 dark:text-lime-100",
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
  ];
  const mandatoryToneIndex = Math.min(Math.floor(mandatoryCheckedCount / 3), mandatoryPalette.length - 1);
  const mandatoryBannerTone = requiresFullChecklist
    ? mandatoryPalette[mandatoryToneIndex]
    : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100";
  const mandatorySegmentPalette = [
    "bg-rose-300 border-rose-400 dark:bg-rose-900 dark:border-rose-800",
    "bg-orange-300 border-orange-400 dark:bg-orange-900 dark:border-orange-800",
    "bg-amber-300 border-amber-400 dark:bg-amber-900 dark:border-amber-800",
    "bg-yellow-300 border-yellow-400 dark:bg-yellow-900 dark:border-yellow-800",
    "bg-lime-300 border-lime-400 dark:bg-lime-900 dark:border-lime-800",
    "bg-green-300 border-green-400 dark:bg-green-900 dark:border-green-800",
  ];
  const mandatorySegments = Array.from({ length: Math.ceil(mandatoryTotal / 3) }, (_, index) => {
    const threshold = (index + 1) * 3;
    return {
      threshold,
      active: mandatoryCheckedCount >= threshold,
      tone: mandatorySegmentPalette[Math.min(index, mandatorySegmentPalette.length - 1)],
    };
  });

  const desirablePalette = [
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
    "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-100",
    "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100",
    "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
    "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100",
    "border-indigo-200 bg-indigo-100 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-50",
  ];
  const desirableToneIndex = Math.min(Math.floor(desirableCheckedCount / 3), desirablePalette.length - 1);
  const desirableBannerTone = desirablePalette[desirableToneIndex];
  const desirableSegmentPalette = [
    "bg-slate-200 border-slate-300 dark:bg-slate-800 dark:border-slate-700",
    "bg-slate-300 border-slate-400 dark:bg-slate-700 dark:border-slate-600",
    "bg-sky-200 border-sky-300 dark:bg-sky-900 dark:border-sky-800",
    "bg-sky-300 border-sky-400 dark:bg-sky-800 dark:border-sky-700",
    "bg-blue-300 border-blue-400 dark:bg-blue-800 dark:border-blue-700",
    "bg-indigo-300 border-indigo-400 dark:bg-indigo-800 dark:border-indigo-700",
  ];
  const desirableSegments = Array.from({ length: Math.ceil(desirableTotal / 3) }, (_, index) => {
    const threshold = (index + 1) * 3;
    return {
      threshold,
      active: desirableCheckedCount >= threshold,
      tone: desirableSegmentPalette[Math.min(index, desirableSegmentPalette.length - 1)],
    };
  });

  // Select/Clear All handlers
  const handleSelectAllMandatory = () => {
    const allChecked = MANDATORY_CHECKPOINTS.reduce((acc, checkpoint) => {
      acc[checkpoint.key] = true;
      return acc;
    }, {} as any);
    form.setValue('mandatoryChecklist', allChecked, { shouldDirty: true, shouldValidate: true });
  };

  const handleClearAllMandatory = () => {
    const allUnchecked = MANDATORY_CHECKPOINTS.reduce((acc, checkpoint) => {
      acc[checkpoint.key] = false;
      return acc;
    }, {} as any);
    form.setValue('mandatoryChecklist', allUnchecked, { shouldDirty: true, shouldValidate: true });
  };

  const handleSelectAllDesirable = () => {
    const allChecked = DESIRABLE_CHECKPOINTS.reduce((acc, checkpoint) => {
      acc[checkpoint.key] = true;
      return acc;
    }, {} as any);
    form.setValue('desirableChecklist', allChecked, { shouldDirty: true, shouldValidate: true });
  };

  const handleClearAllDesirable = () => {
    const allUnchecked = DESIRABLE_CHECKPOINTS.reduce((acc, checkpoint) => {
      acc[checkpoint.key] = false;
      return acc;
    }, {} as any);
    form.setValue('desirableChecklist', allUnchecked, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation('/da/inspections')}
            className="mb-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inspections
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Inspection Report</h1>
          <p className="text-muted-foreground mt-1">
            Submit ANNEXURE-III compliant inspection findings
          </p>
        </div>
      </div>

      {/* Property Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Property Name</span>
              <p className="font-medium">{application?.propertyName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Application Number</span>
              <p className="font-medium">{application?.applicationNumber}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Category</span>
              <div>
                <Badge variant="outline">{application?.category?.toUpperCase()}</Badge>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Owner</span>
              <p className="font-medium">{owner?.fullName} • {owner?.mobile}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-sm text-muted-foreground">Inspection Address</span>
              <p className="font-medium flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                {order.inspectionAddress}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Scheduled Date</span>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {format(new Date(order.inspectionDate), 'PPP')}
              </p>
            </div>
            {application?.dtdoRemarks && (
              <div className="md:col-span-2">
                <span className="text-sm text-sky-700 font-medium">DTDO Instructions (Required)</span>
                <p className="mt-1 p-3 bg-sky-50 dark:bg-sky-950/20 rounded-lg">{application.dtdoRemarks}</p>
              </div>
            )}
            {order.specialInstructions && (
              <div className="md:col-span-2">
                <span className="text-sm text-orange-600 font-medium">Owner Message</span>
                <p className="mt-1 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">{order.specialInstructions}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inspection Report Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Inspection Date */}
          <Card>
            <CardHeader>
              <CardTitle>Inspection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="actualInspectionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Inspection Date *</FormLabel>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="bg-muted/40">
                        Scheduled: {format(scheduledDate, 'PPP')}
                      </Badge>
                      {isOverdue ? (
                        <Badge variant="destructive">
                          {overdueDays} {overdueDays === 1 ? 'day' : 'days'} overdue
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20">
                          On schedule
                        </Badge>
                      )}
                    </div>
                    <FormControl>
                      <Input
                        type="date"
                        min={computedMinDate}
                        max={maxDate}
                        {...field}
                        data-testid="input-inspection-date"
                      />
                    </FormControl>
                    <FormDescription>
                      {scheduleHasStarted ? (
                        <>
                          Select a visit date between{" "}
                          {format(earlyOverrideEnabled ? earliestOverrideDateObj : scheduledDate, 'PPP')} and{" "}
                          {format(today, 'PPP')}.
                        </>
                      ) : (
                        <>
                          Inspection is scheduled for {format(scheduledDate, 'PPP')}. If you inspected up to{" "}
                          {earlyOverrideWindowLabel} early, enable the override and add a justification.
                        </>
                      )}
                    </FormDescription>
                    {earlyOverrideEnabled && !overrideWindowOpen && (
                      <p className="text-xs text-amber-600">
                        Early visit logging opens on {format(earliestOverrideDateObj, 'PPP')} (7 days before schedule).
                      </p>
                    )}
                    {isOverdue && (
                      <p className="text-sm text-amber-600">
                        Inspection is {overdueDays} {overdueDays === 1 ? 'day' : 'days'} past schedule. Request DTDO for a new date if the visit could not be completed.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="earlyInspectionOverride"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <FormLabel className="text-base">Log Earlier Visit</FormLabel>
                        <FormDescription>
                          Enable if the physical inspection happened up to {earlyOverrideWindowLabel} before the scheduled date.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {earlyOverrideEnabled && (
                <FormField
                  control={form.control}
                  name="earlyInspectionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Early Inspection</FormLabel>
                      <FormDescription>
                        Provide context for DTDO on why the visit was advanced (minimum 15 characters).
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Explain why the inspection was completed ahead of the scheduled date."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Basic Verification */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Verification</CardTitle>
              <CardDescription>Verify room count and category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Room Count Verification */}
              <FormField
                control={form.control}
                name="roomCountVerified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Room Count Matches</FormLabel>
                      <FormDescription>
                        Does the actual room count match the application? (Applied: {application?.totalRooms} rooms)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === true}
                        onCheckedChange={(checked) => field.onChange(checked)}
                        data-testid="switch-room-count"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('roomCountVerified') === false && (
                <FormField
                  control={form.control}
                  name="actualRoomCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Room Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              field.onChange(undefined);
                              return;
                            }
                            const parsed = parseInt(value, 10);
                            field.onChange(Number.isNaN(parsed) ? undefined : parsed);
                          }}
                          data-testid="input-actual-room-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              {/* Category Verification */}
              <FormField
                control={form.control}
                name="categoryMeetsStandards"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Category Meets Standards</FormLabel>
                      <FormDescription>
                        Does the property meet the standards for {application?.category?.toUpperCase()} category?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === true}
                        onCheckedChange={(checked) => field.onChange(checked)}
                        data-testid="switch-category-standards"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('categoryMeetsStandards') === false && (
                <FormField
                  control={form.control}
                  name="recommendedCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommended Category</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="diamond" id="diamond" />
                            <FormLabel htmlFor="diamond" className="font-normal cursor-pointer">Diamond</FormLabel>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="gold" id="gold" />
                            <FormLabel htmlFor="gold" className="font-normal cursor-pointer">Gold</FormLabel>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="silver" id="silver" />
                            <FormLabel htmlFor="silver" className="font-normal cursor-pointer">Silver</FormLabel>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* ANNEXURE-III Compliance Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                ANNEXURE-III Compliance Checklist
          </CardTitle>
          <CardDescription>
            HP Homestay Rules 2025 - Official Inspection Requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`rounded-xl border p-4 text-sm shadow-sm ${mandatoryBannerTone}`}>
            {requiresFullChecklist ? (
              <>
                <p className="text-base font-semibold">
                  {mandatoryCheckedCount}/{mandatoryTotal} mandatory checks ON
                </p>
                <p>
                  {mandatoryComplete
                    ? "All mandatory requirements are ON. You can recommend verification."
                    : "Turn on the remaining mandatory checks before recommending verification."}
                </p>
                <div className="mt-3 grid grid-cols-6 gap-1">
                  {mandatorySegments.map((segment, index) => (
                    <span
                      key={`mandatory-segment-${segment.threshold}`}
                      className={`h-2 w-full rounded-full border transition-colors ${
                        segment.active ? segment.tone : "bg-white/70 border-white/80 dark:bg-slate-900/30 dark:border-slate-800"
                      }`}
                      aria-label={`Mandatory checkpoints ${(index * 3) + 1} to ${Math.min(segment.threshold, mandatoryTotal)} ${
                        segment.active ? "complete" : "pending"
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-base font-semibold">Submitting with objections</p>
                <p>Mandatory checks can stay OFF while you document the issues below.</p>
                <div className="mt-3 grid grid-cols-6 gap-1 opacity-70">
                  {mandatorySegments.map((segment, index) => (
                    <span
                      key={`mandatory-segment-override-${segment.threshold}`}
                      className={`h-2 w-full rounded-full border ${
                        segment.active ? segment.tone : "bg-white/70 border-white/80 dark:bg-slate-900/30 dark:border-slate-800"
                      }`}
                      aria-label={`Mandatory checkpoints ${(index * 3) + 1} to ${Math.min(segment.threshold, mandatoryTotal)} progress`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          <Tabs defaultValue="mandatory" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mandatory" className="flex items-center gap-2" data-testid="tab-mandatory">
                <Shield className="w-4 h-4" />
                <span>Section A: Mandatory</span>
                <Badge variant="outline" className="ml-auto">
                  {mandatoryCheckedCount}/{mandatoryTotal}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="desirable" className="flex items-center gap-2" data-testid="tab-desirable">
                <Star className="w-4 h-4" />
                <span>Section B: Desirable</span>
                <Badge variant="outline" className="ml-auto">
                  {desirableCheckedCount}/{desirableTotal}
                </Badge>
              </TabsTrigger>
            </TabsList>

                <TabsContent value="mandatory" className="space-y-4 mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
                <div>
                  <p className="text-sm font-semibold">Mandatory requirements</p>
                  <p className="text-xs text-muted-foreground">
                    All {mandatoryTotal} switches must be ON to recommend verification.
                  </p>
                </div>
                <Badge variant={mandatoryComplete ? "default" : "destructive"}>
                  {mandatoryCheckedCount}/{mandatoryTotal}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>Toggle each clause to mark compliance.</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllMandatory}
                    data-testid="button-select-all-mandatory"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Mark all Yes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllMandatory}
                    data-testid="button-clear-all-mandatory"
                  >
                    <SquareX className="w-4 h-4 mr-2" />
                    Clear all
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {MANDATORY_CHECKPOINTS.map((checkpoint, index) => (
                  <FormField
                    key={checkpoint.key}
                    control={form.control}
                    name={`mandatoryChecklist.${checkpoint.key}`}
                    render={({ field }) => (
                      <FormItem className="rounded-lg border p-3 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            <span className="text-muted-foreground text-xs font-mono">
                              #{String(index + 1).padStart(2, '0')}
                            </span>
                            {checkpoint.label}
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Tap the switch to confirm availability.
                          </p>
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                            <span className={field.value ? "text-emerald-600" : "text-rose-600"}>
                              {field.value ? "Yes" : "No"}
                            </span>
                            <Switch
                              checked={field.value === true}
                              onCheckedChange={(checked) => field.onChange(checked)}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="desirable" className="space-y-4 mt-6">
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-sm ${desirableBannerTone}`}>
                <div>
                  <p className="text-sm font-semibold">Desirable enhancements</p>
                  <p className="text-xs text-muted-foreground">
                    Recommended improvements for guest comfort (optional).
                  </p>
                </div>
                <Badge variant="secondary">
                  {desirableCheckedCount}/{desirableTotal}
                </Badge>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {desirableSegments.map((segment, index) => (
                  <span
                    key={`desirable-segment-${segment.threshold}`}
                    className={`h-2 rounded-full border ${
                      segment.active
                        ? segment.tone
                        : "bg-white/60 border-white/70 dark:bg-slate-900/30 dark:border-slate-800"
                    }`}
                    aria-label={`Desirable checkpoints ${(index * 3) + 1} to ${Math.min(segment.threshold, desirableTotal)} ${
                      segment.active ? "available" : "pending"
                    }`}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>Mark what is available today.</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllDesirable}
                    data-testid="button-select-all-desirable"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Mark all Yes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllDesirable}
                    data-testid="button-clear-all-desirable"
                  >
                    <SquareX className="w-4 h-4 mr-2" />
                    Clear all
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {DESIRABLE_CHECKPOINTS.map((checkpoint, index) => (
                  <FormField
                    key={checkpoint.key}
                    control={form.control}
                    name={`desirableChecklist.${checkpoint.key}`}
                    render={({ field }) => (
                      <FormItem className="rounded-lg border p-3 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            <span className="text-muted-foreground text-xs font-mono">
                              #{String(index + 1).padStart(2, '0')}
                            </span>
                            {checkpoint.label}
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Optional comfort upgrade.
                          </p>
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                            <span className={field.value ? "text-emerald-600" : "text-muted-foreground"}>
                              {field.value ? "Yes" : "No"}
                            </span>
                            <Switch
                              checked={field.value === true}
                              onCheckedChange={(checked) => field.onChange(checked)}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
            </CardContent>
          </Card>

          {/* Overall Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="overallSatisfactory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold">Overall Satisfactory</FormLabel>
                      <FormDescription>
                        Property meets all requirements for homestay operation
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === true}
                        onCheckedChange={(checked) => field.onChange(checked)}
                        data-testid="switch-overall-satisfactory"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Findings and Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle>Findings & Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="detailedFindings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Inspection Summary *</FormLabel>
                    <FormDescription>
                      Capture the key highlights of this visit (minimum 20 characters). This summary is stored with the RC.
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="Example: Property meets Gold benchmarks. All rooms spotless and safety gear in place..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="textarea-detailed-findings"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Final Recommendation *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        data-testid="radio-recommendation"
                      >
                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover-elevate">
                          <RadioGroupItem value="approve" id="approve" />
                          <FormLabel htmlFor="approve" className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <div className="font-medium">Recommended for Verification</div>
                              <div className="text-xs text-muted-foreground">Ready for DTDO verification</div>
                            </div>
                          </FormLabel>
                        </div>

                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover-elevate">
                          <RadioGroupItem value="raise_objections" id="raise_objections" />
                          <FormLabel htmlFor="raise_objections" className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <div>
                              <div className="font-medium">Raise Objections</div>
                              <div className="text-xs text-muted-foreground">Issues need resolution</div>
                            </div>
                          </FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <Checkbox
                  id="objectionOverride"
                  checked={form.watch("recommendation") === "raise_objections"}
                  onCheckedChange={(checked) => {
                    form.setValue("recommendation", checked ? "raise_objections" : "approve", {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                />
                <label htmlFor="objectionOverride" className="text-sm text-amber-900 space-y-1 cursor-pointer flex-1">
                  <span className="font-semibold block">Allow submission with objections</span>
                  <span className="text-amber-900/80 block">
                    Automatically selects "Raise Objections" so you can submit the report even if some verification steps are incomplete. Provide the objection details below.
                  </span>
                </label>
              </div>

              <FormField
                control={form.control}
                name="objectionDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objection Details</FormLabel>
                    <FormDescription>
                      Visible only when submitting with objections. Share what needs correction.
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the issues that must be resolved before approval..."
                        className="min-h-[100px]"
                        {...field}
                        disabled={form.watch("recommendation") !== "raise_objections"}
                        data-testid="textarea-objection-details"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex flex-col gap-2">
            {!canSubmit && (
              <p className="text-sm text-amber-600 text-right">
                {requiresFullChecklist && !mandatoryComplete
                  ? "Turn on every mandatory checklist item before recommending verification."
                  : "Complete all required fields (detailed findings, early visit justification, etc.) before submitting."}
              </p>
            )}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/da/inspections')}
                data-testid="button-cancel"
            >
              Cancel
            </Button>
              <Button
                type="submit"
                disabled={!canSubmit || submitReportMutation.isPending}
                data-testid="button-submit-report"
              >
                {submitReportMutation.isPending ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
