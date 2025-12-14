import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NavigationHeader } from "@/components/navigation-header";
import {
    ShieldCheck,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowLeft,
    User,
    Building,
    MapPin,
    Calendar,
    Award,
    Clock
} from "lucide-react";

export default function VerifyCertificatePage() {
    const [, setLocation] = useLocation();
    const searchString = useSearch();
    const params = new URLSearchParams(searchString);

    const initialCert = params.get("cert") || "";

    const [certificateNumber, setCertificateNumber] = useState(initialCert);
    const [searchQuery, setSearchQuery] = useState(initialCert);

    const { data: certificate, isLoading, error } = useQuery({
        queryKey: ["/api/certificates/verify", searchQuery],
        queryFn: async () => {
            if (!searchQuery) return null;
            const response = await fetch(`/api/certificates/verify?cert=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error("Failed to verify certificate");
            }
            return response.json();
        },
        enabled: !!searchQuery,
    });

    const handleVerify = () => {
        if (certificateNumber.trim()) {
            setSearchQuery(certificateNumber.trim());
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <NavigationHeader
                title="Verify Certificate"
                subtitle="Check certificate authenticity"
                showBack={true}
                onBack={() => setLocation("/")}
            />

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Search Card */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" />
                            Verify Homestay Certificate
                        </CardTitle>
                        <CardDescription>
                            Enter the certificate number to verify its authenticity
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <Input
                                placeholder="Enter certificate number (e.g., HP-HS-CERT-2025-XXXXX)"
                                value={certificateNumber}
                                onChange={(e) => setCertificateNumber(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                                className="flex-1"
                            />
                            <Button onClick={handleVerify} disabled={isLoading}>
                                {isLoading ? "Verifying..." : "Verify"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                {isLoading && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                            <p className="text-muted-foreground">Verifying certificate...</p>
                        </CardContent>
                    </Card>
                )}

                {error && (
                    <Card className="border-red-200">
                        <CardContent className="py-12 text-center">
                            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                            <p className="text-red-600">Error verifying certificate. Please try again.</p>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && !error && searchQuery && !certificate && (
                    <Card className="border-red-200">
                        <CardContent className="py-12 text-center">
                            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                            <p className="text-red-700 font-medium mb-2">Certificate Not Found</p>
                            <p className="text-muted-foreground">
                                No valid certificate found with number "{searchQuery}".
                                Please verify the certificate number and try again.
                            </p>
                            <p className="text-sm text-red-600 mt-4">
                                ⚠️ This certificate may be invalid or fraudulent. Please contact the Tourism Department for verification.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {certificate && (
                    <Card className="border-green-200">
                        <CardHeader className="bg-green-50">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl text-green-800">Valid Certificate</CardTitle>
                                        <CardDescription className="text-green-700">
                                            This homestay certificate is authentic and valid
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Verified
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Award className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Certificate Number</p>
                                            <p className="font-medium font-mono">{certificate.certificateNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Building className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Property Name</p>
                                            <p className="font-medium">{certificate.propertyName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Owner Name</p>
                                            <p className="font-medium">{certificate.ownerName}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">District</p>
                                            <p className="font-medium">{certificate.district}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Award className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Category</p>
                                            <p className="font-medium capitalize">{certificate.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Valid Until</p>
                                            <p className="font-medium">
                                                {certificate.validUntil
                                                    ? new Date(certificate.validUntil).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })
                                                    : 'Lifetime'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    Verification Successful
                                </h4>
                                <p className="text-green-700 text-sm">
                                    This certificate has been issued by the HP Tourism Department and is valid for operating a {certificate.category} category homestay.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Back to Home */}
                <div className="mt-8 text-center">
                    <Button variant="outline" onClick={() => setLocation("/")}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
