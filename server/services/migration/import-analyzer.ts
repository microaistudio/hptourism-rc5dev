/**
 * Import Analyzer - Analyzes import packages before execution
 * 
 * Provides detailed analysis of what's in a package vs current state,
 * detects conflicts, and recommends import strategy.
 */

import fs from "fs";
import path from "path";
import unzipper from "unzipper";
import { promisify } from "util";
import { exec } from "child_process";
import { logger } from "../../logger";
import { generateSchemaSnapshot, getTableRowCount, SchemaSnapshot } from "./schema-registry";
import { DATA_CATEGORIES, getImportOrder } from "./categories";

const execAsync = promisify(exec);
const log = logger.child({ module: "import-analyzer" });

export interface PackageAnalysis {
    valid: boolean;
    packageInfo: PackageInfo;
    currentState: SchemaSnapshot;
    comparison: SchemaComparison;
    recommendations: ImportRecommendation[];
    warnings: string[];
    errors: string[];
}

export interface PackageInfo {
    id: string;
    createdAt: string;
    includesDatabase: boolean;
    includesFiles: boolean;
    filesCount: number;
    sizeBytes: number;
    tables: PackageTableInfo[];
    categories: { id: string; name: string; hasData: boolean }[];
}

export interface PackageTableInfo {
    name: string;
    rowCount: number;
    hasData: boolean;
}

export interface SchemaComparison {
    tablesOnlyInPackage: string[];
    tablesOnlyInDatabase: string[];
    tablesInBoth: string[];
    dataConflicts: DataConflict[];
}

export interface DataConflict {
    table: string;
    packageRows: number;
    databaseRows: number;
    conflictType: "overwrite" | "merge" | "skip";
}

export interface ImportRecommendation {
    strategy: ImportStrategy;
    reason: string;
    affectedTables: string[];
    estimatedRecords: number;
}

export type ImportStrategy =
    | "full_replace"    // Empty database - import everything
    | "data_only"       // All tables exist - just import data
    | "schema_and_data" // Some tables missing
    | "selective"       // User should choose categories
    | "merge"           // Add new records without overwriting
    | "skip";           // Nothing to import

/**
 * Analyze a migration package without importing
 */
export async function analyzePackage(packagePath: string): Promise<PackageAnalysis> {
    const warnings: string[] = [];
    const errors: string[] = [];

    log.info({ packagePath }, "Analyzing import package...");

    // Get current database state
    const currentState = await generateSchemaSnapshot();

    // Extract and analyze package
    const tempDir = path.join(path.dirname(packagePath), `analysis_${Date.now()}`);

    try {
        await fs.promises.mkdir(tempDir, { recursive: true });

        // Extract package
        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(packagePath)
                .pipe(unzipper.Extract({ path: tempDir }))
                .on("close", resolve)
                .on("error", reject);
        });

        // Read metadata
        const metadataPath = path.join(tempDir, "metadata.json");
        let metadata: any = {};
        if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(await fs.promises.readFile(metadataPath, "utf-8"));
        }

        // Analyze database dump
        const packageTables = await analyzeDbDump(tempDir);

        // Count files
        const filesDir = path.join(tempDir, "files");
        const filesCount = fs.existsSync(filesDir)
            ? await countFiles(filesDir)
            : 0;

        // Build package info
        const packageInfo: PackageInfo = {
            id: metadata.id || path.basename(packagePath, ".zip"),
            createdAt: metadata.createdAt || "unknown",
            includesDatabase: fs.existsSync(path.join(tempDir, "database.sql.gz")),
            includesFiles: filesCount > 0,
            filesCount,
            sizeBytes: (await fs.promises.stat(packagePath)).size,
            tables: packageTables,
            categories: DATA_CATEGORIES.map(cat => ({
                id: cat.id,
                name: cat.name,
                hasData: cat.tables.some(t =>
                    packageTables.find(pt => pt.name === t)?.hasData
                ),
            })),
        };

        // Compare schemas
        const comparison = compareSchemas(packageTables, currentState);

        // Generate recommendations
        const recommendations = generateRecommendations(packageInfo, currentState, comparison);

        // Check for potential issues
        if (comparison.tablesOnlyInPackage.length > 0) {
            warnings.push(`Package contains ${comparison.tablesOnlyInPackage.length} tables not in current database`);
        }

        if (comparison.dataConflicts.some(c => c.conflictType === "overwrite")) {
            warnings.push("Some tables have existing data that will be overwritten");
        }

        return {
            valid: errors.length === 0,
            packageInfo,
            currentState,
            comparison,
            recommendations,
            warnings,
            errors,
        };
    } finally {
        // Cleanup temp directory
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }
}

/**
 * Analyze the database dump to extract table info
 */
