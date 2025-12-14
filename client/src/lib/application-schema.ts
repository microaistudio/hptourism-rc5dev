import { z } from "zod";
import { nanoid } from "nanoid";
import {
    MAX_ROOMS_ALLOWED,
    MAX_BEDS_ALLOWED,
    type CategoryType,
} from "@shared/fee-calculator";
import {
    DEFAULT_STATE,
    getDistricts,
    LOCATION_TYPE_OPTIONS,
} from "@shared/regions";
import {
    DEFAULT_CATEGORY_RATE_BANDS,
    type CategoryEnforcementSetting,
    type CategoryRateBands,
} from "@shared/appSettings";

export const HP_STATE = DEFAULT_STATE;
export const HP_DISTRICTS = getDistricts();
export { MAX_ROOMS_ALLOWED, MAX_BEDS_ALLOWED };

export const canonicalizeInput = (value?: string | null) =>
    typeof value === "string" ? value.trim() : "";

export const findCanonicalMatch = (value: string, options: string[]) => {
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

export const clampInt = (value: string) => {
    if (!value || value.trim() === "") {
        return 0;
    }
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
};

export const NON_NEGATIVE_DECIMAL = /^\d*(\.\d*)?$/;

export const clampFloat = (value: string) => {
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

export const AREA_CONVERSION_FACTORS = {
    kanal: 505.857,
    marla: 25.29285,
    bigha: 802.34,
    sqft: 0.092903,
    sqm: 1,
};
export const SQM_TO_SQFT = 10.7639;
export type AreaUnit = keyof typeof AREA_CONVERSION_FACTORS;

export const sanitizeGstinInput = (value: string) =>
    value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
export const GSTIN_REGEX = /^[0-9A-Z]{15}$/;

export const PINCODE_PREFIX = "17";
export const PINCODE_SUFFIX_LENGTH = 6 - PINCODE_PREFIX.length;
export const PINCODE_REGEX = /^[1-9]\d{5}$/;
export const sanitizePincodeSuffix = (value: string) =>
    value.replace(/[^\d]/g, "").slice(0, PINCODE_SUFFIX_LENGTH);
export const ensurePincodeWithPrefix = (value?: string) => {
    const incoming = value ?? "";
    const suffixSource = incoming.startsWith(PINCODE_PREFIX)
        ? incoming.slice(PINCODE_PREFIX.length)
        : incoming;
    return (PINCODE_PREFIX + sanitizePincodeSuffix(suffixSource)).slice(0, 6);
};

export const normalizeOptionalFloat = (value: string) => clampFloat(value);

export const LOCATION_TYPES = LOCATION_TYPE_OPTIONS;
export const LOCATION_LABEL_MAP = LOCATION_TYPE_OPTIONS.reduce(
    (acc, option) => ({ ...acc, [option.value]: option.label }),
    {} as Record<string, string>,
);

export const PROJECT_TYPE_OPTIONS = [
    { value: "new_project", label: "New Homestay Registration" },
] as const;

export const formatDateDisplay = (value?: string | Date | null) => {
    if (!value) return "—";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatDistanceDisplay = (value?: number | null) => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return `${value} km`;
    }
    return "Enter distance in KM";
};

export const coerceNumber = (value: unknown, fallback: number | undefined = undefined) => {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        return fallback;
    }
    return parsed;
};

export const normalizePositiveNumber = (value: unknown) => {
    const num = coerceNumber(value);
    if (typeof num === "number" && Number.isFinite(num) && num > 0) {
        return num;
    }
    return undefined;
};

export const GENDER_OPTIONS = [
    { value: "female", label: "Female (5% additional discount)" },
    { value: "male", label: "Male" },
];

export const normalizeGender = (value: unknown): "male" | "female" => {
    return value === "female" ? "female" : "male";
};

// District-based typical distances (user can override)
export const DISTRICT_DISTANCES: Record<string, { airport: number; railway: number; cityCenter: number; shopping: number; busStand: number }> = {};

// Strict schema for final submission - all required fields
export const OWNERSHIP_LABELS: Record<"owned" | "leased", string> = {
    owned: "Owned",
    leased: "Lease Deed",
};

