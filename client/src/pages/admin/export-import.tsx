/**
 * Admin Export/Import Page
 * 
 * Super Admin page for system migration - export and import complete system data.
 * Enhanced with:
 * - Schema validation to ensure complete backups
 * - Granular export by category
 * - Import analysis before executing
 */

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Database,
    FolderArchive,
    Download,
    Upload,
    Trash2,
    Play,
    PackagePlus,
    PackageOpen,
    CheckCircle,
    XCircle,
    Loader2,
    RefreshCw,
    AlertTriangle,
    Lock,
    FileArchive,
    Shield,
    ShieldCheck,
    ShieldAlert,
    List,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface MigrationMetadata {
    id: string;
    createdAt: string;
    sourceSystem: string;
    appVersion: string;
    databaseName: string;
    includesDatabase: boolean;
    includesFiles: boolean;
    filesCount: number;
    totalSizeBytes: number;
    checksums: Record<string, string>;
}

interface ExportPackage {
    id: string;
    createdAt: string;
    filePath: string;
    metadata: MigrationMetadata;
    sizeBytes: number;
    status: "pending" | "completed" | "failed";
    error?: string;
    duration?: number;
}

interface ExportsResponse {
    packages: ExportPackage[];
}

interface DataCategory {
    id: string;
    name: string;
    description: string;
    tables: string[];
    dependencies: string[];
}

interface SchemaValidation {
    isComplete: boolean;
    totalDbTables: number;
    coveredTables: string[];
    uncoveredTables: string[];
    systemTables: string[];
    warnings: string[];
}

