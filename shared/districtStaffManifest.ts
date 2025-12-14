const normalizeStaffIdentifier = (value?: string | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/[.\s-]+/g, "_");
};

export type StaffRoleSlug = "dealing_assistant" | "district_tourism_officer";

export interface StaffAccountManifestEntry {
  districtLabel: string;
  ddoCode: string;
  da: {
    username: string;
    password: string;
    fullName: string;
    mobile: string;
    email: string;
  };
  dtdo: {
    username: string;
    password: string;
    fullName: string;
    mobile: string;
    email: string;
  };
}

const DISTRICT_STAFF_MANIFEST: StaffAccountManifestEntry[] = [
  {
    districtLabel: "Chamba HQ",
    ddoCode: "CHM00-532",
    da: {
      username: "da_chamba",
      password: "dacha@2025",
      fullName: "Anjali Thakur",
      mobile: "7800001001",
      email: "da.chamba@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_chamba",
      password: "dtdocha@2025",
      fullName: "Rakesh Mahajan",
      mobile: "7900001001",
      email: "dtdo.chamba@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Bharmour Sub-Division",
    ddoCode: "CHM01-001",
    da: {
      username: "da_bharmour",
      password: "dabha@2025",
      fullName: "Kunal Rana",
      mobile: "7800001002",
      email: "da.bharmour@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_bharmour",
      password: "dtdobha@2025",
      fullName: "Meera Chauhan",
      mobile: "7900001002",
      email: "dtdo.bharmour@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Shimla HQ (AC Tourism)",
    ddoCode: "CTO00-068",
    da: {
      username: "da_shimla_hq",
      password: "dashi@2025",
      fullName: "Namita Sood",
      mobile: "7800001003",
      email: "da.shimla-hq@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_shimla_hq",
      password: "dtdoshi@2025",
      fullName: "Lokesh Sharma",
      mobile: "7900001003",
      email: "dtdo.shimla-hq@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Hamirpur (serving Una)",
    ddoCode: "HMR00-053",
    da: {
      username: "da_hamirpur",
      password: "daham@2025",
      fullName: "Pooja Verma",
      mobile: "7800001004",
      email: "da.hamirpur@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_hamirpur",
      password: "dtdoham@2025",
      fullName: "Vikas Dogra",
      mobile: "7900001004",
      email: "dtdo.hamirpur@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Kullu (Bhuntar/Manali)",
    ddoCode: "KLU00-532",
    da: {
      username: "da_kullu_manali",
      password: "dakul@2025",
      fullName: "Sandeep Negi",
      mobile: "7800001005",
      email: "da.kullu-manali@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_kullu_manali",
      password: "dtdokul@2025",
      fullName: "Ishita Kapoor",
      mobile: "7900001005",
      email: "dtdo.kullu-manali@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Kullu Dhalpur",
    ddoCode: "KLU00-532",
    da: {
      username: "da_kullu_dhalpur",
      password: "dakul@2025",
      fullName: "Divya Awasthi",
      mobile: "7800001006",
      email: "da.kullu-dhalpur@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_kullu_dhalpur",
      password: "dtdokul@2025",
      fullName: "Nitin Chaundal",
      mobile: "7900001006",
      email: "dtdo.kullu-dhalpur@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Dharamsala (Kangra)",
    ddoCode: "KNG00-532",
    da: {
      username: "da_dharamsala",
      password: "dadha@2025",
      fullName: "Rahul Kashyap",
      mobile: "7800001007",
      email: "da.dharamsala@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_dharamsala",
      password: "dtdodha@2025",
      fullName: "Shreya Mehta",
      mobile: "7900001007",
      email: "dtdo.dharamsala@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Kinnaur (Reckong Peo)",
    ddoCode: "KNR00-031",
    da: {
      username: "da_kinnaur",
      password: "dakin@2025",
      fullName: "Tanvi Bisht",
      mobile: "7800001008",
      email: "da.kinnaur@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_kinnaur",
      password: "dtdokin@2025",
      fullName: "Arjun Negi",
      mobile: "7900001008",
      email: "dtdo.kinnaur@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Kaza (Spiti ITDP)",
    ddoCode: "KZA00-011",
    da: {
      username: "da_kaza",
      password: "dakaz@2025",
      fullName: "Bharat Rawat",
      mobile: "7800001009",
      email: "da.kaza@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_kaza",
      password: "dtdokaz@2025",
      fullName: "Karuna Lhamu",
      mobile: "7900001009",
      email: "dtdo.kaza@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Lahaul (Keylong)",
    ddoCode: "LHL00-017",
    da: {
      username: "da_lahaul",
      password: "dalah@2025",
      fullName: "Sneha Dorje",
      mobile: "7800001010",
      email: "da.lahaul@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_lahaul",
      password: "dtdolah@2025",
      fullName: "Mohit Bodh",
      mobile: "7900001010",
      email: "dtdo.lahaul@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Mandi Division",
    ddoCode: "MDI00-532",
    da: {
      username: "da_mandi",
      password: "daman@2025",
      fullName: "Abhishek Vaidya",
      mobile: "7800001011",
      email: "da.mandi@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_mandi",
      password: "dtdoman@2025",
      fullName: "Ritu Sharma",
      mobile: "7900001011",
      email: "dtdo.mandi@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Pangi (ITDP)",
    ddoCode: "PNG00-003",
    da: {
      username: "da_pangi",
      password: "dapan@2025",
      fullName: "Jyoti Chauhan",
      mobile: "7800001012",
      email: "da.pangi@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_pangi",
      password: "dtdopan@2025",
      fullName: "Deepak Thakur",
      mobile: "7900001012",
      email: "dtdo.pangi@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Shimla Division",
    ddoCode: "SML00-532",
    da: {
      username: "da_shimla",
      password: "dashi@2025",
      fullName: "Varun Kapila",
      mobile: "7800001013",
      email: "da.shimla@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_shimla",
      password: "dtdoshi@2025",
      fullName: "Neha Bhandari",
      mobile: "7900001013",
      email: "dtdo.shimla@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Sirmaur (Nahan)",
    ddoCode: "SMR00-055",
    da: {
      username: "da_sirmaur",
      password: "dasir@2025",
      fullName: "Reena Gusain",
      mobile: "7800001014",
      email: "da.sirmaur@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_sirmaur",
      password: "dtdosir@2025",
      fullName: "Amit Chauhan",
      mobile: "7900001014",
      email: "dtdo.sirmaur@himachaltourism.gov.in",
    },
  },
  {
    districtLabel: "Solan Division",
    ddoCode: "SOL00-046",
    da: {
      username: "da_solan",
      password: "dasol@2025",
      fullName: "Karan Pathania",
      mobile: "7800001015",
      email: "da.solan@himachaltourism.gov.in",
    },
    dtdo: {
      username: "dtdo_solan",
      password: "dtdosol@2025",
      fullName: "Ishika Verma",
      mobile: "7900001015",
      email: "dtdo.solan@himachaltourism.gov.in",
    },
  },
];

export interface StaffAccountMeta {
  districtLabel: string;
  ddoCode: string;
  role: StaffRoleSlug;
  username: string;
  password: string;
  fullName: string;
  mobile: string;
  email: string;
}

const STAFF_BY_USERNAME = new Map<string, StaffAccountMeta>();
const STAFF_BY_MOBILE = new Map<string, StaffAccountMeta>();

for (const entry of DISTRICT_STAFF_MANIFEST) {
  for (const role of ["da", "dtdo"] as const) {
    const record = entry[role];
    const normalizedUsername = normalizeStaffIdentifier(record.username);
    if (normalizedUsername) {
      STAFF_BY_USERNAME.set(normalizedUsername, {
        districtLabel: entry.districtLabel,
        ddoCode: entry.ddoCode,
        role: role === "da" ? "dealing_assistant" : "district_tourism_officer",
        username: record.username,
        password: record.password,
        fullName: record.fullName,
        mobile: record.mobile,
        email: record.email,
      });
    }
    STAFF_BY_MOBILE.set(record.mobile, {
      districtLabel: entry.districtLabel,
      ddoCode: entry.ddoCode,
      role: role === "da" ? "dealing_assistant" : "district_tourism_officer",
      username: record.username,
      password: record.password,
      fullName: record.fullName,
      mobile: record.mobile,
      email: record.email,
    });
  }
}

export const lookupStaffAccountByIdentifier = (identifier?: string | null): StaffAccountMeta | undefined => {
  const normalized = normalizeStaffIdentifier(identifier);
  if (!normalized) return undefined;
  return STAFF_BY_USERNAME.get(normalized);
};

export const lookupStaffAccountByMobile = (mobile?: string | null): StaffAccountMeta | undefined => {
  if (!mobile) return undefined;
  return STAFF_BY_MOBILE.get(mobile);
};

export const getManifestDerivedUsername = (mobile?: string | null, fallback?: string | null): string | null => {
  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }
  const entry = lookupStaffAccountByMobile(mobile);
  return entry?.username ?? null;
};

/**
 * Look up DTDO info by district label
 * Used for OTP verification when DA needs DTDO approval
 */
export const lookupDtdoByDistrictLabel = (districtLabel?: string | null): {
  fullName: string;
  mobile: string;
  email: string;
  districtLabel: string;
} | undefined => {
  if (!districtLabel) return undefined;

  // Try exact match first
  for (const entry of DISTRICT_STAFF_MANIFEST) {
    if (entry.districtLabel.toLowerCase() === districtLabel.toLowerCase()) {
      return {
        fullName: entry.dtdo.fullName,
        mobile: entry.dtdo.mobile,
        email: entry.dtdo.email,
        districtLabel: entry.districtLabel,
      };
    }
  }

  // Try partial match (e.g., "Shimla" matches "Shimla Division")
  const normalized = districtLabel.toLowerCase().replace(/[^a-z]/g, "");
  for (const entry of DISTRICT_STAFF_MANIFEST) {
    const entryNormalized = entry.districtLabel.toLowerCase().replace(/[^a-z]/g, "");
    if (entryNormalized.includes(normalized) || normalized.includes(entryNormalized.slice(0, 5))) {
      return {
        fullName: entry.dtdo.fullName,
        mobile: entry.dtdo.mobile,
        email: entry.dtdo.email,
        districtLabel: entry.districtLabel,
      };
    }
  }

  return undefined;
};

export const getDistrictStaffManifest = (): readonly StaffAccountManifestEntry[] => DISTRICT_STAFF_MANIFEST;

