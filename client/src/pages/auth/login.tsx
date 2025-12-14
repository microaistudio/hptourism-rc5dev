import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getDefaultRouteForRole } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mountain, Loader2, RefreshCw, CheckCircle2, ShieldCheck, Home, Sparkles } from "lucide-react";
import { NavigationHeader } from "@/components/navigation-header";
import type { User } from "@shared/schema";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type LoginAuthMode = "password" | "otp";
type OtpChannel = "sms" | "email";
type LoginAudience = "user" | "office";

const audienceContent: Record<
  LoginAudience,
  {
    label: string;
    badge: string;
    heroTitle: string;
    heroSubtitle: string;
    cardTitle: string;
    cardDescription: string;
    bullets: string[];
    identifierPlaceholder: string;
    helperNote: string;
    secondaryNote: string;
    showRegisterLink: boolean;
  }
> = {
  user: {
    label: "User Login",
    badge: "For applicants and property owners",
    heroTitle: "User login",
    heroSubtitle: "Sign in with the mobile or email you registered earlier.",
    cardTitle: "User login",
    cardDescription: "Apply, upload documents, and track your approvals.",
    bullets: ["Use your registered mobile/email to sign in.", "New here? Create your user account."],
    identifierPlaceholder: "e.g., 9876543210 or user@example.com",
    helperNote: "Use the same mobile/email you used on this portal.",
    secondaryNote: "Need a user account? Tap Register below to create one.",
    showRegisterLink: true,
  },
  office: {
    label: "Office Login",
    badge: "For DA / DTDO / Admin / Super Admin",
    heroTitle: "Office login",
    heroSubtitle: "Use the office username shared with you.",
    cardTitle: "Office login",
    cardDescription: "District/state office accounts",
    bullets: ["Use your assigned office username (e.g., da.shimla, admin.rc).", "Need access? Contact your admin."],
    identifierPlaceholder: "e.g., da.shimla or admin.rc",
    helperNote: "Office accounts are managed by Admin/Super Admin.",
    secondaryNote: "If you can’t sign in, ask your admin to reset your office account.",
    showRegisterLink: false,
  },
};

const loginSchema = z
  .object({
    identifier: z.string().min(3, "Enter username, mobile number, or email"),
    password: z.string().optional(),
    captchaAnswer: z.string().optional(),
    authMode: z.enum(["password", "otp"]),
    otpChannel: z.enum(["sms", "email"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.authMode === "password" && (!data.password || data.password.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is required",
      });
    }
    if (data.authMode === "otp" && !data.otpChannel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otpChannel"],
        message: "Choose where to receive the OTP",
      });
    }
  });

type LoginForm = z.infer<typeof loginSchema>;

