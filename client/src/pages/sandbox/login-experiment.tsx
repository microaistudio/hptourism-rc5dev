/**
 * Sandbox Login Experiment
 * 
 * An experimental login page design that matches the main landing page aesthetic
 * with a hero image background and premium glassmorphism design.
 * 
 * Access via: /sandbox/login-experiment (not linked in navigation)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain, Loader2, Eye, EyeOff, ArrowLeft, Sparkles, Shield, User } from "lucide-react";

type LoginAudience = "user" | "office";

const HERO_IMAGE = "/images/hero/hp-mountains.jpg";

export default function SandboxLoginExperiment() {
    const [audience, setAudience] = useState<LoginAudience>("user");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authMode, setAuthMode] = useState<"password" | "otp">("password");

    const toggleAudience = () => {
        setAudience(audience === "user" ? "office" : "user");
    };

    const handleDemoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 1500);
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Full-page Hero Background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${HERO_IMAGE})`,
                }}
            >
                {/* Gradient Overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-emerald-900/50" />
            </div>

            {/* Navigation Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                    <img
                        src="/images/hp-tourism-logo.svg"
                        alt="HP Tourism"
                        className="h-10 w-auto"
                        onError={(e) => {
                            // Fallback if logo doesn't exist
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div className="text-white">
                        <h1 className="text-lg font-semibold leading-tight">HP Tourism eServices</h1>
                        <p className="text-xs text-white/70">Himachal Pradesh Government</p>
                    </div>
                </div>
                <a
                    href="/"
                    className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </a>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
                <div className="w-full max-w-md">
                    {/* Glassmorphism Login Card */}
                    <Card className="backdrop-blur-xl bg-white/95 border-white/20 shadow-2xl">
                        <CardHeader className="text-center space-y-4 pb-2">
                            {/* Logo/Icon */}
                            <div className="flex justify-center">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg">
                                    <Mountain className="w-9 h-9 text-white" />
                                </div>
                            </div>

                            {/* Audience Toggle */}
                            <div className="flex items-center justify-center gap-1 p-1 bg-slate-100 rounded-full">
                                <button
                                    type="button"
                                    onClick={() => setAudience("user")}
                                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all ${audience === "user"
                                        ? "bg-white text-emerald-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <User className="w-4 h-4" />
                                    Applicant
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAudience("office")}
                                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all ${audience === "office"
                                        ? "bg-white text-emerald-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <Shield className="w-4 h-4" />
                                    Officer
                                </button>
                            </div>

                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900">
                                    {audience === "user" ? "Welcome Back" : "Officer Portal"}
                                </CardTitle>
                                <CardDescription className="text-slate-600">
                                    {audience === "user"
                                        ? "Sign in to manage your homestay applications"
                                        : "Access district/state administration"
                                    }
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-5 pt-4">
                            {/* Auth Mode Toggle */}
                            <div className="flex items-center justify-center">
                                <div className="flex rounded-lg border bg-slate-50 p-1 text-sm">
                                    <button
                                        type="button"
                                        className={`px-4 py-1.5 rounded-md font-medium transition-all ${authMode === "password"
                                            ? "bg-white text-emerald-700 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                            }`}
                                        onClick={() => setAuthMode("password")}
                                    >
                                        Password
                                    </button>
                                    <button
                                        type="button"
                                        className={`px-4 py-1.5 rounded-md font-medium transition-all ${authMode === "otp"
                                            ? "bg-white text-emerald-700 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                            }`}
                                        onClick={() => setAuthMode("otp")}
                                    >
                                        OTP
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleDemoSubmit} className="space-y-4">
                                {/* Identifier Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="identifier" className="text-sm font-medium text-slate-700">
                                        {audience === "user" ? "Mobile Number or Email" : "Username"}
                                    </Label>
                                    <Input
                                        id="identifier"
                                        type="text"
                                        placeholder={audience === "user" ? "Enter mobile or email" : "e.g., da.shimla"}
                                        className="h-11 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                                    />
                                </div>

                                {/* Password Field (only for password mode) */}
                                {authMode === "password" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter your password"
                                                className="h-11 pr-10 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* OTP Channel Selection (only for OTP mode) */}
                                {authMode === "otp" && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-slate-700">
                                            Send OTP via
                                        </Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button type="button" variant="outline" className="h-10">
                                                📱 SMS
                                            </Button>
                                            <Button type="button" variant="outline" className="h-10">
                                                📧 Email
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* CAPTCHA Section */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">
                                        Security Check
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <div className="mb-2 rounded-lg border bg-slate-50 px-3 py-2 text-center text-base font-semibold text-slate-700">
                                                5 + 7 = ? <span className="text-sm font-normal text-slate-500">(solve)</span>
                                            </div>
                                            <Input
                                                placeholder="Enter the answer"
                                                inputMode="numeric"
                                                className="h-10 bg-white border-slate-200 focus:border-emerald-500"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 shrink-0"
                                            aria-label="Refresh captcha"
                                        >
                                            🔄
                                        </Button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/25"
                                    disabled={isLoading}
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
                            </form>

                            {/* Forgot Password */}
                            <div className="text-center text-sm">
                                <button className="text-emerald-600 hover:text-emerald-700 hover:underline">
                                    Forgot your password?
                                </button>
                            </div>

                            {/* Register Link (only for users) */}
                            {audience === "user" && (
                                <div className="text-center pt-4 border-t border-slate-100">
                                    <p className="text-sm text-slate-600">
                                        New to HP Tourism Portal?{" "}
                                        <button className="text-emerald-600 font-semibold hover:underline">
                                            Create an account
                                        </button>
                                    </p>
                                </div>
                            )}

                            {/* Help for officers */}
                            {audience === "office" && (
                                <div className="text-center pt-4 border-t border-slate-100">
                                    <p className="text-xs text-slate-500">
                                        Need access? Contact your district administrator.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Feature Pills */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {["Secure Login", "OTP Verification", "24/7 Support"].map((feature) => (
                            <span
                                key={feature}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-white/90 border border-white/20"
                            >
                                <Sparkles className="w-3 h-3" />
                                {feature}
                            </span>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 text-center py-4 text-xs text-white/60">
                © 2025 Department of Tourism, Himachal Pradesh Government
            </footer>
        </div>
    );
}
