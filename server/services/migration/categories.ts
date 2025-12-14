/**
 * Data Categories for Granular Export/Import
 * 
 * Defines logical groupings of tables with their dependencies.
 * Used for selective export/import operations.
 */

export interface DataCategory {
    id: string;
    name: string;
    description: string;
    tables: string[];
    dependencies: string[];  // Other category IDs this depends on
    fileCategories?: string[];  // Storage object categories to include
}

/**
 * All data categories with their table mappings and dependencies
 */
export const DATA_CATEGORIES: DataCategory[] = [
    {
        id: "lgd",
        name: "LGD Data",
        description: "Location data - Districts, Tehsils, Blocks, Gram Panchayats, Urban Bodies",
        tables: ["lgd_districts", "lgd_tehsils", "lgd_blocks", "lgd_gram_panchayats", "lgd_urban_bodies"],
        dependencies: [],
    },
    {
        id: "ddo",
        name: "DDO Codes",
        description: "Department Drawing Officer codes for treasury",
        tables: ["ddo_codes"],
        dependencies: [],
    },
    {
        id: "users",
        name: "Users",
        description: "All user accounts, profiles, and authentication data",
        tables: ["users", "user_profiles", "login_otp_challenges", "password_reset_challenges"],
        dependencies: [],
    },
    {
        id: "applications",
        name: "Applications",
        description: "Homestay registration applications",
        tables: ["homestay_applications"],
        dependencies: ["users"],
    },
    {
        id: "documents",
        name: "Documents",
        description: "Uploaded documents and storage objects",
        tables: ["documents", "storage_objects"],
        dependencies: ["applications", "users"],
        fileCategories: ["all"],  // All file storage
    },
    {
        id: "inspections",
        name: "Inspections",
        description: "Inspection orders and reports",
        tables: ["inspection_orders", "inspection_reports"],
        dependencies: ["applications", "users"],
    },
    {
        id: "certificates",
        name: "Certificates",
        description: "Issued certificates",
        tables: ["certificates"],
        dependencies: ["applications"],
    },
    {
        id: "payments",
        name: "Payments",
        description: "Payment records and HimKosh transactions",
        tables: ["payments", "himkosh_transactions"],
        dependencies: ["applications"],
    },
    {
        id: "reviews",
        name: "Reviews & Actions",
        description: "Application reviews, actions, objections, clarifications",
        tables: ["reviews", "application_actions", "objections", "clarifications"],
        dependencies: ["applications", "users"],
    },
    {
        id: "notifications",
        name: "Notifications",
        description: "User notifications",
        tables: ["notifications"],
        dependencies: ["applications", "users"],
    },
    {
        id: "system",
        name: "System Settings",
        description: "System configuration, stats, and audit logs",
        tables: ["system_settings", "production_stats", "audit_logs"],
        dependencies: ["users"],
    },
];

/**
 * Get a category by ID
 */
export function getCategoryById(id: string): DataCategory | undefined {
    return DATA_CATEGORIES.find(c => c.id === id);
}

/**
 * Get all tables for a category including dependencies
 */
export function getTablesWithDependencies(categoryIds: string[]): string[] {
    const allTables = new Set<string>();
    const processedCategories = new Set<string>();

    function processCategory(categoryId: string) {
        if (processedCategories.has(categoryId)) return;
        processedCategories.add(categoryId);

        const category = getCategoryById(categoryId);
        if (!category) return;

        // Process dependencies first
        for (const depId of category.dependencies) {
            processCategory(depId);
        }

        // Add this category's tables
        for (const table of category.tables) {
            allTables.add(table);
        }
    }

    for (const id of categoryIds) {
        processCategory(id);
    }

    return Array.from(allTables);
}

/**
 * Get the correct import order respecting dependencies
 * Tables are ordered so dependencies come first
 */
export function getImportOrder(): string[] {
    // Hardcoded order based on FK relationships
    return [
        // No dependencies
        "lgd_districts",
        "ddo_codes",

        // Depends on districts
        "lgd_tehsils",
        "lgd_urban_bodies",

        // Depends on tehsils
        "lgd_blocks",

        // Depends on blocks
        "lgd_gram_panchayats",

        // Users (no dependencies except session)
        "users",
        "user_profiles",
        "login_otp_challenges",
        "password_reset_challenges",

        // Applications (depends on users)
        "homestay_applications",

        // Depends on applications
        "documents",
        "payments",
        "himkosh_transactions",
        "certificates",
        "notifications",
        "inspection_orders",

        // Depends on inspection_orders
        "inspection_reports",

        // Depends on inspection_reports
        "objections",

        // Depends on objections
        "clarifications",

        // Depends on applications + users
        "reviews",
        "application_actions",

        // Storage objects (depends on users, applications, documents)
        "storage_objects",

        // System (depends on users)
        "system_settings",
        "production_stats",
        "audit_logs",
    ];
}
