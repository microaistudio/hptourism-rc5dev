import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

type ResetStage = "request" | "verify" | "success";

type ResetChallenge = {
  id: string;
  expiresAt: string;
  channel: "sms" | "email";
  maskedMobile?: string;
  maskedEmail?: string;
  identifier: string;
};

const requestSchema = z.object({
  identifier: z.string().min(3, "Enter your registered mobile, email, or username"),
});

const verifySchema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export default function PasswordReset() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [stage, setStage] = useState<ResetStage>("request");
  const [activeChallenge, setActiveChallenge] = useState<ResetChallenge | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [channel, setChannel] = useState<"sms" | "email">("sms");

  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { identifier: "" },
  });

  const verifyForm = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (activeChallenge?.expiresAt) {
      setExpiresAt(new Date(activeChallenge.expiresAt));
    } else {
      setExpiresAt(null);
    }
  }, [activeChallenge]);

  const requestMutation = useMutation({
    mutationFn: async (payload: { identifier: string; channel: "sms" | "email" }) => {
      const response = await apiRequest("POST", "/api/auth/password-reset/request", {
        identifier: payload.identifier,
        channel: payload.channel,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setActiveChallenge({
        id: data.challengeId,
        expiresAt: data.expiresAt,
        channel: data.channel,
        maskedMobile: data.maskedMobile,
        maskedEmail: data.maskedEmail,
        identifier: variables.identifier,
      });
      setOtpValue("");
      setOtpError(null);
      verifyForm.reset();
      setStage("verify");
      toast({
        title: "Reset code sent",
        description: `Enter the code we sent to ${data.maskedMobile ?? data.maskedEmail ?? "your contact"}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to send reset code",
        description: error?.message || "Please check the details and try again.",
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ otp, newPassword }: { otp: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/password-reset/verify", {
        challengeId: activeChallenge?.id,
        otp,
        newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      setStage("success");
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
    },
    onError: (error: any) => {
      setOtpError(error?.message || "Reset code verification failed");
    },
  });

  const handleRequestSubmit = requestForm.handleSubmit((values) => {
    requestMutation.mutate({ identifier: values.identifier, channel });
  });

  const handleVerifySubmit = verifyForm.handleSubmit((values) => {
    if (!activeChallenge) {
      toast({
        title: "Reset session expired",
        description: "Please request a new reset code.",
        variant: "destructive",
      });
      setStage("request");
      return;
    }
    if (otpValue.length !== 6) {
      setOtpError("Enter the 6-digit code");
      return;
    }
    verifyMutation.mutate({ otp: otpValue, newPassword: values.newPassword });
  });

  const handleResend = () => {
    if (activeChallenge?.identifier) {
      requestMutation.mutate({
        identifier: activeChallenge.identifier,
        channel: activeChallenge.channel,
      });
    }
  };

  const stepIndex = useMemo(() => {
    if (stage === "request") return 0;
    if (stage === "verify") return 1;
    return 2;
  }, [stage]);

  return (
    <>
      <NavigationHeader />
      <main className="min-h-screen bg-muted/20 py-10">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" className="gap-2 px-2" onClick={() => setLocation("/login")}>
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Button>
          </div>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Reset your password</CardTitle>
              <CardDescription>
                A two-step reset flow that keeps your account secure. Choose SMS or email and we’ll send a one-time code to your registered contact.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {["Request code", "Verify & update", "Done"].map((label, index) => (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                        index <= stepIndex ? "border-primary bg-primary text-white" : "border-muted-foreground/40 text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        index === stepIndex ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                    {index < 2 && <div className="hidden flex-1 border-t border-dashed border-muted-foreground/40 md:block" />}
                  </div>
                ))}
              </div>

              {stage === "request" && (
                <Form {...requestForm}>
                  <form onSubmit={handleRequestSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Send code via</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["sms", "email"] as const).map((option) => (
                          <Button
                            type="button"
                            key={option}
                            variant={channel === option ? "default" : "outline"}
                            className="w-full"
                            onClick={() => setChannel(option)}
                          >
                            {option === "sms" ? "SMS" : "Email"}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <FormField
                      control={requestForm.control}
                      name="identifier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registered mobile/email or username</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoComplete="username"
                              placeholder="e.g., 8091544005, owner@example.com, or HP-HST user id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={requestMutation.isPending}
                    >
                      {requestMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending code...
                        </>
                      ) : (
                        "Send reset code"
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {stage === "verify" && activeChallenge && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                    We sent a 6-digit code via {activeChallenge.channel === "email" ? "email" : "SMS"} to{" "}
                    <span className="font-semibold">
                      {activeChallenge.maskedMobile ?? activeChallenge.maskedEmail ?? "your contact"}
                    </span>
                    . Enter the code and your new password below.
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {expiresAt && (
                        <span>Expires at {expiresAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                      <button type="button" className="font-medium text-primary hover:underline" onClick={handleResend} disabled={requestMutation.isPending}>
                        {requestMutation.isPending ? "Sending..." : "Resend code"}
                      </button>
                    </div>
                  </div>

                  <Form {...verifyForm}>
                    <form onSubmit={handleVerifySubmit} className="space-y-6">
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={otpValue}
                          onChange={(value) => {
                            setOtpValue(value.replace(/\D/g, ""));
                            setOtpError(null);
                          }}
                          autoFocus
                        >
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((slot) => (
                              <InputOTPSlot key={`reset-otp-${slot}`} index={slot} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      {otpError && <p className="text-center text-sm text-destructive">{otpError}</p>}

                      <FormField
                        control={verifyForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="new-password" placeholder="Enter a strong password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={verifyForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="new-password" placeholder="Re-enter the new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={verifyMutation.isPending || otpValue.length !== 6}
                      >
                        {verifyMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating password...
                          </>
                        ) : (
                          "Update password"
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              )}

              {stage === "success" && (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">Password reset successfully</p>
                    <p className="text-sm text-muted-foreground">
                      You can now sign in with your new password. For security, log out from all shared devices.
                    </p>
                  </div>
                  <Button onClick={() => setLocation("/login")} className="min-w-[200px]">
                    Return to login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
