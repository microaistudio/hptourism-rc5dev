import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { nanoid } from "nanoid";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Home,
  User as UserIcon,
  Bed,
  Wifi,
  FileText,
  IndianRupee,
  Eye,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  Info,
  MapPin,
  Wind,
  ParkingCircle,
  UtensilsCrossed,
  Droplets,
  Tv,
  Shirt,
  ConciergeBell,
  Trees,
  Mountain,
  PawPrint,
  Video,
  Flame,
  Plus,
  Trash2,
  Copy,
  Accessibility,
  HandHeart,
  Landmark,
  ChefHat,
  Sofa,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { User, HomestayApplication, UserProfile, ApplicationServiceContext, ApplicationKind } from "@shared/schema";
import { ObjectUploader, type UploadedFileMetadata } from "@/components/ObjectUploader";
import { ApplicationSummaryCard } from "@/components/application/application-summary";
import { ApplicationKindBadge, getApplicationKindLabel, isServiceApplication } from "@/components/application/application-kind-badge";
import { calculateHomestayFee, calculateUpgradeFee, formatFee, suggestCategory, validateCategorySelection, CATEGORY_REQUIREMENTS, MAX_ROOMS_ALLOWED, MAX_BEDS_ALLOWED, type CategoryType, type LocationType, type FeeBreakdown } from "@shared/fee-calculator";
import type { RoomCalcModeSetting } from "@shared/appSettings";
import { DEFAULT_ROOM_CALC_MODE } from "@shared/appSettings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApplicationStepper } from "@/components/application-stepper";
import { useLocation } from "wouter";
import {
  DEFAULT_STATE,
  getDistricts,
  getTehsilsForDistrict,
  LOCATION_TYPE_OPTIONS,
} from "@shared/regions";
import {
  DEFAULT_UPLOAD_POLICY,
  type UploadPolicy,
} from "@shared/uploadPolicy";
import { isCorrectionRequiredStatus } from "@/constants/workflow";
import {
  DEFAULT_CATEGORY_ENFORCEMENT,
  DEFAULT_CATEGORY_RATE_BANDS,
  type CategoryEnforcementSetting,
  type CategoryRateBands,
} from "@shared/appSettings";
import { Step1PropertyDetails } from "@/components/applications/form-sections/Step1PropertyDetails";
import { Step2OwnerInfo } from "@/components/applications/form-sections/Step2OwnerInfo";
import { Step3RoomsCategory } from "@/components/applications/form-sections/Step3RoomsCategory";
import { Step4DistancesAreas } from "@/components/applications/form-sections/Step4DistancesAreas";
import { Step5Documents } from "@/components/applications/form-sections/Step5Documents";
import { Step6AmenitiesFees } from "@/components/applications/form-sections/Step6AmenitiesFees";
import { Step6CancellationReview } from "@/components/applications/form-sections/Step6CancellationReview";
import { Step6SimpleReview } from "@/components/applications/form-sections/Step6SimpleReview";
import { applicationSchema, type ApplicationForm } from "@/lib/application-schema";

const HP_STATE = DEFAULT_STATE;
const HP_DISTRICTS = getDistricts();
const canonicalizeInput = (value?: string | null) =>
  typeof value === "string" ? value.trim() : "";

const findCanonicalMatch = (value: string, options: string[]) => {
  if (!value) {
    return "";
  }
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }
  const lower = normalized.toLowerCase();
  const exact = options.find((option) => option.toLowerCase() === lower);
  if (exact) {
    return exact;
  }
  const sanitized = lower.replace(/district$/i, "").trim();
  const sanitizedMatch = options.find(
    (option) => option.toLowerCase() === sanitized,
  );
  if (sanitizedMatch) {
    return sanitizedMatch;
  }
  const partial = options.find((option) =>
    lower.includes(option.toLowerCase()),
  );
  return partial || normalized;
};

const clampInt = (value: string) => {
  if (!value || value.trim() === "") {
    return 0;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
};

const NON_NEGATIVE_DECIMAL = /^\d*(\.\d*)?$/;

const clampFloat = (value: string) => {
  if (!value) {
    return undefined;
  }
  const sanitized = value.replace(/,/g, "").trim();
  if (!sanitized) {
    return undefined;
  }
  if (!NON_NEGATIVE_DECIMAL.test(sanitized)) {
    return undefined;
  }
  const parsed = parseFloat(sanitized);
  if (Number.isNaN(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
};

const AREA_CONVERSION_FACTORS = {
  kanal: 505.857,
  marla: 25.29285,
  bigha: 802.34,
  sqft: 0.092903,
  sqm: 1,
};
const SQM_TO_SQFT = 10.7639;
type AreaUnit = keyof typeof AREA_CONVERSION_FACTORS;

const sanitizeGstinInput = (value: string) =>
  value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
const GSTIN_REGEX = /^[0-9A-Z]{15}$/;

const PINCODE_PREFIX = "17";
const PINCODE_SUFFIX_LENGTH = 6 - PINCODE_PREFIX.length;
const PINCODE_REGEX = /^[1-9]\d{5}$/;
const sanitizePincodeSuffix = (value: string) =>
  value.replace(/[^\d]/g, "").slice(0, PINCODE_SUFFIX_LENGTH);
const ensurePincodeWithPrefix = (value?: string) => {
  const incoming = value ?? "";
  const suffixSource = incoming.startsWith(PINCODE_PREFIX)
    ? incoming.slice(PINCODE_PREFIX.length)
    : incoming;
  return (PINCODE_PREFIX + sanitizePincodeSuffix(suffixSource)).slice(0, 6);
};

const normalizeOptionalFloat = (value: string) => clampFloat(value);

const LOCATION_TYPES = LOCATION_TYPE_OPTIONS;
const LOCATION_LABEL_MAP = LOCATION_TYPE_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<string, string>,
);

const PROJECT_TYPE_OPTIONS = [
  { value: "new_project", label: "New Homestay Registration" },
] as const;

const formatDateDisplay = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDistanceDisplay = (value?: number | null) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value} km`;
  }
  return "Enter distance in KM";
};

const normalizePositiveNumber = (value: unknown) => {
  const num = coerceNumber(value);
  if (typeof num === "number" && Number.isFinite(num) && num > 0) {
    return num;
  }
  return undefined;
};

const GENDER_OPTIONS = [
  { value: "female", label: "Female (5% additional discount)" },
  { value: "male", label: "Male" },
];

const normalizeGender = (value: unknown): "male" | "female" => {
  return value === "female" ? "female" : "male";
};

// District-based typical distances (user can override)
const DISTRICT_DISTANCES: Record<string, { airport: number; railway: number; cityCenter: number; shopping: number; busStand: number }> = {};

// Strict schema for final submission - all required fields
const OWNERSHIP_LABELS: Record<"owned" | "leased", string> = {
  owned: "Owned",
  leased: "Lease Deed",
};



const ROOM_TYPE_OPTIONS = [
  { value: "single", label: "Type 1 (Single)" },
  { value: "double", label: "Type 2 (Double)" },
  { value: "suite", label: "Suite" },
] as const;

type RoomTypeOption = typeof ROOM_TYPE_OPTIONS[number]["value"];

const MAX_BEDS_PER_ROOM = 6;

const ROOM_TYPE_CONFIG: Record<
  RoomTypeOption,
  {
    roomsField: keyof ApplicationForm;
    bedsField: keyof ApplicationForm;
    rateField: keyof ApplicationForm;
    sizeField: keyof ApplicationForm;
    defaultBeds: number;
  }
> = {
  single: {
    roomsField: "singleBedRooms",
    bedsField: "singleBedBeds",
    rateField: "singleBedRoomRate",
    sizeField: "singleBedRoomSize",
    defaultBeds: 1,
  },
  double: {
    roomsField: "doubleBedRooms",
    bedsField: "doubleBedBeds",
    rateField: "doubleBedRoomRate",
    sizeField: "doubleBedRoomSize",
    defaultBeds: 2,
  },
  suite: {
    roomsField: "familySuites",
    bedsField: "familySuiteBeds",
    rateField: "familySuiteRate",
    sizeField: "familySuiteSize",
    defaultBeds: 4,
  },
};

const TARIFF_BUCKETS = [
  { value: "lt3k", label: "Less than ₹3,000/night", explanation: "Eligible for SILVER category", minRate: 0, maxRate: 2999, minCategory: "silver" as const },
  { value: "3kto10k", label: "₹3,000 – ₹10,000/night", explanation: "Requires GOLD category or higher", minRate: 3000, maxRate: 10000, minCategory: "gold" as const },
  { value: "gt10k", label: "Above ₹10,000/night", explanation: "Requires DIAMOND category", minRate: 10001, maxRate: 50000, minCategory: "diamond" as const },
];

type TariffBucket = typeof TARIFF_BUCKETS[number]["value"];

const CATEGORY_ORDER: Record<"silver" | "gold" | "diamond", number> = {
  silver: 1,
  gold: 2,
  diamond: 3,
};

type Type2Row = {
  id: string;
  roomType: RoomTypeOption;
  quantity: number;
  tariffBucket: TariffBucket;
  bedsPerRoom: number;
  area?: number | "";
  customRate?: number | "";
};

type RoomCalculationMode = "buckets" | "direct";

const makeEmptyType2Row = (roomType: RoomTypeOption): Type2Row => ({
  id: nanoid(6),
  roomType,
  quantity: 1,
  tariffBucket: "lt3k",
  bedsPerRoom: ROOM_TYPE_CONFIG[roomType].defaultBeds,
  area: "",
});

const getUnusedRoomType = (currentRows: Type2Row[]): RoomTypeOption => {
  const used = new Set(currentRows.map((row) => row.roomType));
  const available = ROOM_TYPE_OPTIONS.find((option) => !used.has(option.value));
  return available ? (available.value as RoomTypeOption) : "single";
};

const getRowBedsPerRoom = (row: Type2Row) => {
  if (typeof row.bedsPerRoom === "number" && row.bedsPerRoom > 0) {
    return row.bedsPerRoom;
  }
  return ROOM_TYPE_CONFIG[row.roomType].defaultBeds;
};

const summarizeRows = (rows: Type2Row[], excludeId?: string) =>
  rows.reduce(
    (acc, row) => {
      if (excludeId && row.id === excludeId) {
        return acc;
      }
      const rooms = Math.max(0, row.quantity);
      const beds = rooms * getRowBedsPerRoom(row);
      return {
        rooms: acc.rooms + rooms,
        beds: acc.beds + beds,
      };
    },
    { rooms: 0, beds: 0 },
  );

const enforceRoomAndBedLimits = (rows: Type2Row[]): Type2Row[] =>
  rows.map((row) => {
    const { rooms: roomsUsedElsewhere, beds: bedsUsedElsewhere } = summarizeRows(rows, row.id);
    let roomsAvailable = Math.max(0, MAX_ROOMS_ALLOWED - roomsUsedElsewhere);
    let bedsAvailable = Math.max(0, MAX_BEDS_ALLOWED - bedsUsedElsewhere);

    let quantity = Math.max(0, Math.min(row.quantity, roomsAvailable));
    if (quantity > bedsAvailable) {
      quantity = bedsAvailable;
    }

    let bedsPerRoom = getRowBedsPerRoom(row);
    if (quantity <= 0 || bedsAvailable <= 0) {
      quantity = quantity <= 0 ? 0 : quantity;
      bedsPerRoom = Math.min(bedsPerRoom, MAX_BEDS_PER_ROOM);
    } else {
      const maxBedsPerRoom = Math.max(1, Math.min(MAX_BEDS_PER_ROOM, Math.floor(bedsAvailable / quantity)));
      bedsPerRoom = Math.max(1, Math.min(bedsPerRoom, maxBedsPerRoom));
    }

    return {
      ...row,
      quantity,
      bedsPerRoom,
    };
  });

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[index]}`;
};


// Fully relaxed schema for draft saves - all fields optional with no constraints
const draftSchema = z.object({
  propertyName: z.string().optional(),
  locationType: z.enum(["mc", "tcp", "gp"]).optional(),
  district: z.string().optional(),
  tehsil: z.string().optional(),
  tehsilOther: z.string().optional(),
  gramPanchayat: z.string().optional(),
  gramPanchayatOther: z.string().optional(),
  urbanBody: z.string().optional(),
  urbanBodyOther: z.string().optional(),
  ward: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  telephone: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerMobile: z.string().optional(),
  ownerName: z.string().optional(),
  ownerFirstName: z.string().optional(),
  ownerLastName: z.string().optional(),
  ownerGender: z.enum(["male", "female", "other"]).optional(),
  ownerAadhaar: z.string().optional(),
  propertyOwnership: z.enum(["owned", "leased"]).optional(),
  category: z.enum(["diamond", "gold", "silver"]).optional(),
  proposedRoomRate: z.number().optional(),
  singleBedRoomRate: z.number().optional(),
  doubleBedRoomRate: z.number().optional(),
  familySuiteRate: z.number().optional(),
  distanceAirport: z.number().optional(),
  distanceRailway: z.number().optional(),
  distanceCityCenter: z.number().optional(),
  distanceShopping: z.number().optional(),
  distanceBusStand: z.number().optional(),
  projectType: z.enum(["new_rooms", "new_project"]).optional(),
  propertyArea: z.number().optional(),
  singleBedRooms: z.number().optional(),
  singleBedBeds: z.number().optional(),
  singleBedRoomSize: z.number().optional(),
  doubleBedRooms: z.number().optional(),
  doubleBedBeds: z.number().optional(),
  doubleBedRoomSize: z.number().optional(),
  familySuites: z.number().optional(),
  familySuiteBeds: z.number().optional(),
  familySuiteSize: z.number().optional(),
  attachedWashrooms: z.number().optional(),
  lobbyArea: z.number().optional(),
  diningArea: z.number().optional(),
  parkingArea: z.string().optional(),
  ecoFriendlyFacilities: z.string().optional(),
  differentlyAbledFacilities: z.string().optional(),
  fireEquipmentDetails: z.string().optional(),
  gstin: z.string().optional(),
  certificateValidityYears: z.enum(["1", "3"]).optional(),
  nearestHospital: z.string().optional(),
});

type DraftForm = z.infer<typeof draftSchema>;

const splitFullName = (fullName?: string | null) => {
  if (!fullName) {
    return { firstName: "", lastName: "" };
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(" ") };
};