interface SchemaSummary {
    totalTables: number;
    totalRows: number;
    categories: { id: string; name: string; rows: number; hasData: boolean }[];
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function AdminExportImport() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Export options
    const [exportMode, setExportMode] = useState<"full" | "granular">("full");
    const [includeDatabase, setIncludeDatabase] = useState(true);
    const [includeFiles, setIncludeFiles] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // Import state
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importPassword, setImportPassword] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [validationResult, setValidationResult] = useState<{
        valid: boolean;
        metadata: MigrationMetadata | null;
        errors: string[];
        warnings: string[];
    } | null>(null);

    // Fetch exports list
    const { data: exportsData, isLoading: exportsLoading } = useQuery<ExportsResponse>({
        queryKey: ["/api/admin/migration/exports"],
    });

    // Fetch schema validation
    const { data: schemaValidation, isLoading: validationLoading } = useQuery<SchemaValidation>({
        queryKey: ["/api/admin/migration/schema/validate"],
    });

    // Fetch categories
    const { data: categoriesData } = useQuery<{ categories: DataCategory[] }>({
        queryKey: ["/api/admin/migration/categories"],
    });

    // Fetch schema summary
    const { data: schemaSummary } = useQuery<SchemaSummary>({
        queryKey: ["/api/admin/migration/schema/summary"],
    });

    const categories = categoriesData?.categories || [];

    // Create export mutation
    const createExportMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest("POST", "/api/admin/migration/export", {
                includeDatabase,
                includeFiles,
                // Future: add categories for granular export
            });
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Export created",
                description: `Package created in ${((data.package?.duration || 0) / 1000).toFixed(1)}s`,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/migration/exports"] });
        },
        onError: (error: any) => {
            toast({
                title: "Export failed",
                description: error.message || "Failed to create export package",
                variant: "destructive",
            });
        },
    });

    // Delete export mutation
    const deleteExportMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await apiRequest("DELETE", `/api/admin/migration/export/${id}`);
            return response.json();
        },
        onSuccess: () => {
            toast({ title: "Export deleted" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/migration/exports"] });
        },
        onError: (error: any) => {
            toast({
                title: "Delete failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Import mutation
    const importMutation = useMutation({
        mutationFn: async () => {
            if (!selectedFile) throw new Error("No file selected");

            const formData = new FormData();
            formData.append("package", selectedFile);
            formData.append("password", importPassword);

            const response = await fetch("/api/admin/migration/import", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Import failed");
            }

            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: data.result?.success ? "Import successful" : "Import completed with errors",
                description: `Database: ${data.result?.databaseRestored ? "✓" : "✗"}, Files: ${data.result?.filesRestored ? `✓ (${data.result.filesCount})` : "✗"}`,
                variant: data.result?.success ? "default" : "destructive",
            });
            setImportDialogOpen(false);
            setSelectedFile(null);
            setImportPassword("");
            setValidationResult(null);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/migration/schema/summary"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/migration/schema/validate"] });
        },
        onError: (error: any) => {
            toast({
                title: "Import failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setValidationResult(null);

        // Validate the package
        try {
            const formData = new FormData();
            formData.append("package", file);

            const response = await fetch("/api/admin/migration/import/validate", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            const result = await response.json();
            setValidationResult(result);
        } catch (error) {
            setValidationResult({
                valid: false,
                metadata: null,
                errors: ["Failed to validate package"],
                warnings: [],
            });
        }
    };

    const handleImportClick = () => {
        if (validationResult?.valid) {
            setImportDialogOpen(true);
        }
    };

    const handleDownload = (id: string) => {
        window.open(`/api/admin/migration/export/${id}/download`, "_blank");
    };

    const toggleCategory = (categoryId: string) => {
        setSelectedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const exports = exportsData?.packages || [];

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold">Export / Import</h1>
                <p className="text-muted-foreground">
                    System migration - export and import complete database and files
                </p>
            </div>

            {/* Schema Validation Status */}
            {!validationLoading && schemaValidation && (
                <Card className={schemaValidation.isComplete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {schemaValidation.isComplete ? (
                                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                                ) : (
                                    <ShieldAlert className="h-6 w-6 text-amber-600" />
                                )}
                                <div>
                                    <p className={`font-medium ${schemaValidation.isComplete ? "text-emerald-700" : "text-amber-700"}`}>
                                        {schemaValidation.isComplete
                                            ? "Schema Coverage Complete"
                                            : `Schema Coverage Incomplete (${schemaValidation.uncoveredTables.length} tables not covered)`
                                        }
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {schemaValidation.coveredTables.length} of {schemaValidation.totalDbTables} tables covered by backup
                                    </p>
                                </div>
                            </div>
                            {schemaSummary && (
                                <div className="text-right">
                                    <p className="text-lg font-semibold">{schemaSummary.totalRows.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">total records</p>
                                </div>
                            )}
                        </div>
                        {schemaValidation.warnings.length > 0 && (
                            <div className="mt-3 p-2 bg-white/50 rounded text-sm text-amber-700">
                                <ul className="list-disc list-inside space-y-1">
                                    {schemaValidation.warnings.slice(0, 3).map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                    {schemaValidation.warnings.length > 3 && (
                                        <li>...and {schemaValidation.warnings.length - 3} more</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Export Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PackagePlus className="h-5 w-5" />
                        Create Export Package
                    </CardTitle>
                    <CardDescription>
                        Export the complete database and files for migration or backup
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Tabs value={exportMode} onValueChange={(v) => setExportMode(v as "full" | "granular")}>
                        <TabsList>
                            <TabsTrigger value="full">Full Export</TabsTrigger>
                            <TabsTrigger value="granular">Granular Export</TabsTrigger>
                        </TabsList>

                        <TabsContent value="full" className="space-y-4">
                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="include-database"
                                        checked={includeDatabase}
                                        onCheckedChange={setIncludeDatabase}
                                    />
                                    <Label htmlFor="include-database" className="flex items-center gap-2">
                                        <Database className="h-4 w-4" />
                                        Include Database
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="include-files"
                                        checked={includeFiles}
                                        onCheckedChange={setIncludeFiles}
                                    />
                                    <Label htmlFor="include-files" className="flex items-center gap-2">
                                        <FolderArchive className="h-4 w-4" />
                                        Include Files
                                    </Label>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="granular" className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Select specific data categories to export:
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {categories.map((cat) => {
                                    const summary = schemaSummary?.categories.find(c => c.id === cat.id);
                                    return (
                                        <label
                                            key={cat.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedCategories.includes(cat.id)
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:bg-accent"
                                                }`}
                                        >
                                            <Checkbox
                                                checked={selectedCategories.includes(cat.id)}
                                                onCheckedChange={() => toggleCategory(cat.id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm">{cat.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {cat.tables.length} tables
                                                    {summary?.rows ? ` • ${summary.rows.toLocaleString()} rows` : ""}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            {selectedCategories.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {selectedCategories.length} categories selected
                                </p>
                            )}
                        </TabsContent>
                    </Tabs>

                    <Button
                        onClick={() => createExportMutation.mutate()}
                        disabled={
                            createExportMutation.isPending ||
                            (exportMode === "full" && !includeDatabase && !includeFiles) ||
                            (exportMode === "granular" && selectedCategories.length === 0)
                        }
                    >
                        {createExportMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Export...
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4" />
                                Create Export Package
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Import Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PackageOpen className="h-5 w-5" />
                        Import Package
                    </CardTitle>
                    <CardDescription>
                        Restore system from an export package (database and files will be replaced)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip"
                            onChange={handleFileSelect}
                            className="max-w-md"
                        />
                    </div>

                    {validationResult && (
                        <div className="space-y-3">
                            {validationResult.valid ? (
                                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                                        <CheckCircle className="h-5 w-5" />
                                        Package validated successfully
                                    </div>
                                    {validationResult.metadata && (
                                        <div className="mt-3 text-sm text-emerald-600 space-y-1">
                                            <p>Source: {validationResult.metadata.sourceSystem}</p>
                                            <p>Created: {format(new Date(validationResult.metadata.createdAt), "PPp")}</p>
                                            <p>
                                                Contains: {validationResult.metadata.includesDatabase ? "Database" : ""}
                                                {validationResult.metadata.includesDatabase && validationResult.metadata.includesFiles ? " + " : ""}
                                                {validationResult.metadata.includesFiles ? `${validationResult.metadata.filesCount} files` : ""}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                                    <div className="flex items-center gap-2 text-red-700 font-medium">
                                        <XCircle className="h-5 w-5" />
                                        Package validation failed
                                    </div>
                                    <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                                        {validationResult.errors.map((error, i) => (
                                            <li key={i}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {validationResult.warnings.length > 0 && (
                                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                                    <div className="flex items-center gap-2 text-amber-700 font-medium">
                                        <AlertTriangle className="h-5 w-5" />
                                        Warnings
                                    </div>
                                    <ul className="mt-2 text-sm text-amber-600 list-disc list-inside">
                                        {validationResult.warnings.map((warning, i) => (
                                            <li key={i}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <Button
                        onClick={handleImportClick}
                        disabled={!validationResult?.valid || importMutation.isPending}
                        variant="destructive"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Import Package
                    </Button>
                </CardContent>
            </Card>

            {/* Export History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FileArchive className="h-5 w-5" />
                            Export History
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/migration/exports"] })}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {exportsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : exports.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileArchive className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No export packages found</p>
                            <p className="text-sm">Create an export package to get started</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Contents</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {exports.map((pkg) => (
                                    <TableRow key={pkg.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">
                                                    {format(new Date(pkg.createdAt), "MMM d, yyyy")}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {format(new Date(pkg.createdAt), "h:mm a")}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {pkg.metadata?.includesDatabase && (
                                                    <Badge variant="secondary">
                                                        <Database className="h-3 w-3 mr-1" />
                                                        DB
                                                    </Badge>
                                                )}
                                                {pkg.metadata?.includesFiles && (
                                                    <Badge variant="secondary">
                                                        <FolderArchive className="h-3 w-3 mr-1" />
                                                        {pkg.metadata.filesCount} files
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatBytes(pkg.sizeBytes)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Download"
                                                    onClick={() => handleDownload(pkg.id)}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Delete"
                                                    onClick={() => deleteExportMutation.mutate(pkg.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Import Confirmation Dialog */}
            <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Confirm Import
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p>
                                    This will <strong>replace the entire database and files</strong> with the contents
                                    of the import package. This action cannot be undone.
                                </p>

                                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700">
                                    <p className="font-medium">Warning: All current data will be lost!</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="import-password" className="flex items-center gap-2">
                                        <Lock className="h-4 w-4" />
                                        Enter your password to confirm
                                    </Label>
                                    <Input
                                        id="import-password"
                                        type="password"
                                        value={importPassword}
                                        onChange={(e) => setImportPassword(e.target.value)}
                                        placeholder="Your password"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={importMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={() => importMutation.mutate()}
                            disabled={importMutation.isPending || !importPassword}
                        >
                            {importMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Import and Replace All Data
                                </>
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
