import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { 
  Mountain, MapPin, Bed, Star, Phone, Mail, 
  CheckCircle2, ArrowLeft, Home
} from "lucide-react";
import type { HomestayApplication } from "@shared/schema";

export default function PublicPropertyDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ properties: HomestayApplication[] }>({
    queryKey: ["/api/public/properties"],
  });

  const property = data?.properties?.find((p: HomestayApplication) => p.id === id);

  if (isLoading) {
    return (
      <div className="bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader className="space-y-3">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Mountain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The property you're looking for doesn't exist or is not available.
            </p>
            <Link href="/properties">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Properties
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getCategoryBadge = (category: string) => {
    const config = {
      diamond: { label: "Diamond", variant: "default" as const },
      gold: { label: "Gold", variant: "secondary" as const },
      silver: { label: "Silver", variant: "outline" as const },
    };
    return config[category as keyof typeof config] || config.silver;
  };

  const categoryBadge = getCategoryBadge(property.category);
  const amenitiesList = property.amenities ? Object.entries(property.amenities as any)
    .filter(([, value]) => value)
    .map(([key]) => ({
      id: key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
    })) : [];

  return (
    <div className="bg-background">
      <NavigationHeader 
        title={property.propertyName}
        backTo="/properties"
      />

      {/* Property Details */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={categoryBadge.variant} className="text-sm">
                        {categoryBadge.label}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        <span className="text-sm font-medium">Government Certified</span>
                      </div>
                    </div>
                    <CardTitle className="text-3xl" data-testid="text-property-name">
                      {property.propertyName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2 text-base">
                      <MapPin className="w-4 h-4" />
                      {property.district}, Himachal Pradesh
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">About This Property</h3>
                  <p className="text-muted-foreground">
                    {property.address}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bed className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Rooms</p>
                      <p className="font-semibold">{property.totalRooms} {property.totalRooms === 1 ? 'Room' : 'Rooms'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-semibold">{categoryBadge.label}</p>
                    </div>
                  </div>
                </div>

                {amenitiesList.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {amenitiesList.map(amenity => (
                        <div key={amenity.id} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span className="text-sm">{amenity.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-lg mb-3">Certification Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificate Number:</span>
                      <span className="font-medium">{property.certificateNumber || property.applicationNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="default">Approved</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Contact Property Owner</CardTitle>
                <CardDescription>Get in touch to book your stay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner Name</label>
                  <p className="text-base font-medium mt-1">{property.ownerName}</p>
                </div>

                <div className="space-y-2">
                  <Button className="w-full" asChild data-testid="button-call">
                    <a href={`tel:${property.ownerMobile}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      {property.ownerMobile}
                    </a>
                  </Button>

                  {property.ownerEmail && (
                    <Button className="w-full" variant="outline" asChild data-testid="button-email">
                      <a href={`mailto:${property.ownerEmail}`}>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </a>
                    </Button>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    This is a government-certified homestay registered under the Himachal Pradesh Homestay Rules 2025.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
