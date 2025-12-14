/**
 * HP Tourism Portal - Activity Types Configuration
 * Supports multiple tourism activities: Homestay, Water Sports, etc.
 */

// ============================================
// Application Types
// ============================================

export const APPLICATION_TYPES = {
    HOMESTAY: 'homestay',
    WATER_SPORTS: 'water_sports',
    // Future: ADVENTURE_SPORTS, CAMPING, etc.
} as const;

export type ApplicationType = typeof APPLICATION_TYPES[keyof typeof APPLICATION_TYPES];

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
    homestay: 'Homestay / B&B',
    water_sports: 'Water Sports & Allied Activities',
};

// ============================================
// Water Sports Activities (HP Water Sports Rules 2021)
// ============================================

export interface WaterSportsActivity {
    id: string;
    name: string;
    category: 'non_motorized' | 'motorized' | 'towed' | 'personal_watercraft';
    feeType: 'per_seat' | 'per_unit' | 'fixed';
    feeAmount: number; // Annual fee in INR
    requiresRescueBoat: boolean;
    minAge?: number;
    requiresCertification?: string[];
}

export const WATER_SPORTS_ACTIVITIES: WaterSportsActivity[] = [
    // Non-Motorized Activities
    {
        id: 'country_boat',
        name: 'Country Boat',
        category: 'non_motorized',
        feeType: 'per_seat',
        feeAmount: 200,
        requiresRescueBoat: false,
    },
    {
        id: 'row_boat',
        name: 'Row Boat',
        category: 'non_motorized',
        feeType: 'per_seat',
        feeAmount: 200,
        requiresRescueBoat: false,
    },
    {
        id: 'paddle_boat',
        name: 'Paddle Boat',
        category: 'non_motorized',
        feeType: 'per_seat',
        feeAmount: 200,
        requiresRescueBoat: false,
    },
    {
        id: 'kayaking',
        name: 'Kayaking',
        category: 'non_motorized',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
        requiresCertification: ['IRS'],
    },
    {
        id: 'canoeing',
        name: 'Canoeing',
        category: 'non_motorized',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
        requiresCertification: ['IRS'],
    },
    {
        id: 'rowing',
        name: 'Rowing',
        category: 'non_motorized',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
    },

    // Motorized Activities
    {
        id: 'motor_boat',
        name: 'Motor Boat',
        category: 'motorized',
        feeType: 'fixed',
        feeAmount: 5000,
        requiresRescueBoat: true,
        requiresCertification: ['IRS'],
    },
    {
        id: 'speed_boat',
        name: 'Speed Boat',
        category: 'motorized',
        feeType: 'fixed',
        feeAmount: 5000,
        requiresRescueBoat: true,
        requiresCertification: ['IRS'],
    },
    {
        id: 'power_boat',
        name: 'Power Boat',
        category: 'motorized',
        feeType: 'fixed',
        feeAmount: 5000,
        requiresRescueBoat: true,
        requiresCertification: ['IRS'],
    },
    {
        id: 'cruise',
        name: 'Cruise / House Boat',
        category: 'motorized',
        feeType: 'fixed',
        feeAmount: 25000,
        requiresRescueBoat: true,
        requiresCertification: ['IRS', 'HP_Ferries_Act'],
    },

    // Towed Activities
    {
        id: 'water_skiing',
        name: 'Water Skiing',
        category: 'towed',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
        minAge: 18,
    },
    {
        id: 'wakeboarding',
        name: 'Wakeboarding',
        category: 'towed',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
        minAge: 18,
    },
    {
        id: 'ski_boarding',
        name: 'Ski Boarding',
        category: 'towed',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
        minAge: 18,
    },
    {
        id: 'tube_ride',
        name: 'Tube Ride',
        category: 'towed',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
    },
    {
        id: 'banana_ride',
        name: 'Banana Ride',
        category: 'towed',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
    },
    {
        id: 'ringo_ride',
        name: 'Ringo Ride',
        category: 'towed',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
    },
    {
        id: 'donut_ride',
        name: 'Donut Ride',
        category: 'towed',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
    },

    // Personal Watercraft
    {
        id: 'jet_ski',
        name: 'Jet Ski',
        category: 'personal_watercraft',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
        minAge: 18,
        requiresCertification: ['IRS'],
    },
    {
        id: 'water_scooter',
        name: 'Water Scooter',
        category: 'personal_watercraft',
        feeType: 'per_unit',
        feeAmount: 3000,
        requiresRescueBoat: true,
        minAge: 18,
        requiresCertification: ['IRS'],
    },
];

// ============================================
// Water Bodies (Schedule-I of HP Water Sports Rules 2021)
// ============================================

export interface WaterBody {
    id: string;
    name: string;
    type: 'dam' | 'river' | 'lake';
    district: string;
    allowedActivities?: string[]; // If empty, all activities allowed
}

