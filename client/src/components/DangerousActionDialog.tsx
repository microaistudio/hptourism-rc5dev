/**
 * DangerousActionDialog Component
 * 
 * A two-step safety dialog for destructive operations:
 * 1. Confirmation: "Are you sure you want to do this?"
 * 2. Password verification: Requires super admin to re-enter their password
 */

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, ShieldAlert, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DangerousActionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    warningText?: string;
    confirmText?: string;
    onConfirm: (password: string) => Promise<void>;
    isLoading?: boolean;
}

export function DangerousActionDialog({
    open,
    onOpenChange,
    title,
    description,
    warningText = "This action cannot be undone. All data will be permanently deleted.",
    confirmText = "I understand, proceed",
    onConfirm,
    isLoading = false,
}: DangerousActionDialogProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        setStep(1);
        setPassword("");
        setError(null);
        onOpenChange(false);
    };

    const handleProceedToStep2 = () => {
        setStep(2);
        setError(null);
    };

    const handleConfirm = async () => {
        if (!password.trim()) {
            setError("Password is required");
            return;
        }

        try {
            setError(null);
            await onConfirm(password);
            handleClose();
        } catch (err: any) {
            setError(err.message || "Operation failed. Please check your password.");
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={handleClose}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-destructive/10">
                            <ShieldAlert className="h-6 w-6 text-destructive" />
                        </div>
                        <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4">
                            <p>{description}</p>

                            {step === 1 && (
                                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive font-medium">{warningText}</p>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                                        <Lock className="h-5 w-5 text-amber-600" />
                                        <p className="text-sm text-amber-800">
                                            Enter your password to confirm this action
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">Your Password</Label>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setError(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    handleConfirm();
                                                }
                                            }}
                                            autoFocus
                                        />
                                        {error && (
                                            <p className="text-sm text-destructive">{error}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </AlertDialogCancel>

                    {step === 1 ? (
                        <Button
                            variant="destructive"
                            onClick={handleProceedToStep2}
                        >
                            Continue
                        </Button>
                    ) : (
                        <Button
                            variant="destructive"
                            onClick={handleConfirm}
                            disabled={isLoading || !password.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                confirmText
                            )}
                        </Button>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
