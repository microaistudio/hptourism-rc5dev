import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface OtpVerificationFormProps {
    maskedContact: string;
    expiresAt: string | null;
    isVerifying: boolean;
    error: string | null;
    onVerify: (otp: string) => void;
    onReset: () => void;
}

export function OtpVerificationForm({
    maskedContact,
    expiresAt,
    isVerifying,
    error,
    onVerify,
    onReset,
}: OtpVerificationFormProps) {
    const [otpValue, setOtpValue] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (otpValue.length !== 6) {
            setLocalError("Enter the 6-digit code sent to your phone.");
            return;
        }
        setLocalError(null);
        onVerify(otpValue);
    };

    const otpExpiresDate = expiresAt ? new Date(expiresAt) : null;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-foreground">{maskedContact}</span>.
            </div>
            <div className="flex justify-center">
                <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={(value) => {
                        setOtpValue(value.replace(/\D/g, ""));
                        setLocalError(null);
                    }}
                    autoFocus
                >
                    <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((slot) => (
                            <InputOTPSlot key={`otp-slot-${slot}`} index={slot} />
                        ))}
                    </InputOTPGroup>
                </InputOTP>
            </div>
            {otpExpiresDate && (
                <p className="text-xs text-center text-muted-foreground">
                    Expires at{" "}
                    {otpExpiresDate.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </p>
            )}
            {(error || localError) && (
                <p className="text-sm text-center text-destructive">
                    {error || localError}
                </p>
            )}
            <Button
                type="submit"
                className="w-full"
                disabled={isVerifying || otpValue.length !== 6}
            >
                {isVerifying ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                    </>
                ) : (
                    "Verify OTP"
                )}
            </Button>
            <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground hover:underline"
                onClick={onReset}
            >
                Use a different account
            </button>
        </form>
    );
}
