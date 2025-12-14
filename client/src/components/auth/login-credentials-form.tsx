import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

// Define these types locally or import from a shared location if possible
// For now, replicating the schema type structure
interface LoginFormValues {
    identifier: string;
    password?: string;
    captchaAnswer?: string;
    authMode: "password" | "otp";
    otpChannel?: "sms" | "email";
}

interface LoginCredentialsFormProps {
    form: UseFormReturn<LoginFormValues>;
    onSubmit: (data: LoginFormValues) => void;
    isLoading: boolean;
    authMode: "password" | "otp";
    onAuthModeChange: (mode: "password" | "otp") => void;
    captchaEnabled: boolean;
    captchaQuestion: string;
    captchaLoading: boolean;
    onRefreshCaptcha: () => void;
    otpOptionEnabled: boolean;
    otpChannels: { sms: boolean; email: boolean };
    otpRequired: boolean;
    selectedAudience: {
        identifierPlaceholder: string;
        helperNote: string;
        secondaryNote: string;
        showRegisterLink: boolean;
    };
    onRegister: () => void;
    onResetPassword: () => void;
    loginOptionsLoaded: boolean;
}

export function LoginCredentialsForm({
    form,
    onSubmit,
    isLoading,
    authMode,
    onAuthModeChange,
    captchaEnabled,
    captchaQuestion,
    captchaLoading,
    onRefreshCaptcha,
    otpOptionEnabled,
    otpChannels,
    otpRequired,
    selectedAudience,
    onRegister,
    onResetPassword,
    loginOptionsLoaded,
}: LoginCredentialsFormProps) {
    return (
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
                                onClick={() => onAuthModeChange("password")}
                            >
                                Password
                            </Button>
                            <Button
                                type="button"
                                variant={authMode === "otp" ? "default" : "ghost"}
                                size="sm"
                                className={`rounded-full px-4 ${authMode === "otp" ? "" : "!text-muted-foreground"}`}
                                onClick={() => onAuthModeChange("otp")}
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
                                                    {captchaQuestion}{" "}
                                                    <span className="text-sm font-normal text-muted-foreground">
                                                        (solve)
                                                    </span>
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
                                        onClick={onRefreshCaptcha}
                                        disabled={captchaLoading}
                                        aria-label="Refresh captcha"
                                    >
                                        {captchaLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
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
                        <span className="ml-2 font-semibold text-foreground">
                            OTP is required for this account.
                        </span>
                    )}
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || (captchaEnabled && !captchaQuestion)}
                    data-testid="button-login"
                >
                    {isLoading ? (
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
                        onClick={onResetPassword}
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
                            onClick={onRegister}
                            data-testid="link-register"
                        >
                            Create your account
                        </button>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {selectedAudience.secondaryNote}
                        </p>
                    </div>
                ) : (
                    <div className="text-center text-sm text-muted-foreground">
                        {selectedAudience.secondaryNote}
                    </div>
                )}
            </form>
        </Form>
    );
}