export const CATEGORY_CARD_INFO: Array<{ value: CategoryType; title: string; description: string }> = [
    { value: "silver", title: "Silver", description: "Neighborhood-scale, budget stays" },
    { value: "gold", title: "Gold", description: "Premium comforts & curated experiences" },
    { value: "diamond", title: "Diamond", description: "Luxury suites with bespoke amenities" },
];

export const ROOM_TYPE_OPTIONS = [
    { value: "single", label: "Type 1 (Single)" },
    { value: "double", label: "Type 2 (Double)" },
    { value: "suite", label: "Suite" },
] as const;

export type RoomTypeOption = typeof ROOM_TYPE_OPTIONS[number]["value"];

export const MAX_BEDS_PER_ROOM = 6;

export const applicationSchema = z.object({
    // Basic property info
    propertyName: z.string().min(3, "Property name must be at least 3 characters"),
    locationType: z.enum(["mc", "tcp", "gp"]),

    // LGD Hierarchical Address
    district: z.string().min(1, "District is required"),
    tehsil: z.string().optional(),
    tehsilOther: z.string().optional().or(z.literal("")),
    gramPanchayat: z.string().optional(),
    gramPanchayatOther: z.string().optional().or(z.literal("")),
    urbanBody: z.string().optional(),
    urbanBodyOther: z.string().optional().or(z.literal("")),
    ward: z.string().optional(),
    address: z.string().min(10, "House/Building number and street required"),
    pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter valid 6-digit pincode"),

    // Contact details
    telephone: z.string().optional().or(z.literal("")),
    ownerEmail: z.string().min(1, "Email is required").email("Enter valid email"),
    ownerMobile: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile"),

    // Owner info
    ownerName: z.string().min(3, "Owner name is required"),
    ownerFirstName: z.string().min(1, "First name is required").regex(/^[A-Za-z\s'-]+$/, "First name can only contain letters"),
    ownerLastName: z.string().min(1, "Last name is required").regex(/^[A-Za-z\s'-]+$/, "Last name can only contain letters"),
    ownerGender: z.enum(["male", "female", "other"]),
    ownerAadhaar: z.string().min(1, "Aadhaar is required").regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
    propertyOwnership: z.enum(["owned", "leased"]),

    // Category & room rate
    category: z.enum(["diamond", "gold", "silver"]),
    proposedRoomRate: z.number().optional(), // Legacy field for backward compatibility

    // Per-room-type rates (2025 Rules - Form-A Certificate Requirement)
    singleBedRoomRate: z.number().min(0).optional(),
    doubleBedRoomRate: z.number().min(0).optional(),
    familySuiteRate: z.number().min(0).optional(),

    // Distance from key locations (in km)
    distanceAirport: z.number().min(0).optional(),
    distanceRailway: z.number().min(0).optional(),
    distanceCityCenter: z.number().min(0).optional(),
    distanceShopping: z.number().min(0).optional(),
    distanceBusStand: z.number().min(0).optional(),

    // Project type
    projectType: z.enum(["new_rooms", "new_project"]),

    // Property details
    propertyArea: z
        .number()
        .min(0, "Property area cannot be negative"),

    // Room configuration (single/double/suite)
    singleBedRooms: z.number().int().min(0).default(0),
    singleBedBeds: z.number().int().min(0).default(1),
    singleBedRoomSize: z.number().min(0).optional(),
    doubleBedRooms: z.number().int().min(0).default(0),
    doubleBedBeds: z.number().int().min(0).default(2),
    doubleBedRoomSize: z.number().min(0).optional(),
    familySuites: z.number().int().min(0).max(3, "Maximum 3 family suites").default(0),
    familySuiteBeds: z.number().int().min(0).default(4),
    familySuiteSize: z.number().min(0).optional(),
    attachedWashrooms: z.number().int().min(0),

    // Public areas (lobby/dining in sq ft, parking is description)
    lobbyArea: z.number().min(0).optional(),
    diningArea: z.number().min(0).optional(),
    parkingArea: z.string().optional().or(z.literal("")),

    // Additional facilities
    ecoFriendlyFacilities: z.string().optional().or(z.literal("")),
    differentlyAbledFacilities: z.string().optional().or(z.literal("")),
    fireEquipmentDetails: z.string().optional().or(z.literal("")),

    // GSTIN (mandatory for Diamond/Gold)
    gstin: z.string().optional().or(z.literal("")),

    // 2025 Rules - Certificate Validity
    certificateValidityYears: z.enum(["1", "3"]).default("1"),

    // Nearest hospital
    nearestHospital: z.string().optional().or(z.literal("")),

    // Key Location Highlights
    keyLocationHighlight1: z.string().optional().or(z.literal("")),
    keyLocationHighlight2: z.string().optional().or(z.literal("")),
});

export type ApplicationForm = z.infer<typeof applicationSchema>;

export const ROOM_TYPE_CONFIG: Record<
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

export const TARIFF_BUCKETS = [
    { value: "lt3k", label: "Less than ₹3,000/night", explanation: "Eligible for SILVER category", minRate: 0, maxRate: 2999, minCategory: "silver" as const },
    { value: "3kto10k", label: "₹3,000 – ₹10,000/night", explanation: "Requires GOLD category or higher", minRate: 3000, maxRate: 10000, minCategory: "gold" as const },
    { value: "gt10k", label: "Above ₹10,000/night", explanation: "Requires DIAMOND category", minRate: 10000, maxRate: 50000, minCategory: "diamond" as const },
];

export type TariffBucket = typeof TARIFF_BUCKETS[number]["value"];

export const CATEGORY_ORDER: Record<"silver" | "gold" | "diamond", number> = {
    silver: 1,
    gold: 2,
    diamond: 3,
};

export type Type2Row = {
    id: string;
    roomType: RoomTypeOption;
    quantity: number;
    tariffBucket: TariffBucket;
    bedsPerRoom: number;
    area?: number | "";
    areaUnit?: string;
    customRate?: number | "";
};

export type RoomCalculationMode = "buckets" | "direct";

export const makeEmptyType2Row = (roomType: RoomTypeOption): Type2Row => ({
    id: nanoid(6),
    roomType,
    quantity: 1,
    tariffBucket: "lt3k",
    bedsPerRoom: ROOM_TYPE_CONFIG[roomType].defaultBeds,
    area: "",
});

export const getUnusedRoomType = (currentRows: Type2Row[]): RoomTypeOption => {
    const used = new Set(currentRows.map((row) => row.roomType));
    const available = ROOM_TYPE_OPTIONS.find((option) => !used.has(option.value));
    return available ? (available.value as RoomTypeOption) : "single";
};

export const getRowBedsPerRoom = (row: Type2Row) => {
    if (typeof row.bedsPerRoom === "number" && row.bedsPerRoom > 0) {
        return row.bedsPerRoom;
    }
    return ROOM_TYPE_CONFIG[row.roomType].defaultBeds;
};

export const summarizeRows = (rows: Type2Row[], excludeId?: string) =>
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

export const enforceRoomAndBedLimits = (rows: Type2Row[]): Type2Row[] =>
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

export const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0 B";
    }
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[index]}`;
};

// Fully relaxed schema for draft saves - all fields optional with no constraints
export const draftSchema = z.object({
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

export type DraftForm = z.infer<typeof draftSchema>;

export const splitFullName = (fullName?: string | null) => {
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

export const sanitizeNamePart = (value: string) =>
    value.replace(/[^A-Za-z\s'-]/g, "").replace(/\s{2,}/g, " ");

export const sanitizeDigits = (value: string, maxLength?: number) => {
    let digitsOnly = value.replace(/\D/g, "");
    if (typeof maxLength === "number") {
        digitsOnly = digitsOnly.slice(0, maxLength);
    }
    return digitsOnly;
};

export const bucketToRate = (bucket: TariffBucket) => {
    const info = TARIFF_BUCKETS.find((b) => b.value === bucket);
    if (!info) return 0;
    if (info.value === "gt10k") {
        return info.minRate;
    }
    return info.maxRate;
};

export const rateToBucket = (rate?: number | null): TariffBucket | null => {
    if (typeof rate !== "number" || Number.isNaN(rate)) return null;
    if (rate <= 0) return null;
    if (rate <= 3000) return "lt3k";
    if (rate <= 10000) return "3kto10k";
    return "gt10k";
};

export const formatShortCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export const formatBandLabel = (band: { min: number; max: number | null }) => {
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

export type BandStatus = "empty" | "ok" | "below" | "above";

export const evaluateBandStatus = (rate: number, band: { min: number; max: number | null }): BandStatus => {
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

export const normalizeOptionalString = (value?: string | null) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
};