async function analyzeDbDump(tempDir: string): Promise<PackageTableInfo[]> {
    const dbFile = path.join(tempDir, "database.sql.gz");
    if (!fs.existsSync(dbFile)) {
        return [];
    }

    const tables: PackageTableInfo[] = [];

    try {
        // Extract COPY statements and count rows
        const { stdout } = await execAsync(
            `gunzip -c "${dbFile}" | grep -E "^(COPY public\\.|^\\\\\\.$)" | head -200`,
            { maxBuffer: 10 * 1024 * 1024 }
        );

        let currentTable: string | null = null;
        let currentRows = 0;

        // Parse output to count rows per table
        const lines = stdout.split("\n");
        for (const line of lines) {
            if (line.startsWith("COPY public.")) {
                // Save previous table
                if (currentTable) {
                    tables.push({
                        name: currentTable,
                        rowCount: currentRows,
                        hasData: currentRows > 0,
                    });
                }

                // Start new table
                const match = line.match(/COPY public\.(\w+)/);
                currentTable = match ? match[1] : null;
                currentRows = 0;
            } else if (line === "\\.") {
                // End of COPY data
                if (currentTable) {
                    tables.push({
                        name: currentTable,
                        rowCount: currentRows,
                        hasData: currentRows > 0,
                    });
                    currentTable = null;
                    currentRows = 0;
                }
            } else if (currentTable && line.trim()) {
                currentRows++;
            }
        }

        // Alternative: count rows using wc between COPY and \.
        // This is more accurate but slower

    } catch (error) {
        log.error({ error }, "Failed to analyze database dump");
    }

    return tables;
}

/**
 * Count files recursively in a directory
 */
async function countFiles(dir: string): Promise<number> {
    let count = 0;
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            count += await countFiles(path.join(dir, entry.name));
        } else {
            count++;
        }
    }

    return count;
}

/**
 * Compare package tables with current database
 */
function compareSchemas(
    packageTables: PackageTableInfo[],
    currentState: SchemaSnapshot
): SchemaComparison {
    const packageTableNames = new Set(packageTables.map(t => t.name));
    const dbTableNames = new Set(currentState.tables.map(t => t.name));

    const tablesOnlyInPackage = [...packageTableNames].filter(t => !dbTableNames.has(t));
    const tablesOnlyInDatabase = [...dbTableNames].filter(t => !packageTableNames.has(t));
    const tablesInBoth = [...packageTableNames].filter(t => dbTableNames.has(t));

    const dataConflicts: DataConflict[] = [];

    for (const tableName of tablesInBoth) {
        const pkgTable = packageTables.find(t => t.name === tableName);
        const dbTable = currentState.tables.find(t => t.name === tableName);

        if (pkgTable && dbTable && pkgTable.rowCount > 0 && dbTable.rowCount > 0) {
            dataConflicts.push({
                table: tableName,
                packageRows: pkgTable.rowCount,
                databaseRows: dbTable.rowCount,
                conflictType: "overwrite",
            });
        }
    }

    return {
        tablesOnlyInPackage,
        tablesOnlyInDatabase,
        tablesInBoth,
        dataConflicts,
    };
}

/**
 * Generate import recommendations based on analysis
 */
function generateRecommendations(
    packageInfo: PackageInfo,
    currentState: SchemaSnapshot,
    comparison: SchemaComparison
): ImportRecommendation[] {
    const recommendations: ImportRecommendation[] = [];

    // Check if database is empty
    if (currentState.totalRows === 0) {
        recommendations.push({
            strategy: "full_replace",
            reason: "Database is empty - full import recommended",
            affectedTables: packageInfo.tables.map(t => t.name),
            estimatedRecords: packageInfo.tables.reduce((sum, t) => sum + t.rowCount, 0),
        });
        return recommendations;
    }

    // Check if all tables exist
    if (comparison.tablesOnlyInPackage.length === 0) {
        recommendations.push({
            strategy: "data_only",
            reason: "All tables exist - data-only import possible",
            affectedTables: comparison.tablesInBoth,
            estimatedRecords: packageInfo.tables.reduce((sum, t) => sum + t.rowCount, 0),
        });
    } else {
        recommendations.push({
            strategy: "schema_and_data",
            reason: `${comparison.tablesOnlyInPackage.length} tables need to be created`,
            affectedTables: comparison.tablesOnlyInPackage,
            estimatedRecords: packageInfo.tables.reduce((sum, t) => sum + t.rowCount, 0),
        });
    }

    // If there are conflicts, suggest selective import
    if (comparison.dataConflicts.length > 0) {
        recommendations.push({
            strategy: "selective",
            reason: `${comparison.dataConflicts.length} tables have existing data - consider selective import`,
            affectedTables: comparison.dataConflicts.map(c => c.table),
            estimatedRecords: comparison.dataConflicts.reduce((sum, c) => sum + c.packageRows, 0),
        });
    }

    return recommendations;
}
