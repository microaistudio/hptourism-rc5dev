/**
 * Admin Backup Configuration Page
 * 
 * Super Admin only page for configuring and managing backups.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Database,
    FolderArchive,
    Clock,
    Download,
    Trash2,
    Play,
    Settings,
    HardDrive,
    CheckCircle,
    XCircle,
    Loader2,
    RefreshCw
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface BackupSettings {
    enabled: boolean;
    schedule: string;
    backupDirectory: string;
    retentionDays: number;
    includeDatabase: boolean;
    includeFiles: boolean;
    lastBackupAt?: string;
    lastBackupStatus?: "success" | "failed";
    lastBackupError?: string;
}

interface SchedulerStatus {
    running: boolean;
    schedule: string | null;
    description: string | null;
}

interface BackupMetadata {
    id: string;
    createdAt: string;
    type: "full" | "database" | "files";
    databaseFile?: string;
    filesArchive?: string;
    sizeBytes: number;
    status: "success" | "failed";
    error?: string;
    duration?: number;
}

interface ScheduleOption {
    value: string;
    label: string;
}

interface BackupSettingsResponse {
    settings: BackupSettings;
    scheduler: SchedulerStatus;
    scheduleOptions: ScheduleOption[];
    defaults: BackupSettings;
}

interface BackupListResponse {
    backups: BackupMetadata[];
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function AdminBackup() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<BackupSettings>>({});

    // Fetch settings
    const { data: settingsData, isLoading: settingsLoading } = useQuery<BackupSettingsResponse>({
        queryKey: ["/api/admin/backup/settings"],
    });

    // Fetch backup list
    const { data: backupsData, isLoading: backupsLoading } = useQuery<BackupListResponse>({
        queryKey: ["/api/admin/backup/list"],
    });

    // Update settings mutation
    const updateSettingsMutation = useMutation({
        mutationFn: async (data: Partial<BackupSettings>) => {
            const response = await apiRequest("POST", "/api/admin/backup/settings", data);
            return response.json();
        },
        onSuccess: () => {
            toast({ title: "Settings updated", description: "Backup configuration saved successfully." });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/settings"] });
            setIsEditing(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Failed to save settings", variant: "destructive" });
        },
    });

    // Run backup mutation
    const runBackupMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest("POST", "/api/admin/backup/run");
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: data.backup?.status === "success" ? "Backup complete" : "Backup completed with errors",
                description: data.message,
                variant: data.backup?.status === "success" ? "default" : "destructive"
            });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/list"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/settings"] });
        },
        onError: (error: any) => {
            toast({ title: "Backup failed", description: error.message, variant: "destructive" });
        },
    });

    // Delete backup mutation
    const deleteBackupMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await apiRequest("DELETE", `/api/admin/backup/${id}`);
            return response.json();
        },
        onSuccess: () => {
            toast({ title: "Backup deleted" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/list"] });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleSaveSettings = () => {
        updateSettingsMutation.mutate(formData);
    };

    const handleDownload = (backupId: string, type: "database" | "files") => {
        window.open(`/api/admin/backup/${backupId}/download/${type}`, "_blank");
    };

    const settings = settingsData?.settings;
    const scheduler = settingsData?.scheduler;
    const scheduleOptions = settingsData?.scheduleOptions || [];
    const backups = backupsData?.backups || [];

    if (settingsLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Backup Management</h1>
                    <p className="text-muted-foreground">Configure automated backups and manage backup files</p>
                </div>
                <Button
                    onClick={() => runBackupMutation.mutate()}
                    disabled={runBackupMutation.isPending}
                >
                    {runBackupMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
                    ) : (
                        <><Play className="mr-2 h-4 w-4" /> Backup Now</>
                    )}
                </Button>
            </div>

            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Scheduler Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {scheduler?.running ? (
                                <Badge variant="default" className="bg-emerald-500">Running</Badge>
                            ) : (
                                <Badge variant="secondary">Stopped</Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                                {scheduler?.description || "Not scheduled"}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            Last Backup
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {settings?.lastBackupAt ? (
                            <div className="flex items-center gap-2">
                                {settings.lastBackupStatus === "success" ? (
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm">
                                    {formatDistanceToNow(new Date(settings.lastBackupAt), { addSuffix: true })}
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground">No backups yet</span>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FolderArchive className="h-4 w-4" />
                            Total Backups
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{backups.length}</span>
                    </CardContent>
                </Card>
            </div>

            {/* Configuration Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Backup Configuration
                            </CardTitle>
                            <CardDescription>Configure automatic backup schedule and options</CardDescription>
                        </div>
                        {!isEditing && (
                            <Button variant="outline" onClick={() => {
                                setFormData(settings || {});
                                setIsEditing(true);
                            }}>
                                Edit
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isEditing ? (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Enable Scheduled Backups</Label>
                                        <Switch
                                            checked={formData.enabled ?? settings?.enabled ?? true}
                                            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Schedule</Label>
                                    <Select
                                        value={formData.schedule ?? settings?.schedule ?? "0 2 * * *"}
                                        onValueChange={(value) => setFormData({ ...formData, schedule: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {scheduleOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Backup Directory</Label>
                                    <Input
                                        value={formData.backupDirectory ?? settings?.backupDirectory ?? ""}
                                        onChange={(e) => setFormData({ ...formData, backupDirectory: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Default location after installation: <code className="bg-muted px-1 py-0.5 rounded">/var/hptourism/backups</code>
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Retention (days)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={formData.retentionDays ?? settings?.retentionDays ?? 30}
                                        onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) || 30 })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Include Database</Label>
                                        <Switch
                                            checked={formData.includeDatabase ?? settings?.includeDatabase ?? true}
                                            onCheckedChange={(checked) => setFormData({ ...formData, includeDatabase: checked })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Include Files</Label>
                                        <Switch
                                            checked={formData.includeFiles ?? settings?.includeFiles ?? true}
                                            onCheckedChange={(checked) => setFormData({ ...formData, includeFiles: checked })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
                                    {updateSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Settings
                                </Button>
                                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            </div>
                        </>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Enabled:</span>
                                <span>{settings?.enabled ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Schedule:</span>
                                <span>{scheduler?.description || settings?.schedule}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Directory:</span>
                                <span className="font-mono text-xs">{settings?.backupDirectory}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Retention:</span>
                                <span>{settings?.retentionDays} days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Include Database:</span>
                                <span>{settings?.includeDatabase ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Include Files:</span>
                                <span>{settings?.includeFiles ? "Yes" : "No"}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Backup History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Backup History
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/list"] })}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {backupsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FolderArchive className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No backups found</p>
                            <p className="text-sm">Click "Backup Now" to create your first backup</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {backups.map((backup) => (
                                    <TableRow key={backup.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{format(new Date(backup.createdAt), "MMM d, yyyy")}</div>
                                                <div className="text-xs text-muted-foreground">{format(new Date(backup.createdAt), "h:mm a")}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {backup.status === "success" ? (
                                                <Badge variant="default" className="bg-emerald-500">Success</Badge>
                                            ) : (
                                                <Badge variant="destructive">Failed</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{formatBytes(backup.sizeBytes)}</TableCell>
                                        <TableCell>{backup.duration ? `${(backup.duration / 1000).toFixed(1)}s` : "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {backup.databaseFile && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Download Database"
                                                        onClick={() => handleDownload(backup.id, "database")}
                                                    >
                                                        <Database className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {backup.filesArchive && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Download Files"
                                                        onClick={() => handleDownload(backup.id, "files")}
                                                    >
                                                        <FolderArchive className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Delete"
                                                    onClick={() => deleteBackupMutation.mutate(backup.id)}
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
        </div>
    );
}