const sanitizeNamePart = (value: string) =>
  value.replace(/[^A-Za-z\s'-]/g, "").replace(/\s{2,}/g, " ");

const sanitizeDigits = (value: string, maxLength?: number) => {
  let digitsOnly = value.replace(/\D/g, "");
  if (typeof maxLength === "number") {
    digitsOnly = digitsOnly.slice(0, maxLength);
  }
  return digitsOnly;
};

const bucketToRate = (bucket: TariffBucket) => {
  const info = TARIFF_BUCKETS.find((b) => b.value === bucket);
  if (!info) return 0;
  if (info.value === "gt10k") {
    return info.minRate;
  }
  return info.maxRate;
};

const rateToBucket = (rate?: number | null): TariffBucket | null => {
  if (typeof rate !== "number" || Number.isNaN(rate)) return null;
  if (rate <= 0) return null;
  if (rate <= 3000) return "lt3k";
  if (rate <= 10000) return "3kto10k";
  return "gt10k";
};

const formatShortCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const formatBandLabel = (band: { min: number; max: number | null }) => {
  if (band.max === null) {
    const previousThreshold = Math.max(0, band.min - 1);
    return `Above ${formatShortCurrency(previousThreshold)} / night`;
  }
  if (band.min <= 1) {
    const nextWhole = Math.max(band.max + 1, 1);
    return `Less than ${formatShortCurrency(nextWhole)} / night`;
  }
  return `${formatShortCurrency(band.min)} – ${formatShortCurrency(band.max)} / night`;
};

type BandStatus = "empty" | "ok" | "below" | "above";

const evaluateBandStatus = (rate: number, band: { min: number; max: number | null }): BandStatus => {
  if (rate <= 0 || Number.isNaN(rate)) {
    return "empty";
  }
  if (rate < band.min) {
    return "below";
  }
  if (band.max !== null && rate > band.max) {
    return "above";
  }
  return "ok";
};

const coerceNumber = (value: unknown, fallback: number | undefined = undefined) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const normalizeOptionalString = (value?: string | null) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const generateClientId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return nanoid();
};

const AMENITIES = [
  { id: "ac", label: "Air Conditioning", icon: Wind },
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "parking", label: "Parking", icon: ParkingCircle },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { id: "hotWater", label: "Hot Water 24/7", icon: Droplets },
  { id: "tv", label: "Television", icon: Tv },
  { id: "laundry", label: "Laundry Service", icon: Shirt },
  { id: "roomService", label: "Room Service", icon: ConciergeBell },
  { id: "garden", label: "Garden", icon: Trees },
  { id: "mountainView", label: "Mountain View", icon: Mountain },
  { id: "petFriendly", label: "Pet Friendly", icon: PawPrint },
  { id: "accessible", label: "Accessible", icon: Accessibility },
  { id: "seniorFriendly", label: "Senior Citizen Friendly", icon: HandHeart },
  { id: "vernacularArchitecture", label: "Vernacular Architecture", icon: Landmark },
  { id: "authenticFood", label: "Authentic Himachali Food", icon: ChefHat },
  { id: "lobbyLounge", label: "Lobby/Lounge Area", icon: Sofa },
  { id: "cctv", label: "CCTV Surveillance", icon: Video },
  { id: "fireSafety", label: "Fire Safety Equipment", icon: Flame },
];

const MANDATORY_AMENITY_IDS = new Set(["cctv", "fireSafety"]);

// Fee structure as per ANNEXURE-I (location-based)
const FEE_STRUCTURE = {
  diamond: { mc: 18000, tcp: 12000, gp: 10000 },
  gold: { mc: 12000, tcp: 8000, gp: 6000 },
  silver: { mc: 8000, tcp: 5000, gp: 3000 },
};

// Room rate thresholds for categories (as per official document)
const ROOM_RATE_THRESHOLDS = {
  diamond: { min: 10001, label: "Above ₹10,000 per room per day" },
  gold: { min: 3000, max: 10000, label: "₹3,000 – ₹10,000 per room per day" },
  silver: { max: 3000, label: "Less than ₹3,000 per room per day" },
};

// Step configuration for progress tracking
const STEP_CONFIG = [
  {
    id: 1,
    label: "Property Details",
    shortLabel: "Property",
    icon: Home,
    requiredFields: ["propertyName", "projectType", "address", "district", "tehsil", "pincode", "locationType"],
  },
  {
    id: 2,
    label: "Owner Information",
    shortLabel: "Owner Info",
    icon: UserIcon,
    requiredFields: [
      "ownerFirstName",
      "ownerLastName",
      "ownerName",
      "ownerMobile",
      "ownerEmail",
      "ownerAadhaar",
      "ownerGender",
      "propertyOwnership",
    ],
  },
  {
    id: 3,
    label: "Rooms & Category",
    shortLabel: "Rooms",
    icon: Bed,
    requiredFields: ["category", "proposedRoomRate", "attachedWashrooms"],
  },
  {
    id: 4,
    label: "Distances & Areas",
    shortLabel: "Distances",
    icon: MapPin,
    requiredFields: ["distanceAirport", "distanceRailway", "distanceCityCenter", "distanceShopping", "distanceBusStand"],
  },
  {
    id: 5,
    label: "Documents Upload",
    shortLabel: "Documents",
    icon: FileText,
    requiredFields: ["revenuePapers", "affidavitSection29", "undertakingFormC", "propertyPhotos"],
  },
  {
    id: 6,
    label: "Amenities & Review",
    shortLabel: "Review",
    icon: Eye,
    requiredFields: [], // Final review page
  },
];