type OtpChallengeState = {
  id: string;
  expiresAt: string;
  channel: OtpChannel;
  maskedMobile?: string;
  maskedEmail?: string;
};

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      captchaAnswer: "",
      authMode: "password",
      otpChannel: "sms",
    },
  });
  const [captchaQuestion, setCaptchaQuestion] = useState<string>("");
  const [captchaLoading, setCaptchaLoading] = useState<boolean>(false);
  const [captchaEnabled, setCaptchaEnabled] = useState<boolean>(true);
  const [otpChallenge, setOtpChallenge] = useState<OtpChallengeState | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpOptionEnabled, setOtpOptionEnabled] = useState(false);
  const [otpChannels, setOtpChannels] = useState<{ sms: boolean; email: boolean }>({ sms: true, email: true });
  const [loginOptionsLoaded, setLoginOptionsLoaded] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [audience, setAudience] = useState<LoginAudience>("user");
  const authMode = form.watch("authMode");
  const selectedAudience = audienceContent[audience];
  const oppositeAudience: LoginAudience = audience === "user" ? "office" : "user";

  const ensureValidOtpChannel = (preferred?: OtpChannel) => {
    const current = preferred ?? form.getValues("otpChannel");
    if (current && otpChannels[current]) {
      form.setValue("otpChannel", current, { shouldValidate: false });
      return;
    }
    if (otpChannels.sms) {
      form.setValue("otpChannel", "sms", { shouldValidate: false });
      return;
    }
    if (otpChannels.email) {
      form.setValue("otpChannel", "email", { shouldValidate: false });
      return;
    }
    form.setValue("otpChannel", undefined as unknown as OtpChannel, { shouldValidate: false });
  };

  const handleAuthModeChange = (mode: LoginAuthMode) => {
    if (authMode === mode) {
      return;
    }
    setOtpChallenge(null);
    setOtpValue("");
    setOtpError(null);
    form.setValue("authMode", mode, { shouldValidate: false });
    if (mode === "otp") {
      form.setValue("password", "");
      form.clearErrors("password");
      ensureValidOtpChannel();
    }
  };

  const refreshCaptcha = useCallback(async () => {
    try {
      setCaptchaLoading(true);
      const response = await apiRequest("GET", "/api/auth/captcha");
      const data = await response.json();
      if (data.enabled === false) {
        setCaptchaEnabled(false);
        setCaptchaQuestion("");
        form.setValue("captchaAnswer", "");
        return;
      }
      setCaptchaEnabled(true);
      setCaptchaQuestion(data.question);
      form.setValue("captchaAnswer", "");
    } catch (error) {
      toast({
        title: "Captcha unavailable",
        description: (error as Error)?.message || "Unable to load captcha. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCaptchaLoading(false);
    }
  }, [form, toast]);

  useEffect(() => {
    void refreshCaptcha();
  }, [refreshCaptcha]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawParam = params.get("audience") || params.get("role");
    if (rawParam === "user" || rawParam === "owner") {
      setAudience("user");
    }
    if (rawParam === "office" || rawParam === "officer") {
      setAudience("office");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/login/options");
        const data = await response.json();
        if (!cancelled) {
          const smsEnabled = Boolean(data?.smsOtpEnabled);
          const emailEnabled = Boolean(data?.emailOtpEnabled);
          const anyOtpChannel = smsEnabled || emailEnabled;
          setOtpChannels({ sms: smsEnabled, email: emailEnabled });
          setOtpOptionEnabled(anyOtpChannel);
          const isOtpRequired = Boolean(data?.otpRequired);
          setOtpRequired(isOtpRequired);
          ensureValidOtpChannel(smsEnabled ? "sms" : emailEnabled ? "email" : undefined);
          setLoginOptionsLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[auth] Failed to load login options", error);
          setOtpOptionEnabled(false);
          setLoginOptionsLoaded(true);
        }
      }
    };
    void loadOptions();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ensureValidOtpChannel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpChannels.sms, otpChannels.email]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data: { user?: User; otpRequired?: boolean; challengeId?: string; expiresAt?: string; maskedMobile?: string; maskedEmail?: string; channel?: OtpChannel }) => {
      if (data?.otpRequired && data.challengeId && data.expiresAt) {
        setOtpChallenge({
          id: data.challengeId,
          expiresAt: data.expiresAt,
          channel: data.channel ?? "sms",
          maskedMobile: data.maskedMobile,
          maskedEmail: data.maskedEmail,
        });
        setOtpValue("");
        setOtpError(null);
        toast({
          title: "OTP sent",
          description: `Enter the code sent to ${data.maskedMobile ?? data.maskedEmail ?? "your registered contact"}.`,
        });
        return;
      }
      if (!data?.user) {
        toast({
          title: "Login failed",
          description: "Unexpected response from server.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      const defaultRoute = getDefaultRouteForRole(data.user.role);
      setLocation(defaultRoute);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ otp }: { otp: string }) => {
      const response = await apiRequest("POST", "/api/auth/login/verify-otp", {
        challengeId: otpChallenge?.id,
        otp,
      });
      return response.json();
    },
    onSuccess: (data: { user: User }) => {
      toast({
        title: "Welcome back!",
        description: "OTP verified successfully.",
      });
      const defaultRoute = getDefaultRouteForRole(data.user.role);
      setLocation(defaultRoute);
    },
    onError: (error: any) => {
      setOtpError(error?.message || "OTP verification failed");
    },
  });

  const onSubmit = (data: LoginForm) => {
    if (otpChallenge) {
      return;
    }
    if (captchaEnabled && !data.captchaAnswer?.trim()) {
      form.setError("captchaAnswer", { message: "Please solve the security check" });
      return;
    }
    loginMutation.mutate(data, {
      onSettled: () => {
        if (captchaEnabled) {
          void refreshCaptcha();
        }
      },
    });
  };
  const handleOtpSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!otpChallenge) {
      return;
    }
    if (otpValue.trim().length !== 6) {
      setOtpError("Enter the 6-digit code sent to your phone.");
      return;
    }
    setOtpError(null);
    verifyOtpMutation.mutate({ otp: otpValue });
  };
  const handleOtpReset = () => {
    setOtpChallenge(null);
    setOtpValue("");
    setOtpError(null);
    void refreshCaptcha();
  };

  const otpExpiresAt = otpChallenge ? new Date(otpChallenge.expiresAt) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-sky-50">
      <NavigationHeader
        title="HP Tourism Portal"
        subtitle="Homestay & B&B Registration"
        showBack={false}
        showHome={true}
      />
      <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 pb-12 pt-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            <span>{selectedAudience.badge}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Not the right portal?</span>
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setAudience(oppositeAudience);
                setLocation(`/login?audience=${oppositeAudience}`);
              }}
            >
              Switch to {oppositeAudience === "user" ? "Applicant" : "Officer"} login
            </button>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900">{selectedAudience.cardTitle}</h1>
            <p className="text-base text-slate-600">{selectedAudience.heroSubtitle}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                {audience === "user" ? <Home className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{selectedAudience.heroTitle}</p>
                <p className="text-sm text-slate-600">{selectedAudience.heroSubtitle}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {selectedAudience.bullets.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="w-full border-slate-200/80 bg-white/90 shadow-xl backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Mountain className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">{selectedAudience.cardTitle}</CardTitle>
            <CardDescription>{selectedAudience.cardDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {otpChallenge ? (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="text-center text-sm text-muted-foreground">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-medium text-foreground">
                    {otpChallenge.maskedMobile ?? otpChallenge.maskedEmail ?? "your registered contact"}
                  </span>
                  .
                </div>
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
                        <InputOTPSlot key={`otp-slot-${slot}`} index={slot} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {otpExpiresAt && (
                  <p className="text-xs text-center text-muted-foreground">
                    Expires at {otpExpiresAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {otpError && <p className="text-sm text-center text-destructive">{otpError}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyOtpMutation.isPending || otpValue.length !== 6}
                >
                  {verifyOtpMutation.isPending ? (
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
                  onClick={handleOtpReset}
                >
                  Use a different account
                </button>
              </form>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {otpOptionEnabled && loginOptionsLoaded && (
                    <div className="flex items-center justify-center">
                      <div className="flex rounded-full border bg-muted/40 p-1 text-xs font-medium">
                        <Button
                          type="button"
                          variant={authMode === "password" ? "default" : "ghost"}
                          size="sm"
                          className={`rounded-full px-4 ${authMode === "password" ? "" : "!text-muted-foreground"}`}
                          onClick={() => handleAuthModeChange("password")}
                        >
                          Password
                        </Button>
                        <Button
                          type="button"
                          variant={authMode === "otp" ? "default" : "ghost"}
                          size="sm"
                          className={`rounded-full px-4 ${authMode === "otp" ? "" : "!text-muted-foreground"}`}
                          onClick={() => handleAuthModeChange("otp")}
                          disabled={!otpOptionEnabled}
                        >
                          OTP
                        </Button>
                      </div>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="authMode"
                    render={({ field }) => <input type="hidden" {...field} />}
                  />
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username, Mobile Number, or Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={selectedAudience.identifierPlaceholder}
                            data-testid="input-identifier"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {otpOptionEnabled && authMode === "otp" && (
                    <FormField
                      control={form.control}
                      name="otpChannel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Send OTP via</FormLabel>
                          <div className="grid grid-cols-2 gap-2">
                            {(["sms", "email"] as const).map((option) => (
                              <Button
                                type="button"
                                key={option}
                                variant={field.value === option ? "default" : "outline"}
                                className="w-full"
                                onClick={() => otpChannels[option] && field.onChange(option)}
                                disabled={!otpChannels[option]}
                              >
                                {option === "sms" ? "SMS" : "Email"}
                              </Button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {authMode === "password" ? (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter password"
                              data-testid="input-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      We will send a one-time password to your selected contact after you solve the captcha.
                    </div>
                  )}

                  {captchaEnabled ? (
                    <FormField
                      control={form.control}
                      name="captchaAnswer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Check</FormLabel>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="mb-2 rounded border bg-muted/40 px-3 py-2 text-center text-base font-semibold">
                                {captchaQuestion ? (
                                  <>
                                    {captchaQuestion} <span className="text-sm font-normal text-muted-foreground">(solve)</span>
                                  </>
                                ) : (
                                  "Loading..."
                                )}
                              </div>
                              <FormControl>
                                <Input
                                  placeholder="Enter the answer"
                                  inputMode="numeric"
                                  disabled={captchaLoading || !captchaQuestion}
                                  {...field}
                                />
                              </FormControl>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => void refreshCaptcha()}
                              disabled={captchaLoading}
                              aria-label="Refresh captcha"
                            >
                              {captchaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="rounded border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      Captcha has been temporarily disabled for this environment.
                    </div>
                  )}

                  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    {selectedAudience.helperNote}
                    {otpRequired && (
                      <span className="ml-2 font-semibold text-foreground">OTP is required for this account.</span>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending || (captchaEnabled && !captchaQuestion)}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : authMode === "otp" ? (
                      "Send OTP"
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    Forgot your password?{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => setLocation("/password-reset")}
                    >
                      Reset it here
                    </button>
                  </div>

                  {selectedAudience.showRegisterLink ? (
                    <div className="text-center text-sm">
                      <span className="text-muted-foreground">New user? </span>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setLocation("/register")}
                        data-testid="link-register"
                      >
                        Create your account
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">{selectedAudience.secondaryNote}</p>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      {selectedAudience.secondaryNote}
                    </div>
                  )}
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
