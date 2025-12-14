import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Shield, Calendar, Server, CheckCircle } from "lucide-react";
import { APP_VERSION, getVersionInfo, type VersionInfo } from "@shared/version";

interface AboutDialogProps {
    userRole?: "owner" | "officer" | "admin" | "superadmin";
    trigger?: React.ReactNode;
}

export function AboutDialog({ userRole = "owner", trigger }: AboutDialogProps) {
    const [open, setOpen] = useState(false);
    const versionInfo = getVersionInfo(userRole);
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const isOfficer = userRole === "officer" || isAdmin;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="gap-2">
                        <Info className="h-4 w-4" />
                        About
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <img src="/favicon.png" alt="Logo" className="h-8 w-8" />
                        HP Tourism Portal
                    </DialogTitle>
                    <DialogDescription>
                        Homestay & B&B Registration Portal
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Version Badge */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Version</span>
                        <Badge variant="secondary" className="font-mono">
                            v{versionInfo.version}
                        </Badge>
                    </div>

                    {/* RC Info (Officers and above) */}
                    {isOfficer && versionInfo.releaseCandidate && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Release</span>
                            <Badge variant="outline">{versionInfo.releaseCandidate}</Badge>
                        </div>
                    )}

                    {/* Admin-only info */}
                    {isAdmin && (
                        <>
                            {versionInfo.codename && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Codename
                                    </span>
                                    <span className="text-sm font-medium">{versionInfo.codename}</span>
                                </div>
                            )}

                            {versionInfo.buildDate && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Build Date
                                    </span>
                                    <span className="text-sm font-medium">{versionInfo.buildDate}</span>
                                </div>
                            )}

                            {versionInfo.environment && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Server className="h-4 w-4" />
                                        Environment
                                    </span>
                                    <Badge
                                        variant={versionInfo.environment === "production" ? "default" : "secondary"}
                                    >
                                        {versionInfo.environment}
                                    </Badge>
                                </div>
                            )}

                            {versionInfo.features && versionInfo.features.length > 0 && (
                                <div className="pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">Recent Features</span>
                                    <ul className="mt-2 space-y-1">
                                        {versionInfo.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm">
                                                <CheckCircle className="h-3 w-3 text-green-500" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t text-center text-xs text-muted-foreground">
                        © 2025 Himachal Pradesh Tourism Development Corporation
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default AboutDialog;