export default function NewApplication() {
  const [, setLocation] = useLocation();
  const goToProfile = () => setLocation("/profile");
  const renderProfileManagedDescription = (fieldLabel?: string) => (
    <FormDescription>
      {fieldLabel ? `${fieldLabel} ` : "This information "}
      is managed from{" "}
      <Button
        type="button"
        variant="ghost"
        className="h-auto px-0 text-primary"
        onClick={goToProfile}
      >
        My Profile
      </Button>
      .
    </FormDescription>
  );
  const { toast } = useToast();
  const { data: uploadPolicyData } = useQuery<UploadPolicy>({
    queryKey: ["/api/settings/upload-policy"],
    staleTime: 5 * 60 * 1000,
  });
  const uploadPolicy = uploadPolicyData ?? DEFAULT_UPLOAD_POLICY;

  const { data: categoryEnforcementSetting } = useQuery<CategoryEnforcementSetting>({
    queryKey: ["/api/settings/category-enforcement"],
    staleTime: 5 * 60 * 1000,
  });
  const { data: roomCalcModeSettingData } = useQuery<RoomCalcModeSetting>({
    queryKey: ["/api/settings/room-calc-mode"],
    staleTime: 5 * 60 * 1000,
  });
  const { data: roomRateBandsData } = useQuery<CategoryRateBands>({
    queryKey: ["/api/settings/room-rate-bands"],
    staleTime: 5 * 60 * 1000,
  });
  // Payment workflow setting (upfront vs on_approval)
  const { data: paymentWorkflowData } = useQuery<{ workflow: "upfront" | "on_approval" }>({
    queryKey: ["/api/public/settings/payment-workflow"],
    staleTime: 5 * 60 * 1000,
  });
  const isUpfrontPayment = paymentWorkflowData?.workflow === "upfront";
  const { data: activeExistingOwner } = useQuery<{ application: { id: string } | null }>({
    queryKey: ["/api/existing-owners/active"],
    staleTime: 30 * 1000,
  });
  // Get draft ID and correction ID from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const draftIdFromUrl = searchParams.get("draft");
  const correctionIdFromUrl = searchParams.get("application");
  const [draftId, setDraftId] = useState<string | null>(draftIdFromUrl);
  const [correctionId, setCorrectionId] = useState<string | null>(correctionIdFromUrl);
  const isCategoryEnforced =
    categoryEnforcementSetting?.enforce ?? DEFAULT_CATEGORY_ENFORCEMENT.enforce;
  const lockToRecommendedCategory =
    categoryEnforcementSetting?.lockToRecommended ??
    DEFAULT_CATEGORY_ENFORCEMENT.lockToRecommended;
  const categoryRateBands = roomRateBandsData ?? DEFAULT_CATEGORY_RATE_BANDS;
  const maxTotalUploadBytes = uploadPolicy.totalPerApplicationMB * 1024 * 1024;
  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1); // Track highest step visited
  const [selectedAmenities, setSelectedAmenities] = useState<Record<string, boolean>>({
    cctv: false,
    fireSafety: false,
  });
  const [selectedAttractions, setSelectedAttractions] = useState<Record<string, boolean>>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, UploadedFileMetadata[]>>({
    revenuePapers: [],
    affidavitSection29: [],
    undertakingFormC: [],
    commercialElectricityBill: [],
    commercialWaterBill: [],
  });
  const [propertyPhotos, setPropertyPhotos] = useState<UploadedFileMetadata[]>([]);
  const [additionalDocuments, setAdditionalDocuments] = useState<UploadedFileMetadata[]>([]);
  const totalSteps = 6;
  const guardrailToastShownRef = useRef(false);

  useEffect(() => {
    if (activeExistingOwner?.application) {
      // If user explicitly opened a draft/correction, don't auto-redirect to the detail view
      if (draftIdFromUrl || correctionIdFromUrl) {
        return;
      }
      setLocation(`/applications/${activeExistingOwner.application.id}`);
    }
  }, [activeExistingOwner, correctionIdFromUrl, draftIdFromUrl, setLocation]);
  const [showPreview, setShowPreview] = useState(false);
  const [correctionAcknowledged, setCorrectionAcknowledged] = useState(false);
  const [type2Rows, setType2RowsBase] = useState<Type2Row[]>(() =>
    enforceRoomAndBedLimits([makeEmptyType2Row("single")]),
  );
  const setType2RowsSafe = useCallback(
    (updater: (rows: Type2Row[]) => Type2Row[]) => setType2RowsBase((rows) => enforceRoomAndBedLimits(updater(rows))),
    [],
  );
  const [syncAttachedBaths, setSyncAttachedBaths] = useState(true);
  const derivedRoomCalcMode = roomCalcModeSettingData?.mode ?? DEFAULT_ROOM_CALC_MODE.mode;
  const [roomCalcMode, setRoomCalcMode] = useState<RoomCalculationMode>(derivedRoomCalcMode);
  const [areaConverter, setAreaConverter] = useState<{ rowId: string | null; open: boolean }>({
    rowId: null,
    open: false,
  });
  const [areaInputs, setAreaInputs] = useState<{ unit: AreaUnit; value: string }>({ unit: "sqm", value: "" });
  const areaConversion = useMemo(() => {
    const numericValue = Number(areaInputs.value) || 0;
    const factor = AREA_CONVERSION_FACTORS[areaInputs.unit];
    const sqm = numericValue * factor;
    return {
      sqm,
      sqft: sqm * SQM_TO_SQFT,
    };
  }, [areaInputs]);
  const openAreaConverter = (rowId: string) => {
    setAreaInputs({ unit: "sqm", value: "" });
    setAreaConverter({ rowId, open: true });
  };
  const closeAreaConverter = () => setAreaConverter({ rowId: null, open: false });
  useEffect(() => {
    setRoomCalcMode(derivedRoomCalcMode);
  }, [derivedRoomCalcMode]);
  useEffect(() => {
    setType2RowsSafe((rows) =>
      rows.map((row) => {
        if (roomCalcMode === "direct") {
          const resolvedRate = coerceNumber(row.customRate, undefined);
          return {
            ...row,
            customRate: resolvedRate && resolvedRate > 0 ? resolvedRate : "",
          };
        }
        const candidate = coerceNumber(row.customRate, 0);
        return {
          ...row,
          tariffBucket: rateToBucket(candidate) ?? row.tariffBucket,
        };
      }),
    );
  }, [roomCalcMode, setType2RowsSafe]);

  const [, navigate] = useLocation();
  const isCorrectionMode = Boolean(correctionId);
  useEffect(() => {
    if (!isCorrectionMode) {
      setCorrectionAcknowledged(false);
    }
  }, [isCorrectionMode]);

  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const defaultOwnerNameParts = splitFullName(userData?.user?.fullName || "");

  const form = useForm<ApplicationForm>({
    // No resolver - validation happens manually on next/submit to allow draft saves
    defaultValues: {
      propertyName: "",
      address: "",
      district: "",
      pincode: PINCODE_PREFIX,
      locationType: "mc" as LocationType,
      telephone: "",
      tehsil: "",
      tehsilOther: "",
      gramPanchayat: "",
      urbanBody: "",
      ward: "",
      ownerEmail: userData?.user?.email || "",
      ownerMobile: userData?.user?.mobile || "",
      ownerName: userData?.user?.fullName || "",
      ownerFirstName: defaultOwnerNameParts.firstName,
      ownerLastName: defaultOwnerNameParts.lastName,
      ownerAadhaar: userData?.user?.aadhaarNumber || "",
      ownerGender: normalizeGender((userData?.user as any)?.gender) as "male" | "female" | "other",
      propertyOwnership: "owned",
      category: "silver",
      proposedRoomRate: 0,
      singleBedRoomRate: 0,
      doubleBedRoomRate: 0,
      familySuiteRate: 0,
      projectType: "new_project",
      propertyArea: 0,
      singleBedRooms: 0,
      singleBedBeds: 1,
      singleBedRoomSize: undefined,
      doubleBedRooms: 0,
      doubleBedBeds: 2,
      doubleBedRoomSize: undefined,
      familySuites: 0,
      familySuiteBeds: 4,
      familySuiteSize: undefined,
      attachedWashrooms: 1,
      gstin: "",
      distanceAirport: undefined,
      distanceRailway: undefined,
      distanceCityCenter: undefined,
      distanceShopping: undefined,
      distanceBusStand: undefined,
      lobbyArea: undefined,
      diningArea: undefined,
      parkingArea: "",
      ecoFriendlyFacilities: "",
      differentlyAbledFacilities: "",
      fireEquipmentDetails: "",
      certificateValidityYears: "1",
      nearestHospital: "",
    },
  });

  const { data: applicationsData } = useQuery<{ applications: HomestayApplication[] }>({
    queryKey: ["/api/applications"],
    enabled: !!userData?.user,
    staleTime: 30_000,
  });

  const [cancellationConfirmed, setCancellationConfirmed] = useState(false);
  const [deleteRoomsConfirmed, setDeleteRoomsConfirmed] = useState(false);

  useEffect(() => {
    if (isCorrectionMode) {
      return;
    }
    // If user explicitly opened a draft or correction via URL, don't override navigation
    if (draftIdFromUrl || correctionIdFromUrl) {
      return;
    }
    if (!applicationsData?.applications) return;
    const apps = applicationsData.applications;
    if (apps.length === 0) {
      return;
    }

    const draftApplication = apps.find((app) => app.status === "draft");
    if (draftApplication) {
      if (!draftId || draftId !== draftApplication.id) {
        const url = new URL(window.location.href);
        url.searchParams.set("draft", draftApplication.id);
        window.history.replaceState(null, "", url.pathname + url.search);
        setDraftId(draftApplication.id);
      }
      return;
    }

    const activeApplication = apps[0];
    if (!guardrailToastShownRef.current) {
      guardrailToastShownRef.current = true;
      toast({
        title: "Application already in progress",
        description: "You already have an application in process. You’ll be redirected to continue it.",
      });
    }
    setLocation(`/applications/${activeApplication.id}`);
  }, [applicationsData, correctionIdFromUrl, draftId, draftIdFromUrl, setLocation, toast, isCorrectionMode]);

  // Fetch user profile for auto-population
  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    enabled: !!userData?.user,
    retry: false,
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      return res.json();
    },
  });

  // Load draft application if resuming
  const [draftApplication, setDraftApplication] = useState<HomestayApplication | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const draftIdToLoad = draftId ?? draftIdFromUrl ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!draftIdToLoad) {
      setDraftApplication(null);
      return;
    }
    setIsDraftLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/applications/${draftIdToLoad}`, {
          credentials: "include",
        });
        if (res.status === 401) {
          if (!cancelled) {
            setDraftApplication(null);
          }
          return;
        }
        if (!res.ok) {
          const text = (await res.text()) || res.statusText;
          throw new Error(text);
        }
        const data = await res.json();
        if (!cancelled) {
          setDraftApplication(data?.application ?? null);
        }
      } catch (error) {
        console.error("[draft-load]", error);
        if (!cancelled) {
          setDraftApplication(null);
        }
      } finally {
        if (!cancelled) {
          setIsDraftLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftIdToLoad]);

  const { data: correctionData } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", correctionIdFromUrl],
    enabled: !!correctionIdFromUrl,
  });

  const activeDraftApplication = draftApplication;
  const activeCorrectionApplication = correctionData?.application ?? null;
  const activeHydratedApplication = activeDraftApplication ?? (isCorrectionMode ? activeCorrectionApplication : null);
  const activeApplicationKind = (activeHydratedApplication?.applicationKind as ApplicationKind | undefined) ?? "new_registration";
  const isServiceDraft = Boolean(activeDraftApplication && isServiceApplication(activeApplicationKind));
  const serviceContext = (activeDraftApplication?.serviceContext ?? null) as ApplicationServiceContext | null;
  const parentApplicationNumber = activeDraftApplication?.parentApplicationNumber ?? null;
  const parentApplicationId = activeDraftApplication?.parentApplicationId ?? null;
  const parentCertificateNumber = activeDraftApplication?.parentCertificateNumber ?? activeDraftApplication?.certificateNumber ?? null;
  const inheritedCertificateExpiry = activeDraftApplication?.inheritedCertificateValidUpto ?? activeDraftApplication?.certificateExpiryDate ?? null;
  const requestedRooms = serviceContext?.requestedRooms;
  const requestedRoomDelta = serviceContext?.requestedRoomDelta;
  const serviceNote = activeDraftApplication?.serviceNotes;
  const shouldLockPropertyDetails = isServiceDraft;

  // Helper: Is this a Legacy RC application in correction mode?
  // Legacy RC apps use simplified flow - only Documents step with supporting docs
  const isLegacyRCCorrection = isCorrectionMode &&
    (activeHydratedApplication?.applicationNumber?.startsWith('LG-HS-') ?? false);

  // Fetch parent application details if needed (e.g. for Change Category upgrades)
  const { data: parentApplication } = useQuery<{ application: HomestayApplication }, Error, HomestayApplication>({
    queryKey: [`/api/applications/${parentApplicationId}`],
    enabled: !!parentApplicationId && activeApplicationKind === 'change_category',
    staleTime: 5 * 60 * 1000,
    select: (data) => data.application, // Extract from { application: ... } wrapper
  });

  // Auto-navigate to Documents (Step 5) for corrections OR if no documents uploaded
  const hasAutoNavigatedToDocuments = useRef(false);
  const hasValidatedCorrectionStatus = useRef(false);

  // Validate that application is actually in a correction-required status
  const CORRECTION_REQUIRED_STATUSES = ['sent_back_for_corrections', 'reverted_to_applicant', 'reverted_by_dtdo', 'objection_raised'];

  useEffect(() => {
    if (!isCorrectionMode || !activeCorrectionApplication || hasValidatedCorrectionStatus.current) {
      return;
    }
    hasValidatedCorrectionStatus.current = true;

    const status = activeCorrectionApplication.status ?? '';
    if (!CORRECTION_REQUIRED_STATUSES.includes(status)) {
      // Application is not in a correction-required status - redirect to detail view
      toast({
        title: "Cannot edit this application",
        description: "This application is not awaiting corrections.",
        variant: "destructive",
      });
      navigate(`/applications/${activeCorrectionApplication.id}`);
      return;
    }
  }, [isCorrectionMode, activeCorrectionApplication, navigate, toast]);

  useEffect(() => {
    // Corrections mode: always go to documents step when data loads
    if (isCorrectionMode && activeCorrectionApplication && !hasAutoNavigatedToDocuments.current) {
      // Only navigate if status is valid for corrections
      const status = activeCorrectionApplication.status ?? '';
      if (!CORRECTION_REQUIRED_STATUSES.includes(status)) {
        return;
      }
      hasAutoNavigatedToDocuments.current = true;
      setStep(5);
      setMaxStepReached(5);
      return;
    }

    // Service Request auto-navigation is now handled in the restoration effect (line 1828+)
    // to prevent race conditions with initial hydration.

    // Draft/submitted without documents: go to documents step so owner can upload
    // (Note: We skip this for add_rooms and cancellation above to ensure they land on the correct step)
    if (activeDraftApplication && !isCorrectionMode && step === 1 && !hasAutoNavigatedToDocuments.current && activeApplicationKind !== 'cancel_certificate') {
      const docs = activeDraftApplication.documents as unknown[] | null;
      const hasDocuments = Array.isArray(docs) && docs.length > 0;
      if (!hasDocuments) {
        hasAutoNavigatedToDocuments.current = true;
        setStep(5);
        setMaxStepReached(5);
      }
    }
  }, [isCorrectionMode, activeCorrectionApplication, activeDraftApplication, step, activeApplicationKind]);

  useEffect(() => {
    if (!activeDraftApplication) {
      return;
    }
    const currentTehsilValue = form.getValues("tehsil");
    const currentDistrictValue = form.getValues("district");
    if (!currentDistrictValue && activeDraftApplication.district) {
      form.setValue("district", activeDraftApplication.district, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
    if (!currentTehsilValue && (activeDraftApplication.tehsil || activeDraftApplication.tehsilOther)) {
      form.setValue("tehsil", activeDraftApplication.tehsil || "__other", {
        shouldDirty: false,
        shouldValidate: false,
      });
      form.setValue("tehsilOther", activeDraftApplication.tehsilOther || "", {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [activeDraftApplication, form]);


  const buildType2RowsFromForm = useCallback((): Type2Row[] => {
    const rows: Type2Row[] = [];
    ROOM_TYPE_OPTIONS.forEach((option) => {
      const config = ROOM_TYPE_CONFIG[option.value];
      const qty = Number(form.getValues(config.roomsField)) || 0;
      const rate = Number(form.getValues(config.rateField)) || 0;
      const directRate = rate > 0 ? rate : "";
      const bedsPerRoomValue =
        coerceNumber(form.getValues(config.bedsField), config.defaultBeds) ?? config.defaultBeds;
      const normalizedBeds = Math.max(1, Math.min(bedsPerRoomValue, MAX_BEDS_PER_ROOM));
      const areaValue = form.getValues(config.sizeField);
      const areaNumber =
        typeof areaValue === "number"
          ? areaValue
          : typeof areaValue === "string" && areaValue.trim()
            ? Number(areaValue)
            : "";
      if (qty > 0 || rate > 0 || (typeof areaNumber === "number" && areaNumber > 0)) {
        rows.push({
          id: nanoid(6),
          roomType: option.value as RoomTypeOption,
          quantity: qty,
          tariffBucket: rateToBucket(rate) ?? "lt3k",
          bedsPerRoom: normalizedBeds,
          area: areaNumber,
          customRate: directRate,
        });
      }
    });
    if (rows.length === 0) {
      rows.push(makeEmptyType2Row("single"));
    }
    return rows;
  }, [form]);

  const applyType2RowsToForm = useCallback(
    (rows: Type2Row[]) => {
      form.setValue("singleBedRooms", 0);
      form.setValue("singleBedRoomRate", 0);
      form.setValue("singleBedRoomSize", undefined);
      form.setValue("singleBedBeds", ROOM_TYPE_CONFIG.single.defaultBeds);
      form.setValue("doubleBedRooms", 0);
      form.setValue("doubleBedRoomRate", 0);
      form.setValue("doubleBedRoomSize", undefined);
      form.setValue("doubleBedBeds", ROOM_TYPE_CONFIG.double.defaultBeds);
      form.setValue("familySuites", 0);
      form.setValue("familySuiteRate", 0);
      form.setValue("familySuiteSize", undefined);
      form.setValue("familySuiteBeds", ROOM_TYPE_CONFIG.suite.defaultBeds);

      rows.forEach((row) => {
        const config = ROOM_TYPE_CONFIG[row.roomType];
        form.setValue(config.roomsField, row.quantity);
        form.setValue(config.bedsField, getRowBedsPerRoom(row));
        const directRate = coerceNumber(row.customRate, undefined);
        const resolvedRate =
          roomCalcMode === "direct"
            ? directRate && directRate > 0
              ? directRate
              : undefined
            : bucketToRate(row.tariffBucket);
        form.setValue(config.rateField, resolvedRate);
        const areaValue =
          typeof row.area === "number"
            ? row.area
            : typeof row.area === "string" && row.area.trim()
              ? Number(row.area)
              : undefined;
        form.setValue(config.sizeField, areaValue);
      });
    },
    [form, roomCalcMode],
  );

  useEffect(() => {
    setType2RowsSafe(() => buildType2RowsFromForm());
  }, [buildType2RowsFromForm, setType2RowsSafe]);

  useEffect(() => {
    applyType2RowsToForm(type2Rows);
  }, [type2Rows, applyType2RowsToForm]);

  const updateType2Row = useCallback((rowId: string, updates: Partial<Type2Row>) => {
    setType2RowsSafe((rows) =>
      rows.map((row) =>
        row.id === rowId
          ? {
            ...row,
            ...updates,
            quantity:
              typeof updates.quantity === "number"
                ? Math.max(0, Math.min(updates.quantity, MAX_ROOMS_ALLOWED))
                : row.quantity,
          }
          : row,
      ),
    );
  }, [setType2RowsSafe]);

  const addType2Row = useCallback(() => {
    setType2RowsSafe((rows) => {
      if (rows.length >= ROOM_TYPE_OPTIONS.length) {
        return rows;
      }
      const newType = getUnusedRoomType(rows);
      return [...rows, makeEmptyType2Row(newType)];
    });
  }, [setType2RowsSafe]);

  const removeType2Row = useCallback((rowId: string) => {
    setType2RowsSafe((rows) => rows.filter((row) => row.id !== rowId));
  }, [setType2RowsSafe]);

  const applyAreaConversion = () => {
    if (!areaConverter.rowId || areaConversion.sqm <= 0) {
      return;
    }
    updateType2Row(areaConverter.rowId, {
      area: Number(areaConversion.sqm.toFixed(2)),
    });
    closeAreaConverter();
  };

  const resetType2Rows = useCallback(() => {
    setType2RowsSafe(() => [makeEmptyType2Row("single")]);
    setSyncAttachedBaths(true);
    applyType2RowsToForm([makeEmptyType2Row("single")]);
  }, [applyType2RowsToForm, setType2RowsSafe]);

  // Ensure location type has a sane default for fresh applications
  useEffect(() => {
    if (draftIdFromUrl || correctionIdFromUrl || activeDraftApplication) {
      return;
    }
    form.setValue("locationType", "mc", {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [draftIdFromUrl, correctionIdFromUrl, activeDraftApplication, form]);

  const category = form.watch("category");
  const isPremiumCategory = category === "gold" || category === "diamond";
  const requiresGstin = isPremiumCategory;
  const requiresCommercialUtilityProof = isPremiumCategory;
  const watchedGstin = form.watch("gstin");
  const normalizedWatchedGstin = sanitizeGstinInput(watchedGstin ?? "");
  const gstinHasValue = normalizedWatchedGstin.length > 0;
  const gstinMatchesPattern = GSTIN_REGEX.test(normalizedWatchedGstin);
  const gstinIsValid = !requiresGstin || (gstinHasValue && gstinMatchesPattern);
  const gstinBlocking = requiresGstin && !gstinIsValid;
  const locationType = (form.watch("locationType") || "mc") as LocationType;
  const resolvedLocationType = locationType as LocationType;
  const watchedDistrict = form.watch("district");
  const isHydratingDraft = useRef(false);
  const gramFieldConfig =
    locationType === "gp"
      ? {
        label: "Village / Locality (PO)",
        placeholder: "Type your village, locality, or Post Office",
        description: "Required for Gram Panchayat areas.",
        requiredMessage: "Village / locality is required for Gram Panchayat properties",
      }
      : null;

  const urbanBodyConfig =
    locationType === "mc"
      ? {
        label: "Enter City/Town (MC/Council)",
        placeholder: "e.g., Shimla, Theog",
        description: "Required for Municipal Corporation or Council applicants.",
      }
      : locationType === "tcp"
        ? {
          label: "Enter Town (TCP/SADA/NP)",
          placeholder: "e.g., Suni, Narkanda",
          description: "Required for TCP/SADA/Nagar Panchayat applicants.",
        }
        : {
          label: "Municipal Corporation / TCP / Nagar Panchayat",
          placeholder: "e.g., Shimla MC, Theog NP",
          description: "Type the name of your urban local body.",
        };

  useEffect(() => {
    if (isHydratingDraft.current) {
      return;
    }
    if (!watchedDistrict) {
      form.setValue("tehsil", "", {
        shouldDirty: false,
        shouldValidate: step >= 1,
      });
      form.setValue("tehsilOther", "", {
        shouldDirty: false,
        shouldValidate: step >= 1,
      });
      return;
    }

    const tehsilsForDistrict = getTehsilsForDistrict(watchedDistrict);
    const currentTehsil = form.getValues("tehsil");
    if (currentTehsil === "__other") {
      return;
    }

    if (tehsilsForDistrict.length === 0) {
      if (currentTehsil !== "__other") {
        form.setValue("tehsil", "__other", {
          shouldDirty: false,
          shouldValidate: step >= 1,
        });
      }
      return;
    }

    if (!currentTehsil || !tehsilsForDistrict.includes(currentTehsil)) {
      const manualTehsil = (currentTehsil || "").trim();
      if (manualTehsil) {
        form.setValue("tehsil", "__other", {
          shouldDirty: false,
          shouldValidate: step >= 1,
        });
        form.setValue("tehsilOther", manualTehsil, {
          shouldDirty: false,
          shouldValidate: step >= 1,
        });
      } else {
        form.setValue("tehsil", "", {
          shouldDirty: false,
          shouldValidate: step >= 1,
        });
        form.setValue("tehsilOther", "", {
          shouldDirty: false,
          shouldValidate: step >= 1,
        });
      }
    }
  }, [watchedDistrict, form, step]);
  const district = form.watch("district");
  const tehsil = form.watch("tehsil");
  const tehsilOther = form.watch("tehsilOther");
  const pincodeValue = form.watch("pincode");
  const ownerFirstName = form.watch("ownerFirstName");
  const ownerLastName = form.watch("ownerLastName");
  const ownerGender = form.watch("ownerGender");
  const propertyOwnership = form.watch("propertyOwnership") as "owned" | "leased" | undefined;
  const certificateValidityYears = form.watch("certificateValidityYears");
  const isLeaseBlocked = step === 2 && propertyOwnership === "leased";
  // Determine submit button label based on correction mode and payment workflow
  const submitButtonLabel = isCorrectionMode
    ? "Resubmit Application"
    : (activeApplicationKind === 'delete_rooms' || activeApplicationKind === 'cancel_certificate')
      ? "Submit Request"
      : (isUpfrontPayment ? "💳 Pay & Submit" : "Submit Application");
  const stepTopRef = useRef<HTMLDivElement | null>(null);
  const trimmedTehsilOther = tehsilOther?.trim() || "";
  const displayTehsil = tehsil === "__other" ? (trimmedTehsilOther || "—") : (tehsil || "—");
  const tehsilForRules = tehsil === "__other" ? trimmedTehsilOther : tehsil;
  const normalizedPincode = ensurePincodeWithPrefix(pincodeValue ?? PINCODE_PREFIX);
  const pincodeSuffixValue = normalizedPincode.slice(PINCODE_PREFIX.length);
  const pincodeIsValid = PINCODE_REGEX.test(normalizedPincode);
  const showPincodeHint = pincodeSuffixValue.length < PINCODE_SUFFIX_LENGTH;

  useEffect(() => {
    if (isHydratingDraft.current) {
      return;
    }
    const currentTehsilValue = form.getValues("tehsil") ?? "";
    const currentTehsilOtherValue =
      currentTehsilValue === "__other" ? form.getValues("tehsilOther") ?? "" : "";
    lastHydratedTehsil.current = {
      value: currentTehsilValue,
      other: currentTehsilOtherValue,
    };
  }, [form, tehsil, tehsilOther]);

  useEffect(() => {
    if (isHydratingDraft.current) {
      return;
    }
    if (!district) {
      if (tehsil || tehsilOther) {
        form.setValue("tehsil", "", { shouldDirty: false, shouldValidate: step >= 1 });
        form.setValue("tehsilOther", "", { shouldDirty: false, shouldValidate: step >= 1 });
      }
      return;
    }

    const tehsilOptions = getTehsilsForDistrict(district);
    const hasOptions = tehsilOptions.length > 0;

    if (tehsil === "__other") {
      if (!hasOptions) {
        return;
      }
      if (tehsilOther && tehsilOther.trim().length > 0) {
        return;
      }
      form.setValue("tehsil", "", { shouldDirty: false, shouldValidate: step >= 1 });
      form.setValue("tehsilOther", "", { shouldDirty: false, shouldValidate: step >= 1 });
      return;
    }

    if (!hasOptions) {
      if (tehsil !== "__other") {
        const manualValue = tehsil?.trim() ?? "";
        form.setValue("tehsil", "__other", { shouldDirty: false, shouldValidate: step >= 1 });
        form.setValue("tehsilOther", manualValue, { shouldDirty: false, shouldValidate: step >= 1 });
      }
      return;
    }

    if (!tehsil) {
      if (tehsilOther) {
        form.setValue("tehsilOther", "", { shouldDirty: false, shouldValidate: step >= 1 });
      }
      return;
    }

    if (!tehsilOptions.includes(tehsil)) {
      const manualTehsil = (tehsil || "").trim();
      if (manualTehsil) {
        form.setValue("tehsil", "__other", { shouldDirty: false, shouldValidate: step >= 1 });
        form.setValue("tehsilOther", manualTehsil, { shouldDirty: false, shouldValidate: step >= 1 });
      } else {
        form.setValue("tehsil", "", { shouldDirty: false, shouldValidate: step >= 1 });
        form.setValue("tehsilOther", "", { shouldDirty: false, shouldValidate: step >= 1 });
      }
      return;
    }

    if (tehsilOther) {
      form.setValue("tehsilOther", "", { shouldDirty: false, shouldValidate: step >= 1 });
    }
  }, [district, tehsil, tehsilOther, form, step]);

  useEffect(() => {
    const enforced = ensurePincodeWithPrefix(pincodeValue ?? PINCODE_PREFIX);
    if (enforced !== pincodeValue) {
      form.setValue("pincode", enforced, { shouldDirty: true, shouldValidate: step >= 1 });
    }
  }, [pincodeValue, form, step]);

  useEffect(() => {
    if (!requiresGstin) {
      form.clearErrors("gstin");
      return;
    }
    if (!gstinHasValue) {
      form.setError("gstin", {
        type: "manual",
        message: "GSTIN is required for Diamond and Gold categories",
      });
      return;
    }
    if (!gstinMatchesPattern) {
      form.setError("gstin", {
        type: "manual",
        message: "GSTIN must be exactly 15 characters (numbers and capital letters only)",
      });
      return;
    }
    form.clearErrors("gstin");
  }, [requiresGstin, gstinHasValue, gstinMatchesPattern, form]);

  useEffect(() => {
    stepTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const lastHydratedTehsil = useRef<{ value: string; other: string }>({ value: "", other: "" });

  const hydrateFormFromSource = (source: Partial<HomestayApplication> | DraftForm | null | undefined) => {
    if (!source) return;
    const defaults = form.getValues();
    const explicitFirst = (source as any).ownerFirstName as string | undefined;
    const explicitLast = (source as any).ownerLastName as string | undefined;
    const nameParts = splitFullName(source.ownerName ?? defaults.ownerName);
    const resolvedFirstName = explicitFirst ?? nameParts.firstName ?? defaults.ownerFirstName ?? "";
    const resolvedLastName = explicitLast ?? nameParts.lastName ?? defaults.ownerLastName ?? "";
    const resolvedCertificateYears =
      (source as any).certificateValidityYears !== undefined && (source as any).certificateValidityYears !== null
        ? String((source as any).certificateValidityYears)
        : defaults.certificateValidityYears;

    const rawDistrictValue =
      (source as any).district ?? defaults.district ?? "";
    const districtValue = findCanonicalMatch(
      canonicalizeInput(rawDistrictValue),
      HP_DISTRICTS,
    );
    const incomingTehsilRaw =
      (source as any).tehsil ?? defaults.tehsil ?? "";
    const incomingTehsilOtherRaw =
      (source as any).tehsilOther ?? defaults.tehsilOther ?? "";

    const tehsilOptions = districtValue
      ? getTehsilsForDistrict(districtValue)
      : [];
    const trimmedTehsil = canonicalizeInput(incomingTehsilRaw).replace(
      /^not provided$/i,
      "",
    );
    const trimmedTehsilOther = canonicalizeInput(incomingTehsilOtherRaw);
    const canonicalTehsil =
      tehsilOptions.length > 0
        ? findCanonicalMatch(trimmedTehsil, tehsilOptions)
        : trimmedTehsil;

    let resolvedTehsil: string;
    let resolvedTehsilOther: string;

    if (canonicalTehsil && tehsilOptions.includes(canonicalTehsil)) {
      resolvedTehsil = canonicalTehsil;
      resolvedTehsilOther = "";
    } else if (trimmedTehsil) {
      resolvedTehsil = "__other";
      resolvedTehsilOther = trimmedTehsil;
    } else if (trimmedTehsilOther) {
      resolvedTehsil = "__other";
      resolvedTehsilOther = trimmedTehsilOther;
    } else if (tehsilOptions.length > 0) {
      resolvedTehsil = tehsilOptions[0];
      resolvedTehsilOther = "";
    } else {
      resolvedTehsil = "";
      resolvedTehsilOther = "";
    }

    isHydratingDraft.current = true;
    lastHydratedTehsil.current = { value: resolvedTehsil, other: resolvedTehsilOther };
    form.reset({
      ...defaults,
      propertyName: source.propertyName ?? defaults.propertyName ?? "",
      address: source.address ?? defaults.address ?? "",
      district: districtValue,
      tehsil: resolvedTehsil,
      tehsilOther: resolvedTehsilOther,
      gramPanchayat: (source as any).gramPanchayat ?? defaults.gramPanchayat ?? "",
      urbanBody: (source as any).urbanBody ?? defaults.urbanBody ?? "",
      ward: (source as any).ward ?? defaults.ward ?? "",
      pincode: (source as any).pincode ?? defaults.pincode ?? "",
      locationType: ((source.locationType as "mc" | "tcp" | "gp") ?? "mc") as LocationType,
      telephone: (source as any).telephone ?? defaults.telephone ?? "",
      ownerEmail: source.ownerEmail ?? defaults.ownerEmail ?? "",
      ownerMobile: source.ownerMobile ?? defaults.ownerMobile ?? "",
      ownerName: source.ownerName ?? defaults.ownerName ?? "",
      ownerFirstName: resolvedFirstName,
      ownerLastName: resolvedLastName,
      ownerGender: normalizeGender(
        (source.ownerGender as "male" | "female" | "other") ?? defaults.ownerGender,
      ) as "male" | "female" | "other",
      ownerAadhaar: source.ownerAadhaar ?? defaults.ownerAadhaar ?? "",
      propertyOwnership: ((source as any).propertyOwnership as "owned" | "leased") ?? defaults.propertyOwnership ?? "owned",
      category: (source.category as "diamond" | "gold" | "silver") ?? defaults.category ?? "silver",
      proposedRoomRate: coerceNumber((source as any).proposedRoomRate, defaults.proposedRoomRate ?? 0) ?? 0,
      singleBedRoomRate: coerceNumber((source as any).singleBedRoomRate, defaults.singleBedRoomRate ?? 0) ?? 0,
      doubleBedRoomRate: coerceNumber((source as any).doubleBedRoomRate, defaults.doubleBedRoomRate ?? 0) ?? 0,
      familySuiteRate: coerceNumber((source as any).familySuiteRate, defaults.familySuiteRate ?? 0) ?? 0,
      projectType: (source.projectType as "new_rooms" | "new_project") ?? defaults.projectType ?? "new_project",
      propertyArea: coerceNumber((source as any).propertyArea, defaults.propertyArea ?? 0) ?? 0,
      singleBedRooms: coerceNumber((source as any).singleBedRooms, defaults.singleBedRooms ?? 0) ?? 0,
      singleBedBeds: coerceNumber((source as any).singleBedBeds, defaults.singleBedBeds ?? 1) ?? 1,
      singleBedRoomSize: coerceNumber((source as any).singleBedRoomSize),
      doubleBedRooms: coerceNumber((source as any).doubleBedRooms, defaults.doubleBedRooms ?? 0) ?? 0,
      doubleBedBeds: coerceNumber((source as any).doubleBedBeds, defaults.doubleBedBeds ?? 2) ?? 2,
      doubleBedRoomSize: coerceNumber((source as any).doubleBedRoomSize),
      familySuites: coerceNumber((source as any).familySuites, defaults.familySuites ?? 0) ?? 0,
      familySuiteBeds: coerceNumber((source as any).familySuiteBeds, defaults.familySuiteBeds ?? 4) ?? 4,
      familySuiteSize: coerceNumber((source as any).familySuiteSize),
      attachedWashrooms: coerceNumber((source as any).attachedWashrooms, defaults.attachedWashrooms ?? 0) ?? 0,
      gstin: (source as any).gstin ?? defaults.gstin ?? "",
      distanceAirport: normalizePositiveNumber((source as any).distanceAirport),
      distanceRailway: normalizePositiveNumber((source as any).distanceRailway),
      distanceCityCenter: normalizePositiveNumber((source as any).distanceCityCenter),
      distanceShopping: normalizePositiveNumber((source as any).distanceShopping),
      distanceBusStand: normalizePositiveNumber((source as any).distanceBusStand),
      lobbyArea: normalizePositiveNumber((source as any).lobbyArea),
      diningArea: normalizePositiveNumber((source as any).diningArea),
      parkingArea: (source as any).parkingArea ?? defaults.parkingArea ?? "",
      ecoFriendlyFacilities: (source as any).ecoFriendlyFacilities ?? defaults.ecoFriendlyFacilities ?? "",
      differentlyAbledFacilities: (source as any).differentlyAbledFacilities ?? defaults.differentlyAbledFacilities ?? "",
      fireEquipmentDetails: (source as any).fireEquipmentDetails ?? defaults.fireEquipmentDetails ?? "",
      certificateValidityYears: (resolvedCertificateYears === "3" ? "3" : "1"),
      nearestHospital: (source as any).nearestHospital ?? defaults.nearestHospital ?? "",
    });

    const amenitiesSource = (source as any).amenities;
    if (amenitiesSource) {
      try {
        const parsedAmenities =
          typeof amenitiesSource === "string" ? JSON.parse(amenitiesSource) : amenitiesSource;
        setSelectedAmenities(parsedAmenities || {});
      } catch {
        setSelectedAmenities({});
      }
    }

    // Load nearby attractions from saved data
    const attractionsSource = (source as any).nearbyAttractions;
    if (attractionsSource) {
      try {
        const parsedAttractions =
          typeof attractionsSource === "string" ? JSON.parse(attractionsSource) : attractionsSource;
        setSelectedAttractions(parsedAttractions || {});
      } catch {
        setSelectedAttractions({});
      }
    }

    const documentsSource = Array.isArray((source as any).documents) ? (source as any).documents : [];
    if (documentsSource.length > 0) {
      const docs: Record<string, UploadedFileMetadata[]> = {
        revenuePapers: [],
        affidavitSection29: [],
        undertakingFormC: [],
        commercialElectricityBill: [],
        commercialWaterBill: [],
      };
      const photos: UploadedFileMetadata[] = [];
      documentsSource.forEach((doc: any) => {
        const base: UploadedFileMetadata = {
          id: doc.id,
          filePath: doc.fileUrl || doc.filePath,
          fileName: doc.fileName || doc.name || "document",
          fileSize: doc.fileSize || 0,
          mimeType: doc.mimeType || doc.type || "application/octet-stream",
        };
        switch (doc.documentType) {
          case "revenue_papers":
            docs.revenuePapers.push(base);
            break;
          case "affidavit_section_29":
            docs.affidavitSection29.push(base);
            break;
          case "undertaking_form_c":
            docs.undertakingFormC.push(base);
            break;
          case "commercial_electricity_bill":
            docs.commercialElectricityBill.push(base);
            break;
          case "commercial_water_bill":
            docs.commercialWaterBill.push(base);
            break;
          case "property_photo":
            photos.push(base);
            break;
          default:
            break;
        }
      });
      setUploadedDocuments(docs);
      setPropertyPhotos(photos);
    } else {
      setUploadedDocuments({
        revenuePapers: [],
        affidavitSection29: [],
        undertakingFormC: [],
        commercialElectricityBill: [],
        commercialWaterBill: [],
      });
      setPropertyPhotos([]);
    }
    // Use a longer timeout to ensure district change watchers complete before we finalize values
    // Also re-apply location fields that may have been cleared by watchers
    const gramPanchayatValue = (source as any).gramPanchayat ?? form.getValues().gramPanchayat ?? "";
    const urbanBodyValue = (source as any).urbanBody ?? form.getValues().urbanBody ?? "";
    const wardValue = (source as any).ward ?? form.getValues().ward ?? "";
    setTimeout(() => {
      form.setValue("district", districtValue, {
        shouldDirty: false,
        shouldValidate: false,
      });
      // Re-apply tehsil and location fields after district watchers run
      setTimeout(() => {
        form.setValue("tehsil", resolvedTehsil, {
          shouldDirty: false,
          shouldValidate: false,
        });
        form.setValue("tehsilOther", resolvedTehsilOther, {
          shouldDirty: false,
          shouldValidate: false,
        });
        form.setValue("gramPanchayat", gramPanchayatValue, {
          shouldDirty: false,
          shouldValidate: false,
        });
        form.setValue("urbanBody", urbanBodyValue, {
          shouldDirty: false,
          shouldValidate: false,
        });
        form.setValue("ward", wardValue, {
          shouldDirty: false,
          shouldValidate: false,
        });
        setType2RowsSafe(() => buildType2RowsFromForm());
        isHydratingDraft.current = false;
      }, 50);
    }, 50);
  };

  const buildDocumentsPayload = () => {
    const normalize = (files: UploadedFileMetadata[], type: string) =>
      files.map((file) => ({
        id: file.id || generateClientId(),
        fileName: file.fileName,
        filePath: file.filePath,
        fileUrl: file.filePath,
        documentType: type,
        fileSize: file.fileSize ?? 0,
        mimeType: file.mimeType || "application/octet-stream",
        name: file.fileName,
        type,
        url: file.filePath,
      }));

    return [
      ...normalize(uploadedDocuments.revenuePapers, "revenue_papers"),
      ...normalize(uploadedDocuments.affidavitSection29, "affidavit_section_29"),
      ...normalize(uploadedDocuments.undertakingFormC, "undertaking_form_c"),
      ...normalize(uploadedDocuments.commercialElectricityBill, "commercial_electricity_bill"),
      ...normalize(uploadedDocuments.commercialWaterBill, "commercial_water_bill"),
      ...normalize(propertyPhotos, "property_photo"),
    ];
  };

  useEffect(() => {
    const normalizedFirst = sanitizeNamePart(ownerFirstName || "").trim();
    const normalizedLast = sanitizeNamePart(ownerLastName || "").trim();
    const combined = [normalizedFirst, normalizedLast].filter(Boolean).join(" ");
    const currentFullName = form.getValues("ownerName");

    if (combined !== currentFullName) {
      form.setValue("ownerName", combined, {
        shouldValidate: step >= 2,
        shouldDirty: Boolean(normalizedFirst || normalizedLast),
      });
    }
  }, [ownerFirstName, ownerLastName, form, step]);

  const singleBedRooms = form.watch("singleBedRooms") || 0;
  const doubleBedRooms = form.watch("doubleBedRooms") || 0;
  const familySuites = form.watch("familySuites") || 0;
  const singleBedBeds = form.watch("singleBedBeds") || 0;
  const doubleBedBeds = form.watch("doubleBedBeds") || 0;
  const familySuiteBeds = form.watch("familySuiteBeds") || 0;
  const attachedWashroomsValue = form.watch("attachedWashrooms") || 0;
  const proposedRoomRate = form.watch("proposedRoomRate") || 0;
  const singleBedRoomRate = form.watch("singleBedRoomRate") || 0;
  const doubleBedRoomRate = form.watch("doubleBedRoomRate") || 0;
  const familySuiteRate = form.watch("familySuiteRate") || 0;

  // Check for missing tariffs when rooms are configured
  const missingSingleRate = singleBedRooms > 0 && singleBedRoomRate <= 0;
  const missingDoubleRate = doubleBedRooms > 0 && doubleBedRoomRate <= 0;
  const missingSuiteRate = familySuites > 0 && familySuiteRate <= 0;
  const missingTariffs = missingSingleRate || missingDoubleRate || missingSuiteRate;

  const totalRooms = singleBedRooms + doubleBedRooms + familySuites;
  const totalBeds =
    singleBedRooms * singleBedBeds +
    doubleBedRooms * doubleBedBeds +
    familySuites * familySuiteBeds;
  const roomLimitExceeded = totalRooms > MAX_ROOMS_ALLOWED;
  const bedLimitExceeded = totalBeds > MAX_BEDS_ALLOWED;
  const bathroomsBelowRooms = totalRooms > 0 && attachedWashroomsValue < totalRooms;
  useEffect(() => {
    if (syncAttachedBaths) {
      form.setValue("attachedWashrooms", totalRooms, { shouldDirty: true });
    }
  }, [syncAttachedBaths, totalRooms, form]);

  // Calculate weighted average rate (2025 Rules - based on total revenue)
  const calculateWeightedAverageRate = (): number => {
    if (totalRooms === 0) return 0;

    const totalRevenue =
      (singleBedRooms * singleBedRoomRate) +
      (doubleBedRooms * doubleBedRoomRate) +
      (familySuites * familySuiteRate);

    return Math.round(totalRevenue / totalRooms);
  };

  // Use weighted average if per-room-type rates are set, otherwise fall back to proposedRoomRate (legacy)
  const hasPerRoomTypeRates = singleBedRoomRate > 0 || doubleBedRoomRate > 0 || familySuiteRate > 0;
  const effectiveRate = hasPerRoomTypeRates ? calculateWeightedAverageRate() : proposedRoomRate;
  const calculatedHighestRoomRate = Math.max(
    singleBedRooms > 0 ? singleBedRoomRate : 0,
    doubleBedRooms > 0 ? doubleBedRoomRate : 0,
    familySuites > 0 ? familySuiteRate : 0,
    !hasPerRoomTypeRates ? proposedRoomRate : 0
  );
  const highestRoomRate =
    totalRooms > 0
      ? calculatedHighestRoomRate > 0
        ? calculatedHighestRoomRate
        : proposedRoomRate
      : 0;
  const highestTariffBucket = highestRoomRate > 0 ? rateToBucket(highestRoomRate) : null;
  const highestTariffLabel =
    roomCalcMode === "direct"
      ? highestRoomRate > 0
        ? `${formatShortCurrency(highestRoomRate)}/night`
        : "₹0/night"
      : highestTariffBucket
        ? TARIFF_BUCKETS.find((bucket) => bucket.value === highestTariffBucket)?.label ?? "None selected"
        : "₹0/night";
  const categoryValidation =
    category && totalRooms > 0 && highestRoomRate > 0
      ? validateCategorySelection(category as CategoryType, totalRooms, highestRoomRate, categoryRateBands)
      : null;
  const categoryWarnings = categoryValidation?.warnings ?? [];
  const shouldLockCategoryWarning = lockToRecommendedCategory && categoryWarnings.length > 0;
  const resolvedCategory = (category as CategoryType) || "silver";
  const resolvedCategoryBand = categoryRateBands[resolvedCategory] ?? DEFAULT_CATEGORY_RATE_BANDS[resolvedCategory];
  const suggestedCategory = categoryValidation?.suggestedCategory;
  const type2CategoryConflict =
    roomCalcMode === "direct"
      ? type2Rows.some((row) => {
        const rate = coerceNumber(row.customRate, 0) ?? 0;
        if (rate <= 0) {
          return false;
        }
        const status = evaluateBandStatus(rate, resolvedCategoryBand);
        return status === "below" || status === "above";
      })
      : type2Rows.some((row) => {
        const bucketInfo = TARIFF_BUCKETS.find((bucket) => bucket.value === row.tariffBucket);
        if (!bucketInfo) return false;
        return CATEGORY_ORDER[resolvedCategory] < CATEGORY_ORDER[bucketInfo.minCategory];
      });
  const categoryBlocked = Boolean(
    (isCategoryEnforced && categoryValidation && !categoryValidation.isValid) ||
    type2CategoryConflict ||
    shouldLockCategoryWarning,
  );
  const safetyChecklistFailed = !selectedAmenities.cctv || !selectedAmenities.fireSafety;
  const roomGuardrailsFailed =
    isLeaseBlocked ||
    roomLimitExceeded ||
    bedLimitExceeded ||
    bathroomsBelowRooms ||
    safetyChecklistFailed ||
    missingTariffs ||
    totalRooms === 0;
  const isNextDisabled = step === 1
    ? !pincodeIsValid
    : step === 2
      ? propertyOwnership === "leased"
      : step === 3
        ? roomGuardrailsFailed || gstinBlocking || !syncAttachedBaths
        : step > 3
          ? roomGuardrailsFailed
          : false;

  // Smart category suggestion based on room count + weighted average rate
  const suggestedCategoryValue = totalRooms > 0 && highestRoomRate > 0
    ? suggestCategory(totalRooms, highestRoomRate, categoryRateBands)
    : null;

  // Auto-apply the suggested category when rent changes
  useEffect(() => {
    if (suggestedCategoryValue && suggestedCategoryValue !== category) {
      form.setValue("category", suggestedCategoryValue, { shouldDirty: true });
    }
  }, [suggestedCategoryValue, form, category]);

  const selectedAmenitiesCount = Object.values(selectedAmenities).filter(Boolean).length;
  const applicationNumber = activeHydratedApplication?.applicationNumber ?? null;

  const copyApplicationNumber = async () => {
    if (!applicationNumber) return;
    try {
      await navigator.clipboard.writeText(applicationNumber);
      toast({
        title: "Application number copied",
        description: applicationNumber,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : "Unable to copy application number",
        variant: "destructive",
      });
    }
  };

  // Load draft data into form when resuming
  useEffect(() => {
    if (!draftApplication) return;
    const draft = draftApplication;
    setDraftId(draft.id);
    hydrateFormFromSource(draft);

    const draftKind = draft.applicationKind as ApplicationKind | undefined;

    if (draft.currentPage && draft.currentPage >= 1 && draft.currentPage <= totalSteps) {
      // For service requests, ensure we don't start before the relevant step
      let targetStep = draft.currentPage;

      if ((draftKind === 'add_rooms' || draftKind === 'delete_rooms') && targetStep < 3) {
        targetStep = 3;
      } else if (draftKind === 'cancel_certificate' && targetStep < 6) {
        targetStep = 6;
      }

      setStep(targetStep);
      setMaxStepReached(targetStep);
    } else {
      // Default starting steps for new/invalid drafts
      if (draftKind === 'add_rooms' || draftKind === 'delete_rooms') {
        setStep(3);
        setMaxStepReached(3);
      } else if (draftKind === 'cancel_certificate') {
        setStep(6);
        setMaxStepReached(6);
      } else {
        setStep(1);
        setMaxStepReached(1);
      }
    }

    const isService = isServiceApplication(draftKind);
    toast({
      title: isService
        ? `${getApplicationKindLabel(draftKind)} draft ready`
        : "Draft loaded",
      description: isService
        ? "This request is linked to your approved application. Review and submit once adjustments are complete."
        : "Continue editing your application from where you left off.",
    });
  }, [draftApplication]);

  // Sync owner info from profile when resuming drafts (profile is source of truth for owner data)
  useEffect(() => {
    if (!draftApplication || !userProfile) return;

    // Apply latest profile data for owner fields
    const profileNameParts = splitFullName(userProfile.fullName || "");
    setTimeout(() => {
      form.setValue("ownerFirstName", profileNameParts.firstName || "", { shouldDirty: false });
      form.setValue("ownerLastName", profileNameParts.lastName || "", { shouldDirty: false });
      form.setValue("ownerName", userProfile.fullName || "", { shouldDirty: false });
      form.setValue("ownerMobile", userProfile.mobile || "", { shouldDirty: false });
      form.setValue("ownerEmail", userProfile.email || "", { shouldDirty: false });
      form.setValue("ownerAadhaar", userProfile.aadhaarNumber || "", { shouldDirty: false });
      form.setValue("ownerGender", normalizeGender(userProfile.gender as string) as "male" | "female" | "other", { shouldDirty: false });
    }, 150); // After draft hydration completes
  }, [draftApplication, userProfile, form]);

  // Load existing application for corrections
  useEffect(() => {
    if (!correctionData?.application) return;
    const application = correctionData.application;

    if (!isCorrectionRequiredStatus(application.status)) {
      toast({
        title: "Application not editable",
        description: "This application is no longer awaiting corrections.",
        variant: "destructive",
      });
      setLocation(`/applications/${application.id}`);
      return;
    }

    setCorrectionId(application.id);
    hydrateFormFromSource(application);
    setCorrectionAcknowledged(false);
    setDraftId(null);
    setStep(5);
    setMaxStepReached(totalSteps);

    const url = new URL(window.location.href);
    url.searchParams.set("application", application.id);
    url.searchParams.delete("draft");
    window.history.replaceState(null, "", url.pathname + url.search);

    toast({
      title: "Continue with corrections",
      description: "Review each step, update details, and resubmit when ready.",
    });
  }, [correctionData, toast, setLocation]);

  // Auto-populate owner details from user profile (only for new applications, not drafts)
  useEffect(() => {
    if (!userProfile || draftIdFromUrl || correctionIdFromUrl || form.formState.isDirty) {
      return;
    }

    const profileNameParts = splitFullName(userProfile.fullName || "");
    const profileDistrict = userProfile.district || "";
    const profileTehsil = (userProfile.tehsil || "").trim();
    const profileTehsilOptions = profileDistrict ? getTehsilsForDistrict(profileDistrict) : [];
    let defaultTehsilValue = "";
    let defaultTehsilOtherValue = "";

    if (profileTehsil && profileTehsilOptions.includes(profileTehsil)) {
      defaultTehsilValue = profileTehsil;
    } else if (profileTehsil) {
      defaultTehsilValue = "__other";
      defaultTehsilOtherValue = profileTehsil;
    } else if (profileTehsilOptions.length > 0) {
      defaultTehsilValue = profileTehsilOptions[0];
    }

    form.reset({
      propertyName: "",
      locationType: "mc" as LocationType,
      category: "silver",
      proposedRoomRate: 0,
      singleBedRoomRate: 0,
      doubleBedRoomRate: 2000,
      familySuiteRate: 0,
      projectType: "new_project",
      propertyArea: 0,
      singleBedRooms: 0,
      singleBedBeds: 1,
      singleBedRoomSize: undefined,
      doubleBedRooms: 0,
      doubleBedBeds: 2,
      doubleBedRoomSize: undefined,
      familySuites: 0,
      familySuiteBeds: 4,
      familySuiteSize: undefined,
      attachedWashrooms: 1,
      gstin: "",
      distanceAirport: undefined,
      distanceRailway: undefined,
      distanceCityCenter: undefined,
      distanceShopping: undefined,
      distanceBusStand: undefined,
      lobbyArea: undefined,
      diningArea: undefined,
      parkingArea: "",
      ecoFriendlyFacilities: "",
      differentlyAbledFacilities: "",
      fireEquipmentDetails: "",
      certificateValidityYears: "1",
      nearestHospital: "",
      ownerName: userProfile.fullName || "",
      ownerFirstName: profileNameParts.firstName || "",
      ownerLastName: profileNameParts.lastName || "",
      ownerGender: normalizeGender(userProfile.gender as string) as "male" | "female" | "other",
      ownerMobile: userProfile.mobile || "",
      ownerEmail: userProfile.email || "",
      ownerAadhaar: userProfile.aadhaarNumber || "",
      district: profileDistrict,
      tehsil: defaultTehsilValue,
      tehsilOther: defaultTehsilOtherValue,
      gramPanchayat: userProfile.gramPanchayat || "",
      urbanBody: userProfile.urbanBody || "",
      ward: userProfile.ward || "",
      address: userProfile.address || "",
      pincode: userProfile.pincode || "",
      telephone: userProfile.telephone || "",
    });
  }, [userProfile, draftIdFromUrl, correctionIdFromUrl, form]);

  // Auto-populate distances when district changes (user can override)
  useEffect(() => {
    if (district && DISTRICT_DISTANCES[district]) {
      const defaults = DISTRICT_DISTANCES[district];

      // Only auto-fill if fields are undefined (not set), allow intentional zero values
      if (form.getValues("distanceAirport") === undefined) {
        form.setValue("distanceAirport", defaults.airport);
      }
      if (form.getValues("distanceRailway") === undefined) {
        form.setValue("distanceRailway", defaults.railway);
      }
      if (form.getValues("distanceCityCenter") === undefined) {
        form.setValue("distanceCityCenter", defaults.cityCenter);
      }
      if (form.getValues("distanceShopping") === undefined) {
        form.setValue("distanceShopping", defaults.shopping);
      }
      if (form.getValues("distanceBusStand") === undefined) {
        form.setValue("distanceBusStand", defaults.busStand);
      }
    }
  }, [district]);

  useEffect(() => {
    if (step !== 1 || isHydratingDraft.current) {
      return;
    }
    if (!form.getValues("tehsil") && lastHydratedTehsil.current.value) {
      form.setValue("tehsil", lastHydratedTehsil.current.value, {
        shouldDirty: false,
        shouldValidate: true,
      });
      form.setValue("tehsilOther", lastHydratedTehsil.current.other, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [form, step]);

  const calculateFee = () => {
    // Detect Pangi sub-division (Chamba district, Pangi tehsil)
    const isPangiSubDivision = district === "Chamba" && tehsilForRules === "Pangi";

    console.log("calculateFee - activeApplicationKind:", activeApplicationKind);

    // No fee for delete_rooms or cancel_certificate
    if (activeApplicationKind === 'delete_rooms' || activeApplicationKind === 'cancel_certificate') {
      console.log("Returning zero fee due to application kind:", activeApplicationKind);
      return {
        baseFee: 0,
        totalBeforeDiscounts: 0,
        validityDiscount: 0,
        femaleOwnerDiscount: 0,
        pangiDiscount: 0,
        totalDiscount: 0,
        totalFee: 0,
        savingsAmount: 0,
        savingsPercentage: 0,
        gstAmount: 0,
        perRoomFee: 0,
      };
    }



    // Change Category: Calculate upgrade fee (difference)
    if (activeApplicationKind === 'change_category' && parentApplication?.category) {
      const feeBreakdown = calculateUpgradeFee(
        parentApplication.category,
        category as CategoryType,
        resolvedLocationType,
        parseInt(certificateValidityYears) as 1 | 3,
        (ownerGender || "male") as "male" | "female" | "other",
        isPangiSubDivision
      );

      // Also calculate old and new category fees for breakdown display
      const oldCategoryFee = calculateHomestayFee({
        category: parentApplication.category,
        locationType: resolvedLocationType,
        validityYears: parseInt(certificateValidityYears) as 1 | 3,
        ownerGender: (ownerGender || "male") as "male" | "female" | "other",
        isPangiSubDivision,
      });
      const newCategoryFee = calculateHomestayFee({
        category: category as CategoryType,
        locationType: resolvedLocationType,
        validityYears: parseInt(certificateValidityYears) as 1 | 3,
        ownerGender: (ownerGender || "male") as "male" | "female" | "other",
        isPangiSubDivision,
      });

      console.log("Calculated upgrade fee:", feeBreakdown, "old:", oldCategoryFee.finalFee, "new:", newCategoryFee.finalFee);
      return {
        baseFee: feeBreakdown.baseFee,
        totalBeforeDiscounts: feeBreakdown.totalBeforeDiscounts,
        validityDiscount: feeBreakdown.validityDiscount,
        femaleOwnerDiscount: feeBreakdown.femaleOwnerDiscount,
        pangiDiscount: feeBreakdown.pangiDiscount,
        totalDiscount: feeBreakdown.totalDiscount,
        totalFee: feeBreakdown.finalFee,
        savingsAmount: feeBreakdown.savingsAmount,
        savingsPercentage: feeBreakdown.savingsPercentage,
        gstAmount: 0,
        perRoomFee: 0,
        // Upgrade-specific info for UI breakdown
        _isUpgrade: true,
        _previousCategory: parentApplication.category,
        _previousCategoryFee: oldCategoryFee.finalFee,
        _newCategoryFee: newCategoryFee.finalFee,
        _upgradeFee: feeBreakdown.finalFee,
      };
    }

    // Use new 2025 fee calculator
    const feeBreakdown = calculateHomestayFee({
      category: category as CategoryType,
      locationType: resolvedLocationType,
      validityYears: parseInt(certificateValidityYears) as 1 | 3,
      ownerGender: (ownerGender || "male") as "male" | "female" | "other",
      isPangiSubDivision,
    });

    return {
      baseFee: feeBreakdown.baseFee,
      totalBeforeDiscounts: feeBreakdown.totalBeforeDiscounts,
      validityDiscount: feeBreakdown.validityDiscount,
      femaleOwnerDiscount: feeBreakdown.femaleOwnerDiscount,
      pangiDiscount: feeBreakdown.pangiDiscount,
      totalDiscount: feeBreakdown.totalDiscount,
      totalFee: feeBreakdown.finalFee,
      savingsAmount: feeBreakdown.savingsAmount,
      savingsPercentage: feeBreakdown.savingsPercentage,
      // Legacy fields for backward compatibility
      gstAmount: 0,
      perRoomFee: 0,
    };
  };

  // Draft save mutation - bypasses form validation to allow partial saves
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (isCorrectionMode) {
        toast({
          title: "Drafts unavailable",
          description: "Use final submission instead. Draft saving is disabled while updating an existing application.",
        });
        return null;
      }
      // Get raw form values without triggering validation
      const rawFormData = form.getValues();

      // Validate with relaxed draft schema (all fields optional)
      const validatedData = draftSchema.parse(rawFormData);

      const fees = calculateFee();
      const draftTehsilOtherTrimmed = typeof validatedData.tehsilOther === "string" ? validatedData.tehsilOther.trim() : "";
      const resolvedDraftTehsil =
        validatedData.tehsil === "__other"
          ? draftTehsilOtherTrimmed
          : (validatedData.tehsil ?? "");
      const resolvedDraftTehsilOther =
        validatedData.tehsil === "__other" ? draftTehsilOtherTrimmed : "";
      const documentsPayload = buildDocumentsPayload();
      const totalDocumentBytes = documentsPayload.reduce(
        (sum, doc) => sum + (doc.fileSize ?? 0),
        0,
      );
      if (totalDocumentBytes > maxTotalUploadBytes) {
        throw new Error(
          `Combined document size ${formatBytes(totalDocumentBytes)} exceeds ${uploadPolicy.totalPerApplicationMB} MB limit`,
        );
      }
      const payload = {
        ...validatedData,
        tehsil: resolvedDraftTehsil,
        tehsilOther: resolvedDraftTehsilOther || "",
        ownerEmail: validatedData.ownerEmail || undefined,
        amenities: selectedAmenities,
        nearbyAttractions: selectedAttractions,
        // 2025 Fee Structure
        baseFee: fees.baseFee.toString(),
        totalBeforeDiscounts: fees.totalBeforeDiscounts?.toString() || "0",
        validityDiscount: fees.validityDiscount?.toFixed(2) || "0",
        femaleOwnerDiscount: fees.femaleOwnerDiscount?.toFixed(2) || "0",
        pangiDiscount: fees.pangiDiscount?.toFixed(2) || "0",
        totalDiscount: fees.totalDiscount?.toFixed(2) || "0",
        totalFee: fees.totalFee.toFixed(2),
        // Legacy fields for backward compatibility
        perRoomFee: "0",
        gstAmount: "0",
        totalRooms,
        certificateValidityYears: parseInt(certificateValidityYears),
        isPangiSubDivision: district === "Chamba" && resolvedDraftTehsil === "Pangi",
        currentPage: step, // Save the current page/step for resume functionality
        documents: documentsPayload,
      };

      if (draftId) {
        // Update existing draft
        const response = await apiRequest("PATCH", `/api/applications/${draftId}/draft`, payload);
        return response.json();
      } else {
        // Create new draft
        const response = await fetch("/api/applications/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (response.status === 409) {
          const data = await response.json().catch(() => ({}));
          const error = new Error(data?.message || "An application already exists for this owner.");
          (error as any).status = 409;
          (error as any).data = data;
          throw error;
        }

        if (!response.ok) {
          const text = (await response.text()) || response.statusText;
          throw new Error(text);
        }

        return response.json();
      }
    },
    onSuccess: (data) => {
      if (!data?.application) {
        return;
      }
      if (!draftId) {
        setDraftId(data.application.id);
        const url = new URL(window.location.href);
        url.searchParams.set("draft", data.application.id);
        window.history.replaceState(null, "", url.pathname + url.search);
      }
      // Invalidate and refetch to ensure dashboard shows the draft immediately
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.refetchQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Draft saved!",
        description: "Your progress has been saved. You can continue anytime.",
      });
    },
    onError: (error: any) => {
      if (error?.status === 409) {
        toast({
          title: "Existing application found",
          description: error?.data?.message || "You already have an application on file. Please continue with the existing application.",
        });
        const existingId = error?.data?.existingApplicationId;
        if (existingId) {
          navigate(`/applications/${existingId}`);
        }
        return;
      }
      toast({
        title: "Failed to save draft",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const submitApplicationMutation = useMutation({
    mutationFn: async (formData: ApplicationForm) => {
      // SPECIAL CASE: Legacy RC corrections have minimal requirements
      // They only need supporting documents, no property/room validations
      const isThisLegacyRC = activeHydratedApplication?.applicationNumber?.startsWith('LG-HS-') ?? false;

      if (isCorrectionMode && isThisLegacyRC && correctionId) {
        // Simplified submission for Legacy RC corrections
        // Only send documents, the server will detect Legacy RC and route appropriately
        const documentsPayload = buildDocumentsPayload();
        const correctionPayload = {
          documents: documentsPayload,
        };

        const response = await apiRequest("PATCH", `/api/applications/${correctionId}`, correctionPayload);
        return response.json();
      }

      const fees = calculateFee();
      const documentsPayload = buildDocumentsPayload();
      const totalDocumentBytes = documentsPayload.reduce(
        (sum, doc) => sum + (doc.fileSize ?? 0),
        0,
      );
      if (totalDocumentBytes > maxTotalUploadBytes) {
        throw new Error(
          `Combined document size ${formatBytes(totalDocumentBytes)} exceeds ${uploadPolicy.totalPerApplicationMB} MB limit`,
        );
      }
      const tehsilOtherTrimmed = typeof formData.tehsilOther === "string" ? formData.tehsilOther.trim() : "";
      const resolvedTehsil =
        formData.tehsil === "__other"
          ? tehsilOtherTrimmed
          : formData.tehsil;
      const normalizedTehsilOther = formData.tehsil === "__other" ? tehsilOtherTrimmed : "";

      if (!resolvedTehsil) {
        throw new Error("Tehsil is required");
      }

      const totalRoomsCount =
        (formData.singleBedRooms || 0) +
        (formData.doubleBedRooms || 0) +
        (formData.familySuites || 0);
      const totalBedsCalculated =
        (formData.singleBedRooms || 0) * (formData.singleBedBeds || 0) +
        (formData.doubleBedRooms || 0) * (formData.doubleBedBeds || 0) +
        (formData.familySuites || 0) * (formData.familySuiteBeds || 0);
      if (totalRoomsCount > MAX_ROOMS_ALLOWED) {
        throw new Error(`Total rooms cannot exceed ${MAX_ROOMS_ALLOWED}.`);
      }

      if (totalBedsCalculated > MAX_BEDS_ALLOWED) {
        throw new Error(`Total beds cannot exceed ${MAX_BEDS_ALLOWED}. Please adjust the bed counts per room type.`);
      }
      if (totalRoomsCount > 0 && (formData.attachedWashrooms || 0) < totalRoomsCount) {
        throw new Error("Ensure the number of attached washrooms is at least equal to the total rooms.");
      }

      if (isCategoryEnforced && categoryValidation && !categoryValidation.isValid) {
        throw new Error(
          categoryValidation.errors.join(" ") ||
          "Category selection must meet the required thresholds before submission.",
        );
      }

      if (isCorrectionMode && correctionId) {
        const normalizedGramPanchayat = normalizeOptionalString(formData.gramPanchayat);
        const normalizedGramPanchayatOther = normalizeOptionalString(formData.gramPanchayatOther);
        const normalizedUrbanBody = normalizeOptionalString(formData.urbanBody);
        const normalizedUrbanBodyOther = normalizeOptionalString(formData.urbanBodyOther);
        const normalizedWard = normalizeOptionalString(formData.ward);

        const correctionPayload = {
          propertyName: formData.propertyName,
          locationType: formData.locationType,
          district: formData.district,
          tehsil: resolvedTehsil,
          tehsilOther: normalizedTehsilOther || "",
          gramPanchayat: normalizedGramPanchayat ?? "",
          gramPanchayatOther: normalizedGramPanchayatOther ?? "",
          urbanBody: normalizedUrbanBody ?? "",
          urbanBodyOther: normalizedUrbanBodyOther ?? "",
          ward: normalizedWard ?? "",
          address: formData.address,
          pincode: formData.pincode,
          telephone: normalizeOptionalString(formData.telephone) ?? undefined,
          ownerName: formData.ownerName,
          ownerFirstName: formData.ownerFirstName,
          ownerLastName: formData.ownerLastName,
          ownerGender: formData.ownerGender,
          ownerMobile: formData.ownerMobile,
          ownerEmail: normalizeOptionalString(formData.ownerEmail) ?? undefined,
          ownerAadhaar: formData.ownerAadhaar,
          propertyOwnership: formData.propertyOwnership,
          category: formData.category,
          proposedRoomRate: formData.proposedRoomRate,
          singleBedRoomRate: formData.singleBedRoomRate,
          doubleBedRoomRate: formData.doubleBedRoomRate,
          familySuiteRate: formData.familySuiteRate,
          projectType: formData.projectType,
          propertyArea: formData.propertyArea,
          singleBedRooms: formData.singleBedRooms,
          singleBedBeds: formData.singleBedBeds,
          singleBedRoomSize: formData.singleBedRoomSize,
          doubleBedRooms: formData.doubleBedRooms,
          doubleBedBeds: formData.doubleBedBeds,
          doubleBedRoomSize: formData.doubleBedRoomSize,
          familySuites: formData.familySuites,
          familySuiteBeds: formData.familySuiteBeds,
          familySuiteSize: formData.familySuiteSize,
          attachedWashrooms: formData.attachedWashrooms,
          gstin: normalizeOptionalString(formData.gstin) ?? undefined,
          certificateValidityYears: parseInt(certificateValidityYears),
          isPangiSubDivision: district === "Chamba" && resolvedTehsil === "Pangi",
          distanceAirport: formData.distanceAirport,
          distanceRailway: formData.distanceRailway,
          distanceCityCenter: formData.distanceCityCenter,
          distanceShopping: formData.distanceShopping,
          distanceBusStand: formData.distanceBusStand,
          lobbyArea: formData.lobbyArea,
          diningArea: formData.diningArea,
          parkingArea: normalizeOptionalString(formData.parkingArea) ?? undefined,
          ecoFriendlyFacilities: normalizeOptionalString(formData.ecoFriendlyFacilities) ?? undefined,
          differentlyAbledFacilities: normalizeOptionalString(formData.differentlyAbledFacilities) ?? undefined,
          fireEquipmentDetails: normalizeOptionalString(formData.fireEquipmentDetails) ?? undefined,
          nearestHospital: normalizeOptionalString(formData.nearestHospital) ?? undefined,
          amenities: selectedAmenities,
          nearbyAttractions: selectedAttractions,
          baseFee: fees.baseFee,
          totalBeforeDiscounts: fees.totalBeforeDiscounts,
          validityDiscount: fees.validityDiscount,
          femaleOwnerDiscount: fees.femaleOwnerDiscount,
          pangiDiscount: fees.pangiDiscount,
          totalDiscount: fees.totalDiscount,
          totalFee: fees.totalFee,
          perRoomFee: 0,
          gstAmount: 0,
          totalRooms,
          documents: documentsPayload,
        };

        const response = await apiRequest("PATCH", `/api/applications/${correctionId}`, correctionPayload);
        return response.json();
      }

      const requiresGstinSubmission = formData.category === "gold" || formData.category === "diamond";
      const sanitizedGstinValue = requiresGstinSubmission
        ? sanitizeGstinInput(formData.gstin ?? "")
        : undefined;

      const normalizedFormData = {
        ...formData,
        tehsil: resolvedTehsil,
        tehsilOther: normalizedTehsilOther || "",
        gstin: sanitizedGstinValue,
      };

      const normalizedGramPanchayat = normalizeOptionalString(formData.gramPanchayat);
      const normalizedGramPanchayatOther = normalizeOptionalString(formData.gramPanchayatOther);
      const normalizedUrbanBody = normalizeOptionalString(formData.urbanBody);
      const normalizedUrbanBodyOther = normalizeOptionalString(formData.urbanBodyOther);
      const normalizedWard = normalizeOptionalString(formData.ward);

      const payload = {
        ...normalizedFormData,
        gstin: sanitizedGstinValue,
        ownerEmail: normalizeOptionalString(formData.ownerEmail) || undefined,
        telephone: normalizeOptionalString(formData.telephone) || undefined,
        gramPanchayat: normalizedGramPanchayat ?? undefined,
        gramPanchayatOther: normalizedGramPanchayatOther ?? undefined,
        urbanBody: normalizedUrbanBody ?? undefined,
        urbanBodyOther: normalizedUrbanBodyOther ?? undefined,
        ward: normalizedWard ?? undefined,
        propertyOwnership: formData.propertyOwnership,
        parkingArea: normalizeOptionalString(formData.parkingArea) || undefined,
        ecoFriendlyFacilities: normalizeOptionalString(formData.ecoFriendlyFacilities) || undefined,
        differentlyAbledFacilities: normalizeOptionalString(formData.differentlyAbledFacilities) || undefined,
        fireEquipmentDetails: normalizeOptionalString(formData.fireEquipmentDetails) || undefined,
        nearestHospital: normalizeOptionalString(formData.nearestHospital) || undefined,
        amenities: selectedAmenities,
        nearbyAttractions: selectedAttractions,
        baseFee: fees.baseFee.toString(),
        totalBeforeDiscounts: fees.totalBeforeDiscounts?.toString() || "0",
        validityDiscount: fees.validityDiscount?.toFixed(2) || "0",
        femaleOwnerDiscount: fees.femaleOwnerDiscount?.toFixed(2) || "0",
        pangiDiscount: fees.pangiDiscount?.toFixed(2) || "0",
        totalDiscount: fees.totalDiscount?.toFixed(2) || "0",
        totalFee: fees.totalFee.toFixed(2),
        perRoomFee: "0",
        gstAmount: "0",
        totalRooms,
        certificateValidityYears: parseInt(certificateValidityYears),
        isPangiSubDivision: district === "Chamba" && resolvedTehsil === "Pangi",
        status: "submitted",
        submittedAt: new Date().toISOString(),
        documents: documentsPayload,
      };

      const response = await apiRequest("POST", "/api/applications", payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: isCorrectionMode ? "Application resubmitted successfully!" : "Application submitted successfully!",
        description: isCorrectionMode
          ? "Your corrections have been submitted for review. You will be notified of the outcome."
          : "Your homestay application has been submitted for review.",
      });
      // Always redirect to dashboard after submission/resubmission
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: isCorrectionMode ? "Failed to resubmit application" : "Failed to create application",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const enforceGstinRequirements = (options?: {
    redirectToStep3?: boolean;
    focusField?: boolean;
    showToast?: boolean;
  }) => {
    const categoryValue = form.getValues("category");
    if (categoryValue !== "gold" && categoryValue !== "diamond") {
      return true;
    }

    const gstinValue = form.getValues("gstin");
    const normalizedGstin = sanitizeGstinInput(gstinValue ?? "");

    const guideUser = () => {
      if (options?.redirectToStep3) {
        setStep(3);
      }
      if (options?.showToast) {
        toast({
          title: "GSTIN required before submission",
          description: "Fill the GSTIN on the Rooms & Category step to continue.",
        });
      }
      if (options?.focusField) {
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLInputElement>('[data-testid="input-gstin"]')
            ?.focus();
        });
      }
    };

    if (!normalizedGstin) {
      form.setError("gstin", {
        type: "manual",
        message: "GSTIN is required for Diamond and Gold categories",
      });
      guideUser();
      return false;
    }

    if (normalizedGstin.length !== 15 || !/^[0-9A-Z]{15}$/.test(normalizedGstin)) {
      form.setError("gstin", {
        type: "manual",
        message: "GSTIN must be 15 characters (numbers and capital letters only)",
      });
      guideUser();
      return false;
    }

    if (normalizedGstin !== gstinValue) {
      form.setValue("gstin", normalizedGstin, { shouldValidate: true, shouldDirty: true });
    } else {
      form.clearErrors("gstin");
    }

    return true;
  };

  const onSubmit = async (data: ApplicationForm) => {
    console.log("onSubmit called - Step:", step, "Total Steps:", totalSteps);
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);

    // Only allow submission on the final step
    if (step !== totalSteps) {
      console.warn("Form submission blocked - not on final step");
      return;
    }

    if (!enforceGstinRequirements({ redirectToStep3: true, focusField: true, showToast: true })) {
      return;
    }

    const isValid = await form.trigger(undefined, { shouldFocus: true });
    if (!isValid) {
      return;
    }

    if (isCorrectionMode && !correctionAcknowledged) {
      toast({
        title: "Confirm corrections",
        description: "Please confirm that you have addressed all issues before resubmitting.",
        variant: "destructive",
      });
      return;
    }

    // Handle upfront payment flow - redirect to payment page instead of direct submission
    if (isUpfrontPayment && !isCorrectionMode && activeApplicationKind !== 'delete_rooms' && activeApplicationKind !== 'cancel_certificate') {
      console.log("Upfront payment mode - redirecting to payment...");

      // For upfront payment, we need to save as draft first and then go to payment
      // If we have a draftId, redirect to payment page for that draft
      if (draftId) {
        toast({
          title: "Redirecting to Payment",
          description: "You will now be redirected to complete payment before submission.",
        });
        // Redirect to HimKosh payment page
        setLocation(`/applications/${draftId}/payment-himkosh?upfront=true`);
        return;
      } else {
        // No draft yet - need to save draft first then redirect
        toast({
          title: "Saving Application",
          description: "Saving your application before redirecting to payment...",
        });
        // Use save draft mutation and then redirect
        try {
          const savedDraft = await saveDraftMutation.mutateAsync(data);
          if (savedDraft?.id) {
            setLocation(`/applications/${savedDraft.id}/payment-himkosh?upfront=true`);
          }
        } catch (error) {
          console.error("Failed to save draft for payment:", error);
          toast({
            title: "Error",
            description: "Failed to save application. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }
    }

    console.log("Submitting application...");
    submitApplicationMutation.mutate(data);
  };

  const nextStep = async () => {
    // Step 1: Validate Property Details
    if (step === 1) {
      const isValid = await form.trigger([
        "propertyName",
        "address",
        "district",
        "pincode",
        "locationType"
      ]);
      if (!isValid) {
        toast({
          title: "Please complete all required fields",
          description: "Fill in all mandatory property details before proceeding",
          variant: "destructive"
        });
        return;
      }

      const selectedTehsil = form.getValues("tehsil");
      if (selectedTehsil === "__other") {
        const isOtherValid = await form.trigger("tehsilOther");
        if (!isOtherValid) {
          toast({
            title: "Enter tehsil name",
            description: "Provide the tehsil or sub-division name when using the manual option",
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Step 2: Validate Owner Information
    if (step === 2) {
      const isValid = await form.trigger([
        "ownerFirstName",
        "ownerLastName",
        "ownerName",
        "ownerMobile",
        "ownerEmail",
        "ownerAadhaar",
        "ownerGender",
        "propertyOwnership"
      ]);
      if (!isValid) {
        toast({
          title: "Please complete all required fields",
          description: "Fill in all mandatory owner information before proceeding",
          variant: "destructive"
        });
        return;
      }
    }

    // Step 3: Validate Room Details & Category
    if (step === 3) {
      const category = form.getValues("category");
      const fieldsToValidate: Array<keyof ApplicationForm> = [
        "category",
        "proposedRoomRate",
        "projectType",
        "propertyArea",
        "singleBedRooms",
        "singleBedBeds",
        "doubleBedRooms",
        "doubleBedBeds",
        "familySuites",
        "familySuiteBeds",
        "attachedWashrooms"
      ];

      // Add GSTIN validation for Diamond/Gold categories
      if (category === "diamond" || category === "gold") {
        fieldsToValidate.push("gstin");
        if (!enforceGstinRequirements({ focusField: true })) {
          return;
        }
      }

      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) {
        toast({
          title: "Please complete all required fields",
          description: "Fill in all mandatory room details before proceeding",
          variant: "destructive"
        });
        return;
      }

      // Validate total beds <= 12
      const singleRooms = form.getValues("singleBedRooms") || 0;
      const doubleRooms = form.getValues("doubleBedRooms") || 0;
      const suiteRooms = form.getValues("familySuites") || 0;
      const totalRoomsCurrent = singleRooms + doubleRooms + suiteRooms;
      if (totalRoomsCurrent > MAX_ROOMS_ALLOWED) {
        toast({
          title: "Room limit exceeded",
          description: `HP Homestay Rules permit a maximum of ${MAX_ROOMS_ALLOWED} rooms. You currently have ${totalRoomsCurrent}.`,
          variant: "destructive"
        });
        return;
      }

      const totalBeds = (singleRooms * (form.getValues("singleBedBeds") || 0)) +
        (doubleRooms * (form.getValues("doubleBedBeds") || 0)) +
        (suiteRooms * (form.getValues("familySuiteBeds") || 0));
      if (totalBeds > MAX_BEDS_ALLOWED) {
        toast({
          title: "Maximum beds exceeded",
          description: `Total beds across all room types cannot exceed ${MAX_BEDS_ALLOWED}. Please adjust the bed counts.`,
          variant: "destructive"
        });
        return;
      }



      if (!selectedAmenities.cctv || !selectedAmenities.fireSafety) {
        toast({
          title: "Mandatory safety items missing",
          description: "Install CCTV coverage and fire-safety equipment before continuing.",
          variant: "destructive",
        });
        return;
      }

      // Validate room rates are entered when rooms are configured
      const singleRate = form.getValues("singleBedRoomRate") || 0;
      const doubleRate = form.getValues("doubleBedRoomRate") || 0;
      const suiteRate = form.getValues("familySuiteRate") || 0;

      if (singleRooms > 0 && singleRate <= 0) {
        toast({
          title: "Room rate required",
          description: "Please enter the nightly rate for Single Bed rooms.",
          variant: "destructive",
        });
        return;
      }
      if (doubleRooms > 0 && doubleRate <= 0) {
        toast({
          title: "Room rate required",
          description: "Please enter the nightly rate for Double Bed rooms.",
          variant: "destructive",
        });
        return;
      }
      if (suiteRooms > 0 && suiteRate <= 0) {
        toast({
          title: "Room rate required",
          description: "Please enter the nightly rate for Family Suites.",
          variant: "destructive",
        });
        return;
      }

    }

    // Step 4: Validate Distances & Public Areas (all optional, can proceed)
    if (step === 4) {
      // No mandatory fields on this step, can proceed
    }

    // Step 5: Validate Documents (ANNEXURE-II)
    if (step === 5) {
      // Skip document validation for Legacy RC applications (only need supporting docs) and delete_rooms
      const isLegacyRC = activeHydratedApplication?.applicationNumber?.startsWith('LG-HS-') ?? false;
      const skipDocValidation = activeApplicationKind === 'delete_rooms' || isLegacyRC;

      if (!skipDocValidation) {
        const missingDocs = [];
        if (uploadedDocuments.revenuePapers.length === 0) missingDocs.push("Revenue Papers");
        if (uploadedDocuments.affidavitSection29.length === 0) missingDocs.push("Affidavit under Section 29");
        if (uploadedDocuments.undertakingFormC.length === 0) missingDocs.push("Undertaking in Form-C");
        if (requiresCommercialUtilityProof) {
          if (uploadedDocuments.commercialElectricityBill.length === 0) missingDocs.push("Commercial electricity bill");
          if (uploadedDocuments.commercialWaterBill.length === 0) missingDocs.push("Commercial water bill");
        }
        if (propertyPhotos.length < 2) missingDocs.push("Property Photos (minimum 2)");

        if (missingDocs.length > 0) {
          toast({
            title: "Required ANNEXURE-II documents missing",
            description: `Please upload: ${missingDocs.join(", ")}`,
            variant: "destructive"
          });
          return;
        }
      }
    }

    if (step < totalSteps) {
      const newStep = step + 1;
      // Auto-save draft when advancing to next step (not for correction mode)
      if (!isCorrectionMode) {
        saveDraftMutation.mutate();
      }
      setStep(newStep);
      setMaxStepReached(Math.max(maxStepReached, newStep));
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const getCategoryBadge = (cat: string) => {
    const config = {
      diamond: { label: "Diamond", variant: "default" as const },
      gold: { label: "Gold", variant: "secondary" as const },
      silver: { label: "Silver", variant: "outline" as const },
    };
    return config[cat as keyof typeof config];
  };

  if (!userData?.user) {
    return null;
  }

  const fees = calculateFee();

  const handleStepClick = (targetStep: number) => {
    if (targetStep <= maxStepReached) {
      setStep(targetStep);
    }
  };

  // Combine form data with uploaded documents for progress tracking
  const combinedFormData = {
    ...form.getValues(),
    revenuePapers: uploadedDocuments.revenuePapers,
    affidavitSection29: uploadedDocuments.affidavitSection29,
    undertakingFormC: uploadedDocuments.undertakingFormC,
    commercialElectricityBill: uploadedDocuments.commercialElectricityBill,
    commercialWaterBill: uploadedDocuments.commercialWaterBill,
    propertyPhotos: propertyPhotos,
  };
  const correctionReason =
    activeCorrectionApplication?.clarificationRequested?.trim() || null;
  const correctionRemarks =
    activeCorrectionApplication?.dtdoRemarks?.trim() ||
    activeCorrectionApplication?.daRemarks?.trim() ||
    null;
  const correctionStatusLabel = activeCorrectionApplication?.status
    ? activeCorrectionApplication.status.replace(/_/g, " ")
    : "Corrections requested";
  const correctionMessageSource = activeCorrectionApplication?.dtdoRemarks
    ? "DTDO"
    : activeCorrectionApplication?.daRemarks
      ? "DA"
      : "Review team";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {isCorrectionMode && correctionId && (
          <div className="mb-6 border border-amber-200 bg-amber-50/80 rounded-lg p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900">
                    Corrections required ({correctionStatusLabel})
                  </p>
                  <p className="text-sm text-amber-800">
                    You are updating application #{(correctionId?.slice(0, 8) || '').toUpperCase()}… We restored your previous answers so you can fix remarks quickly.
                  </p>
                  {correctionReason ? (
                    <p className="text-sm text-amber-900">
                      Action requested: <span className="font-semibold">{correctionReason}</span>
                    </p>
                  ) : null}
                  {correctionRemarks ? (
                    <p className="text-sm text-amber-800">
                      {correctionMessageSource} note: <span className="font-semibold">{correctionRemarks}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-amber-700">
                      Review each step, upload corrected documents, and resubmit to continue the approval workflow.
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-200">
                Action needed
              </Badge>
            </div>
          </div>
        )}

        {isServiceDraft && activeDraftApplication && (
          <Alert className="mb-6 border-sky-200 bg-sky-50">
            <AlertTitle className="flex items-center gap-2">
              <ApplicationKindBadge kind={activeApplicationKind} showDefault />
              {getApplicationKindLabel(activeApplicationKind)} draft
            </AlertTitle>
            <AlertDescription>
              {activeApplicationKind === "renewal"
                ? "You are renewing an approved certificate. Property and ownership details are locked to prevent accidental edits."
                : activeApplicationKind === "add_rooms"
                  ? "You are requesting to add rooms to the approved inventory. Update Step 3 to capture the additional rooms."
                  : "You are requesting to delete rooms from the approved inventory. Verify the counts below and provide the updated documents."}
            </AlertDescription>
            <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <p>
                <span className="font-medium">Linked application:</span>{" "}
                {parentApplicationNumber || "—"}
              </p>
              <p>
                <span className="font-medium">Certificate #:</span>{" "}
                {parentCertificateNumber || "—"}
              </p>
              <p>
                <span className="font-medium">Certificate valid upto:</span>{" "}
                {formatDateDisplay(inheritedCertificateExpiry)}
              </p>
              <p>
                <span className="font-medium">Current rooms:</span>{" "}
                {activeDraftApplication.totalRooms} total
              </p>
              {requestedRooms && (
                <p>
                  <span className="font-medium">Target rooms:</span>{" "}
                  {requestedRooms.total} total (S:{requestedRooms.single ?? activeDraftApplication.singleBedRooms} · D:{requestedRooms.double ?? activeDraftApplication.doubleBedRooms} · F:{requestedRooms.family ?? activeDraftApplication.familySuites})
                </p>
              )}
              {serviceContext?.renewalWindow && (
                <p>
                  <span className="font-medium">Renewal window:</span>{" "}
                  {formatDateDisplay(serviceContext.renewalWindow.start)} – {formatDateDisplay(serviceContext.renewalWindow.end)}
                </p>
              )}
              {typeof requestedRoomDelta === "number" && (
                <p>
                  <span className="font-medium">Room delta:</span>{" "}
                  {requestedRoomDelta > 0 ? `+${requestedRoomDelta}` : requestedRoomDelta}
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
              {parentApplicationId && (
                <Button variant="outline" size="sm" onClick={() => setLocation(`/applications/${parentApplicationId}`)}>
                  View approved record
                </Button>
              )}
              {serviceNote && (
                <span className="italic">
                  Note: {serviceNote}
                </span>
              )}
            </div>
          </Alert>
        )}

        {applicationNumber && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border bg-muted/40 px-4 py-3 mb-4">
            <div className="text-sm text-muted-foreground">
              Application #:{" "}
              <span className="font-semibold text-foreground">{applicationNumber}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={copyApplicationNumber}
              type="button"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
        )}

        <ApplicationStepper
          currentStep={step}
          maxStepReached={maxStepReached}
          totalSteps={totalSteps}
          formData={combinedFormData}
          onStepClick={handleStepClick}
          steps={STEP_CONFIG}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div ref={stepTopRef} />
            {step === 1 && (
              <Step1PropertyDetails
                form={form}
                step={step}
                isServiceDraft={isServiceDraft}
                watchedDistrict={watchedDistrict}
                locationType={locationType}
                pincodeSuffixValue={pincodeSuffixValue}
                showPincodeHint={showPincodeHint}
                gramFieldConfig={gramFieldConfig}
                urbanBodyConfig={urbanBodyConfig}
              />
            )}

            {step === 2 && (
              <Step2OwnerInfo
                form={form}
                ownerGender={ownerGender}
                propertyOwnership={propertyOwnership}
                goToProfile={goToProfile}
                renderProfileManagedDescription={renderProfileManagedDescription}
              />
            )}

            {step === 3 && (
              <Step3RoomsCategory
                form={form}
                category={category}
                totalRooms={totalRooms}
                totalBeds={totalBeds}
                highestTariffLabel={highestTariffLabel}
                highestRoomRate={highestRoomRate}
                categoryRateBands={categoryRateBands}
                roomCalcMode={roomCalcMode}
                type2CategoryConflict={type2CategoryConflict}
                categoryWarnings={categoryWarnings}
                lockToRecommendedCategory={lockToRecommendedCategory}
                suggestedCategory={suggestedCategory}
                type2Rows={type2Rows}
                addType2Row={addType2Row}
                removeType2Row={removeType2Row}
                updateType2Row={updateType2Row}
                resetType2Rows={resetType2Rows}
                syncAttachedBaths={syncAttachedBaths}
                setSyncAttachedBaths={setSyncAttachedBaths}
                selectedAmenities={selectedAmenities}
                setSelectedAmenities={setSelectedAmenities}
                openAreaConverter={openAreaConverter}
                resolvedCategory={resolvedCategory}
                resolvedCategoryBand={resolvedCategoryBand}
                shouldLockCategoryWarning={shouldLockCategoryWarning}
                activeApplicationKind={activeApplicationKind}
                currentCategory={parentApplication?.category}
              />
            )}

            {
              step === 4 && (
                <Step4DistancesAreas form={form} selectedAttractions={selectedAttractions} setSelectedAttractions={setSelectedAttractions} />
              )
            }

            {
              step === 5 && (
                <Step5Documents
                  uploadedDocuments={uploadedDocuments}
                  setUploadedDocuments={setUploadedDocuments}
                  propertyPhotos={propertyPhotos}
                  setPropertyPhotos={setPropertyPhotos}
                  additionalDocuments={additionalDocuments}
                  setAdditionalDocuments={setAdditionalDocuments}
                  requiresCommercialUtilityProof={requiresCommercialUtilityProof}
                  isCorrection={isCorrectionMode}
                  correctionNotes={activeCorrectionApplication?.correctionNotes || undefined}
                  applicationKind={activeApplicationKind ?? undefined}
                  isLegacyRC={activeHydratedApplication?.applicationNumber?.startsWith('LG-HS-') ?? false}
                />
              )
            }



            {
              step === 6 && activeApplicationKind === 'cancel_certificate' ? (
                <Step6CancellationReview
                  form={form}
                  cancellationConfirmed={cancellationConfirmed}
                  setCancellationConfirmed={setCancellationConfirmed}
                  activeDraftApplication={activeDraftApplication}
                />
              ) : step === 6 && activeApplicationKind === 'delete_rooms' ? (
                <Step6SimpleReview
                  form={form}
                  submitConfirmed={deleteRoomsConfirmed}
                  setSubmitConfirmed={setDeleteRoomsConfirmed}
                  activeDraftApplication={activeDraftApplication}
                  title="Confirm Room Deletion"
                  description="You are about to submit a request to remove rooms from your registered inventory. No payment is required for this action."
                  confirmationText="I confirm that I want to remove the specified rooms from my registration."
                  currentRooms={applicationsData?.applications.find(app => app.id === parentApplicationId)?.totalRooms}
                />
              ) : step === 6 ? (
                <Step6AmenitiesFees
                  form={form}
                  selectedAmenities={selectedAmenities}
                  setSelectedAmenities={setSelectedAmenities}
                  AMENITIES={AMENITIES}
                  MANDATORY_AMENITY_IDS={MANDATORY_AMENITY_IDS}
                  category={category}
                  locationType={locationType}
                  certificateValidityYears={certificateValidityYears}
                  fees={fees}
                  getCategoryBadge={getCategoryBadge}
                  LOCATION_LABEL_MAP={LOCATION_LABEL_MAP}
                  totalRooms={totalRooms}
                  activeDraftApplication={activeDraftApplication}
                  correctionId={correctionId}
                  selectedAmenitiesCount={selectedAmenitiesCount}
                  isUpgrade={activeApplicationKind === 'change_category' && !!(fees as any)._isUpgrade}
                  upgradeFeeInfo={(fees as any)._isUpgrade ? {
                    previousCategory: (fees as any)._previousCategory,
                    previousCategoryFee: (fees as any)._previousCategoryFee,
                    newCategoryFee: (fees as any)._newCategoryFee,
                    upgradeFee: (fees as any)._upgradeFee,
                  } : undefined}
                />
              ) : null
            }

            <div className="flex flex-wrap justify-between gap-4">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} data-testid="button-previous">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}

              <div className="flex-1" />

              {/* Save Draft button - only for new applications */}
              {!isCorrectionMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => saveDraftMutation.mutate()}
                  disabled={saveDraftMutation.isPending}
                  data-testid="button-save-draft"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
                </Button>
              )}

              {/* Preview button - only on final page */}
              {step === totalSteps && activeApplicationKind !== 'cancel_certificate' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  data-testid="button-preview"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Preview Application
                </Button>
              )}

              {/* Cancellation Submit Button */}
              {step === totalSteps && activeApplicationKind === 'cancel_certificate' && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!cancellationConfirmed || submitApplicationMutation.isPending}
                  onClick={() => submitApplicationMutation.mutate(form.getValues())}
                  data-testid="button-submit-cancellation"
                >
                  {submitApplicationMutation.isPending ? "Submitting..." : "Submit Cancellation Request"}
                </Button>
              )}

              {/* Legacy RC Correction Submit - on Documents step (step 5) */}
              {isLegacyRCCorrection && step === 5 && (
                <div className="w-full space-y-4">
                  <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4 text-green-900 dark:border-green-900/40 dark:bg-green-950/20">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <p className="text-lg font-bold">Ready to Resubmit</p>
                      </div>
                      <p className="text-sm">
                        Your Existing RC application is ready for resubmission. Any supporting documents uploaded will be reviewed by the verifying officer.
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                          id="legacy-rc-ack"
                          checked={correctionAcknowledged}
                          onCheckedChange={(checked) => setCorrectionAcknowledged(Boolean(checked))}
                        />
                        <label htmlFor="legacy-rc-ack" className="text-sm font-medium cursor-pointer">
                          I confirm the corrections are complete and ready for review
                        </label>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!correctionAcknowledged || submitApplicationMutation.isPending}
                    onClick={() => submitApplicationMutation.mutate(form.getValues())}
                    data-testid="button-submit-legacy-rc"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {submitApplicationMutation.isPending ? "Submitting..." : "Resubmit for Verification"}
                  </Button>
                </div>
              )}

              {isCorrectionMode && step === totalSteps && (
                <div className="w-full rounded-lg border-2 border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <p className="text-2xl font-bold">Final Confirmation Required</p>
                    </div>
                    <p className="text-sm font-medium">
                      I confirm that every issue highlighted by DA/DTDO has been fully addressed. I understand that my application may be rejected if the corrections remain unsatisfactory.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="correction-ack"
                        checked={correctionAcknowledged}
                        onCheckedChange={(checked) => setCorrectionAcknowledged(Boolean(checked))}
                      />
                      <label htmlFor="correction-ack" className="text-sm font-semibold cursor-pointer">
                        I agree and want to resubmit the application
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Next button - hidden for Legacy RC on step 5 since they submit from there */}
              {step < totalSteps && !(isLegacyRCCorrection && step === 5) ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    nextStep();
                  }}
                  disabled={isNextDisabled}
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : activeApplicationKind !== 'cancel_certificate' && !isLegacyRCCorrection && step === totalSteps && (
                <Button
                  type="submit"

                  disabled={submitApplicationMutation.isPending || (isCorrectionMode && !correctionAcknowledged) || (activeApplicationKind === 'delete_rooms' && !deleteRoomsConfirmed)}
                  data-testid="button-submit-application"
                  onClick={async () => {
                    console.log("Submit button clicked");
                    const isValid = await form.trigger();
                    console.log("Form is valid:", isValid);
                    console.log("Form errors:", form.formState.errors);

                    if (!isValid) {
                      toast({
                        title: "Form validation failed",
                        description: "Please check all fields are filled correctly.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitApplicationMutation.isPending ? "Submitting..." : submitButtonLabel}
                </Button>
              )}
            </div>
          </form >
        </Form >

        <Dialog
          open={areaConverter.open}
          onOpenChange={(open) => {
            if (!open) {
              closeAreaConverter();
            }
          }}
        >
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Convert traditional area units</DialogTitle>
              <DialogDescription>
                Approximate conversion for Kanal, Marla, and Bigha. Values are estimates; refer to your revenue records for precise measurements.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Unit</p>
                  <Select
                    value={areaInputs.unit}
                    onValueChange={(value) =>
                      setAreaInputs((prev) => ({
                        ...prev,
                        unit: value as AreaUnit,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kanal">Kanal</SelectItem>
                      <SelectItem value="marla">Marla</SelectItem>
                      <SelectItem value="bigha">Bigha</SelectItem>
                      <SelectItem value="sqft">Square feet</SelectItem>
                      <SelectItem value="sqm">Square metres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Value</p>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={areaInputs.value}
                    onChange={(event) =>
                      setAreaInputs((prev) => ({
                        ...prev,
                        value: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="rounded-lg border p-3 text-sm bg-muted/30">
                <p className="font-semibold">Converted area</p>
                {areaConversion.sqm > 0 ? (
                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="font-medium">{areaConversion.sqm.toFixed(2)}</span> sq. metres
                    </p>
                    <p className="text-muted-foreground">
                      ({areaConversion.sqft.toFixed(0)} sq. feet)
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2">Enter a value above to see the conversion.</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                1 Kanal ≈ 505.86 sq.m., 1 Marla ≈ 25.29 sq.m., 1 Bigha ≈ 802.34 sq.m. Conversions may vary slightly by district.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeAreaConverter}>
                  Cancel
                </Button>
                <Button
                  onClick={applyAreaConversion}
                  disabled={!areaConverter.rowId || areaConversion.sqm <= 0}
                >
                  Use {areaConversion.sqm > 0 ? areaConversion.sqm.toFixed(2) : "converted"} sq.m.
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Preview Dialog - Enhanced HP Tourism Branded Version */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
            {/* Header with HP Tourism branding gradient */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/70 mb-1">HP TOURISM ESERVICES</p>
                  <h2 className="text-xl font-bold">Homestay Registration Application</h2>
                  <p className="text-sm text-white/80 mt-1">Review all details before final submission</p>
                </div>
                <div className="text-right">
                  <div className="flex gap-2 justify-end mb-2">
                    <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                      {form.watch("category")?.toUpperCase() || "—"}
                    </Badge>
                    <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                      {form.watch("projectType") === "new_project" ? "New Project" : "New Rooms"}
                    </Badge>
                  </div>
                  <p className="text-lg font-semibold">{totalRooms} Rooms</p>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[calc(90vh-200px)]">
              <div className="p-6 space-y-6">
                {/* Property Snapshot */}
                <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    Property Snapshot
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Property Name</p>
                      <p className="font-semibold text-slate-800">{form.watch("propertyName") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Total Rooms</p>
                      <p className="font-semibold text-slate-800 flex items-center gap-2">
                        <Bed className="w-4 h-4 text-slate-400" />
                        {totalRooms} rooms
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Address</p>
                      <p className="font-medium text-slate-700">{form.watch("address") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">District</p>
                      <p className="font-medium text-slate-700">{form.watch("district") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Tehsil</p>
                      <p className="font-medium text-slate-700">{displayTehsil}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Village / Locality</p>
                      <p className="font-medium text-slate-700">{form.watch("gramPanchayat") || form.watch("urbanBody") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">PIN Code</p>
                      <p className="font-medium text-slate-700">{form.watch("pincode") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Location Type</p>
                      <p className="font-medium text-slate-700">{LOCATION_TYPES.find(t => t.value === form.watch("locationType"))?.label || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Owner Information */}
                <div className="rounded-xl border p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-emerald-600" />
                    Owner Information
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Owner Name</p>
                      <p className="font-semibold text-slate-800">{form.watch("ownerName") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Mobile</p>
                      <p className="font-medium text-slate-700">{form.watch("ownerMobile") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Email</p>
                      <p className="font-medium text-slate-700">{form.watch("ownerEmail") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Aadhaar</p>
                      <p className="font-medium text-slate-700">{form.watch("ownerAadhaar") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 mb-1">Ownership Type</p>
                      <p className="font-medium text-slate-700">{propertyOwnership ? OWNERSHIP_LABELS[propertyOwnership] : "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Room Details */}
                <div className="rounded-xl border p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Bed className="w-5 h-5 text-emerald-600" />
                    Room Details & Category
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{form.watch("singleBedRooms") || 0}</p>
                      <p className="text-xs text-slate-500">Single Rooms</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{form.watch("doubleBedRooms") || 0}</p>
                      <p className="text-xs text-slate-500">Double Rooms</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{form.watch("familySuites") || 0}</p>
                      <p className="text-xs text-slate-500">Family Suites</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Beds</span>
                      <span className="font-medium">{totalBeds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Attached Washrooms</span>
                      <span className="font-medium">{syncAttachedBaths ? totalRooms : 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Property Area</span>
                      <span className="font-medium">{form.watch("propertyArea") || 0} sq m</span>
                    </div>
                    {singleBedRooms > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Single Room Rate</span>
                        <span className="font-medium">₹{singleBedRoomRate}/night</span>
                      </div>
                    )}
                    {doubleBedRooms > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Double Room Rate</span>
                        <span className="font-medium">₹{doubleBedRoomRate}/night</span>
                      </div>
                    )}
                    {familySuites > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Family Suite Rate</span>
                        <span className="font-medium">₹{familySuiteRate}/night</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amenities */}
                <div className="rounded-xl border p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Selected Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES.filter(a => selectedAmenities[a.id]).map(a => (
                      <Badge key={a.id} variant="secondary" className="px-3 py-1">
                        {a.label}
                      </Badge>
                    ))}
                    {AMENITIES.filter(a => selectedAmenities[a.id]).length === 0 && (
                      <span className="text-sm text-slate-400">No amenities selected</span>
                    )}
                  </div>
                </div>

                {/* Documents Summary */}
                <div className="rounded-xl border p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Uploaded Documents
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-600">Revenue Papers</span>
                      <Badge variant={uploadedDocuments.revenuePapers.length > 0 ? "default" : "secondary"}>
                        {uploadedDocuments.revenuePapers.length} file(s)
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-600">Affidavit Section 29</span>
                      <Badge variant={uploadedDocuments.affidavitSection29.length > 0 ? "default" : "secondary"}>
                        {uploadedDocuments.affidavitSection29.length} file(s)
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-600">Undertaking Form-C</span>
                      <Badge variant={uploadedDocuments.undertakingFormC.length > 0 ? "default" : "secondary"}>
                        {uploadedDocuments.undertakingFormC.length} file(s)
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-600">Property Photos</span>
                      <Badge variant={propertyPhotos.length >= 2 ? "default" : "secondary"}>
                        {propertyPhotos.length} file(s)
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Fee Summary */}
                <div className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-emerald-600" />
                    Registration Fee
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Total Amount Payable</p>
                      <p className="text-xs text-slate-400 mt-1">As per HP Tourism Policy 2025</p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600">₹{calculateFee().totalFee.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer with close button */}
            <div className="border-t p-4 bg-slate-50 flex justify-end">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
