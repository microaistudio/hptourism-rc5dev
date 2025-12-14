/**
 * Schema Registry - Self-documenting database schema knowledge
 * 
 * Auto-introspects the database schema and maintains metadata
 * about tables, relationships, and current state.
 */

import { db } from "../../db";
import { sql } from "drizzle-orm";
import { logger } from "../../logger";
import { DATA_CATEGORIES, getImportOrder } from "./categories";

const log = logger.child({ module: "schema-registry" });

export interface TableInfo {
    name: string;
    columns: ColumnInfo[];
    rowCount: number;
    primaryKey: string | null;
    foreignKeys: ForeignKeyInfo[];
    category: string | null;
}

export interface ColumnInfo {
    name: string;
    dataType: string;
    isNullable: boolean;
    defaultValue: string | null;
}

export interface ForeignKeyInfo {
    column: string;
    referencedTable: string;
    referencedColumn: string;
    onDelete: string | null;
}

export interface SchemaSnapshot {
    timestamp: string;
    databaseName: string;
    tables: TableInfo[];
    totalRows: number;
    categories: CategoryStats[];
}

export interface CategoryStats {
    id: string;
    name: string;
    tables: string[];
    totalRows: number;
    hasData: boolean;
}

/**
 * Get list of all tables in the public schema
 */
export async function getTableNames(): Promise<string[]> {
    const result = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
    return result.rows.map((row: any) => row.table_name);
}

/**
 * Get row count for a table
 */
export async function getTableRowCount(tableName: string): Promise<number> {
    try {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
        return parseInt(result.rows[0]?.count || "0", 10);
    } catch {
        return 0;
    }
}

/**
 * Get column information for a table
 */
export async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    const result = await db.execute(sql`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    ORDER BY ordinal_position
  `);

    return result.rows.map((row: any) => ({
        name: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable === "YES",
        defaultValue: row.column_default,
    }));
}

/**
 * Get primary key for a table
 */
export async function getTablePrimaryKey(tableName: string): Promise<string | null> {
    const result = await db.execute(sql`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = ${tableName}
      AND tc.constraint_type = 'PRIMARY KEY'
    LIMIT 1
  `);

    return result.rows[0]?.column_name || null;
}

/**
 * Get foreign keys for a table
 */
export async function getTableForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
    const result = await db.execute(sql`
    SELECT
      kcu.column_name,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column,
      rc.delete_rule
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.constraint_column_usage ccu
      ON kcu.constraint_name = ccu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON kcu.constraint_name = rc.constraint_name
    WHERE kcu.table_schema = 'public'
      AND kcu.table_name = ${tableName}
  `);

    return result.rows.map((row: any) => ({
        column: row.column_name,
        referencedTable: row.referenced_table,
        referencedColumn: row.referenced_column,
        onDelete: row.delete_rule,
    }));
}

/**
 * Get full info for a single table
 */
export async function getTableInfo(tableName: string): Promise<TableInfo> {
    const [columns, rowCount, primaryKey, foreignKeys] = await Promise.all([
        getTableColumns(tableName),
        getTableRowCount(tableName),
        getTablePrimaryKey(tableName),
        getTableForeignKeys(tableName),
    ]);

    // Find which category this table belongs to
    let category: string | null = null;
    for (const cat of DATA_CATEGORIES) {
        if (cat.tables.includes(tableName)) {
            category = cat.id;
            break;
        }
    }

    return {
        name: tableName,
        columns,
        rowCount,
        primaryKey,
        foreignKeys,
        category,
    };
}

/**
 * Generate a complete schema snapshot
 */
