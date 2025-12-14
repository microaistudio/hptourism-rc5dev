/**
 * Migration Module - Main Entry Point
 * 
 * Intelligent migration system with:
 * - Granular export/import by category
 * - Analysis-before-import mode
 * - Self-documenting schema registry
 * - Schema validation for complete backups
 */

// Categories and dependencies
export {
    DATA_CATEGORIES,
    getCategoryById,
    getTablesWithDependencies,
    getImportOrder,
    type DataCategory,
} from "./categories";

// Schema introspection and validation
export {
    generateSchemaSnapshot,
    getSchemaSummary,
    checkExistingTables,
    getTableInfo,
    getTableNames,
    validateSchemaCoverage,
    getFileStorageInfo,
    type SchemaSnapshot,
    type TableInfo,
    type CategoryStats,
    type SchemaCoverageResult,
} from "./schema-registry";

// Import analysis
export {
    analyzePackage,
    type PackageAnalysis,
    type PackageInfo,
    type SchemaComparison,
    type ImportRecommendation,
    type ImportStrategy,
} from "./import-analyzer";

// Re-export the original migration service for backward compatibility
export * from "../migration-service";