export const WATER_BODIES: WaterBody[] = [
    // Dam Reservoirs
    {
        id: 'pong_dam',
        name: 'Maharana Pratap Sagar (Pong Dam)',
        type: 'dam',
        district: 'Kangra',
    },
    {
        id: 'gobind_sagar',
        name: 'Gobind Sagar (Bhakra Dam)',
        type: 'dam',
        district: 'Bilaspur',
    },
    {
        id: 'larji_dam',
        name: 'Larji Project Reservoir',
        type: 'dam',
        district: 'Kullu',
    },
    {
        id: 'kol_dam',
        name: 'Kol Dam Project Reservoir',
        type: 'dam',
        district: 'Bilaspur',
    },
    {
        id: 'pandoh_dam',
        name: 'Pandoh Dam Reservoir',
        type: 'dam',
        district: 'Mandi',
    },
    {
        id: 'chamera_dam',
        name: 'Chamera Project Dam Reservoir (I, II, III)',
        type: 'dam',
        district: 'Chamba',
    },
    {
        id: 'nathpa_dam',
        name: 'Nathpa Dam Reservoir',
        type: 'dam',
        district: 'Kinnaur',
    },

    // Rivers
    {
        id: 'sutlej',
        name: 'Sutlej River',
        type: 'river',
        district: 'Multiple',
    },
    {
        id: 'beas',
        name: 'Beas River',
        type: 'river',
        district: 'Multiple',
    },
    {
        id: 'ravi',
        name: 'Ravi River',
        type: 'river',
        district: 'Chamba',
    },
    {
        id: 'yamuna',
        name: 'Yamuna River',
        type: 'river',
        district: 'Sirmaur',
    },
    {
        id: 'giri',
        name: 'Giri River',
        type: 'river',
        district: 'Sirmaur',
    },
    {
        id: 'pabbar',
        name: 'Pabbar River',
        type: 'river',
        district: 'Shimla',
    },
    {
        id: 'baspa',
        name: 'Baspa River',
        type: 'river',
        district: 'Kinnaur',
    },
    {
        id: 'spiti',
        name: 'Spiti River',
        type: 'river',
        district: 'Lahaul and Spiti',
    },
    {
        id: 'chenab',
        name: 'Chandrabhaga (Chenab) River',
        type: 'river',
        district: 'Lahaul and Spiti',
    },

    // Natural Lakes
    {
        id: 'renuka_lake',
        name: 'Renuka Lake',
        type: 'lake',
        district: 'Sirmaur',
    },
];

// ============================================
// Crew/Manpower Roles
// ============================================

export const CREW_ROLES = [
    { id: 'boatman', name: 'Boatman', requiresCertification: true },
    { id: 'motor_boat_driver', name: 'Motor Boat Driver', requiresCertification: true },
    { id: 'life_guard', name: 'Life Guard / Water Safety Guard', requiresCertification: true },
    { id: 'crew_member', name: 'Crew Member', requiresCertification: false },
] as const;

// ============================================
// Equipment Certification Agencies
// ============================================

export const CERTIFICATION_AGENCIES = [
    { id: 'IRS', name: 'Indian Register of Shipping' },
    { id: 'DG_SHIPPING', name: 'Director General of Shipping, India' },
    { id: 'BIS', name: 'Bureau of Indian Standards' },
    { id: 'US_COAST_GUARD', name: 'US Coast Guard' },
    { id: 'CE', name: 'CE (Communauté Européenne)' },
    { id: 'ISO', name: 'International Standards Organisation' },
    { id: 'IMO', name: 'International Maritime Organisation' },
    { id: 'SOLAS', name: 'Safety of Life At Sea' },
    { id: 'OTHER', name: 'Other Certified Agency' },
] as const;

// ============================================
// Helper Functions
// ============================================

export function getActivitiesByCategory(category: string): WaterSportsActivity[] {
    return WATER_SPORTS_ACTIVITIES.filter(a => a.category === category);
}

export function getActivityById(id: string): WaterSportsActivity | undefined {
    return WATER_SPORTS_ACTIVITIES.find(a => a.id === id);
}

export function getWaterBodyById(id: string): WaterBody | undefined {
    return WATER_BODIES.find(wb => wb.id === id);
}

export function getWaterBodiesByDistrict(district: string): WaterBody[] {
    return WATER_BODIES.filter(
        wb => wb.district === district || wb.district === 'Multiple'
    );
}

export function calculateWaterSportsFee(
    activityId: string,
    quantity: number = 1,
    seats: number = 1
): number {
    const activity = getActivityById(activityId);
    if (!activity) return 0;

    switch (activity.feeType) {
        case 'per_seat':
            return activity.feeAmount * seats * quantity;
        case 'per_unit':
            return activity.feeAmount * quantity;
        case 'fixed':
            return activity.feeAmount;
        default:
            return 0;
    }
}