export async function generateSchemaSnapshot(): Promise<SchemaSnapshot> {
    log.info("Generating schema snapshot...");

    const tableNames = await getTableNames();
    const tables: TableInfo[] = [];
    let totalRows = 0;

    for (const name of tableNames) {
        const info = await getTableInfo(name);
        tables.push(info);
        totalRows += info.rowCount;
    }

    // Calculate category stats
    const categories: CategoryStats[] = DATA_CATEGORIES.map(cat => {
        const catTables = tables.filter(t => cat.tables.includes(t.name));
        const catRows = catTables.reduce((sum, t) => sum + t.rowCount, 0);
        return {
            id: cat.id,
            name: cat.name,
            tables: catTables.map(t => t.name),
            totalRows: catRows,
            hasData: catRows > 0,
        };
    });

    const snapshot: SchemaSnapshot = {
        timestamp: new Date().toISOString(),
        databaseName: process.env.DATABASE_URL?.split("/").pop()?.split("?")[0] || "unknown",
        tables,
        totalRows,
        categories,
    };

    log.info({ tableCount: tables.length, totalRows }, "Schema snapshot generated");
    return snapshot;
}

/**
 * Check which tables from the import order exist
 */
export async function checkExistingTables(): Promise<{ existing: string[]; missing: string[] }> {
    const allDbTables = await getTableNames();
    const importOrder = getImportOrder();

    const existing = importOrder.filter(t => allDbTables.includes(t));
    const missing = importOrder.filter(t => !allDbTables.includes(t));

    return { existing, missing };
}

/**
 * Get schema summary for display
 */
export async function getSchemaSummary(): Promise<{
    totalTables: number;
    totalRows: number;
    categories: { id: string; name: string; rows: number; hasData: boolean }[];
}> {
    const snapshot = await generateSchemaSnapshot();

    return {
        totalTables: snapshot.tables.length,
        totalRows: snapshot.totalRows,
        categories: snapshot.categories.map(c => ({
            id: c.id,
            name: c.name,
            rows: c.totalRows,
            hasData: c.hasData,
        })),
    };
}

/**
 * Schema Coverage Validation Result
 */
export interface SchemaCoverageResult {
    isComplete: boolean;
    totalDbTables: number;
    coveredTables: string[];
    uncoveredTables: string[];
    systemTables: string[];  // Tables we intentionally exclude (e.g., session)
    warnings: string[];
}

// Tables that are system/framework managed and don't need backup
const SYSTEM_TABLES = ["session", "drizzle_migrations"];

/**
 * Validate that all database tables are covered by backup categories
 * CRITICAL: This ensures no data is left behind during exports
 */
export async function validateSchemaCoverage(): Promise<SchemaCoverageResult> {
    log.info("Validating schema coverage...");

    const allDbTables = await getTableNames();

    // Get all tables defined in categories
    const allCategoryTables = new Set<string>();
    for (const cat of DATA_CATEGORIES) {
        for (const table of cat.tables) {
            allCategoryTables.add(table);
        }
    }

    const coveredTables: string[] = [];
    const uncoveredTables: string[] = [];
    const systemTables: string[] = [];
    const warnings: string[] = [];

    for (const table of allDbTables) {
        if (SYSTEM_TABLES.includes(table)) {
            systemTables.push(table);
        } else if (allCategoryTables.has(table)) {
            coveredTables.push(table);
        } else {
            uncoveredTables.push(table);
            warnings.push(`Table "${table}" exists in database but is NOT covered by any backup category!`);
        }
    }

    // Also check for tables in categories that don't exist in DB
    for (const catTable of allCategoryTables) {
        if (!allDbTables.includes(catTable)) {
            warnings.push(`Table "${catTable}" is in category definitions but does NOT exist in database`);
        }
    }

    const isComplete = uncoveredTables.length === 0;

    if (!isComplete) {
        log.warn({ uncoveredTables }, "Schema coverage incomplete - some tables not backed up!");
    } else {
        log.info({ coveredCount: coveredTables.length }, "Schema coverage complete - all tables covered");
    }

    return {
        isComplete,
        totalDbTables: allDbTables.length,
        coveredTables,
        uncoveredTables,
        systemTables,
        warnings,
    };
}

/**
 * Get file storage directories that should be backed up
 */
export function getFileStorageInfo(): {
    directories: string[];
    description: string;
} {
    const baseDir = process.env.LOCAL_STORAGE_DIR || "./storage";
    return {
        directories: [baseDir],
        description: "Local file storage for uploaded documents",
    };
}
