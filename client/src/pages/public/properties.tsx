import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { NavigationHeader } from "@/components/navigation-header";
import { IconStyleToggle } from "@/components/icon-style-toggle";
import { 
  Mountain, MapPin, Bed, Star, Search, Filter, 
  Wifi, Car, AirVent, Eye, UtensilsCrossed, Droplet,
  Trees, Tv, Coffee, Wind, Sparkles
} from "lucide-react";
import type { HomestayApplication } from "@shared/schema";

const HP_DISTRICTS = [
  "All Districts",
  "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu",
  "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
];

const AMENITIES = [
  { id: "wifi", label: "WiFi", emoji: "📶", icon: Wifi, colorClass: "amenity-wifi" },
  { id: "parking", label: "Parking", emoji: "🚗", icon: Car, colorClass: "amenity-parking" },
  { id: "ac", label: "Air Conditioning", emoji: "❄️", icon: AirVent, colorClass: "amenity-ac" },
  { id: "mountainView", label: "Mountain View", emoji: "👁️", icon: Eye, colorClass: "amenity-view" },
  { id: "restaurant", label: "Restaurant", emoji: "🍽️", icon: UtensilsCrossed, colorClass: "amenity-restaurant" },
  { id: "hotWater", label: "Hot Water 24/7", emoji: "💧", icon: Droplet, colorClass: "amenity-water" },
  { id: "garden", label: "Garden", emoji: "🌳", icon: Trees, colorClass: "amenity-garden" },
  { id: "tv", label: "Television", emoji: "📺", icon: Tv, colorClass: "amenity-tv" },
  { id: "breakfast", label: "Breakfast", emoji: "☕", icon: Coffee, colorClass: "amenity-breakfast" },
  { id: "heater", label: "Room Heater", emoji: "🔥", icon: Wind, colorClass: "amenity-heater" },
];

export default function PublicProperties() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedAmenities, setSelectedAmenities] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery<{ properties: HomestayApplication[] }>({
    queryKey: ["/api/public/properties"],
    staleTime: 0, // Override global staleTime to always fetch fresh data
    refetchOnMount: true, // Always refetch when component mounts
  });

  const properties = data?.properties || [];

  // Filter properties
  const filteredProperties = properties.filter((property) => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      property.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    // District filter
    const matchesDistrict = selectedDistrict === "All Districts" || 
      property.district === selectedDistrict;
    
    // Category filter
    const matchesCategory = selectedCategory === "All Categories" || 
      property.category === selectedCategory.toLowerCase();
    
    // Amenities filter
    const selectedAmenitiesList = Object.keys(selectedAmenities).filter(
      key => selectedAmenities[key]
    );
    const matchesAmenities = selectedAmenitiesList.length === 0 || 
      selectedAmenitiesList.every(amenity => 
        property.amenities && (property.amenities as any)[amenity]
      );
    
    return matchesSearch && matchesDistrict && matchesCategory && matchesAmenities;
  });

  const getCategoryBadge = (category: string) => {
    const config = {
      diamond: { label: "Diamond", variant: "default" as const, icon: Sparkles },
      gold: { label: "Gold", variant: "secondary" as const, icon: Star },
      silver: { label: "Silver", variant: "outline" as const, icon: Star },
    };
    return config[category as keyof typeof config] || config.silver;
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev => ({
      ...prev,
      [amenityId]: !prev[amenityId]
    }));
  };

  return (
    <div className="bg-background">
      <NavigationHeader 
        title="Discover Himachal Pradesh"
        showBack={false}
        showHome={true}
        actions={<IconStyleToggle />}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Mountain className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground">
                Authentic homestays in the heart of the Himalayas
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by property name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Filter Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">District</label>
                    <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                      <SelectTrigger data-testid="select-district">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HP_DISTRICTS.map(district => (
                          <SelectItem key={district} value={district}>{district}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Categories">All Categories</SelectItem>
                        <SelectItem value="Diamond">Diamond</SelectItem>
                        <SelectItem value="Gold">Gold</SelectItem>
                        <SelectItem value="Silver">Silver</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">Amenities</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {AMENITIES.map(amenity => {
                      const Icon = amenity.icon;
                      return (
                        <div 
                          key={amenity.id} 
                          className="flex items-center space-x-2 p-2 rounded-md hover-elevate cursor-pointer"
                          onClick={() => toggleAmenity(amenity.id)}
                        >
                          <Checkbox
                            id={amenity.id}
                            checked={selectedAmenities[amenity.id] || false}
                            onCheckedChange={() => toggleAmenity(amenity.id)}
                            data-testid={`checkbox-${amenity.id}`}
                          />
                          <label htmlFor={amenity.id} className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                            <div className={`amenity-icon ${amenity.colorClass}`}>
                              <span className="text-lg emoji-icon">{amenity.emoji}</span>
                              <Icon className="w-4 h-4 svg-icon" />
                            </div>
                            <span className="line-clamp-1">{amenity.label}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Properties Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground" data-testid="text-results-count">
            {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="hover-elevate">
                <CardHeader className="space-y-2">
                  <div className="h-6 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <Card className="p-12 text-center">
            <Mountain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => {
              const categoryBadge = getCategoryBadge(property.category);
              const CategoryIcon = categoryBadge.icon;
              
              // Get available amenities with icons
              const availableAmenities = property.amenities 
                ? Object.entries(property.amenities as any)
                    .filter(([, value]) => value)
                    .map(([key]) => AMENITIES.find(a => a.id === key))
                    .filter(Boolean)
                    .slice(0, 6)
                : [];

              return (
                <Link key={property.id} href={`/properties/${property.id}`}>
                  <Card className="hover-elevate active-elevate-2 h-full cursor-pointer" data-testid={`card-property-${property.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={categoryBadge.variant} className="flex items-center gap-1">
                          <CategoryIcon className="w-3 h-3" />
                          {categoryBadge.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Star className="w-4 h-4 fill-primary" />
                          <span className="font-medium">Certified</span>
                        </div>
                      </div>
                      <CardTitle className="line-clamp-1">{property.propertyName}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {property.district}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {property.address}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Bed className="w-4 h-4 text-muted-foreground" />
                        <span>{property.totalRooms} {property.totalRooms === 1 ? 'room' : 'rooms'}</span>
                      </div>
                      
                      {/* Amenities with icons */}
                      {availableAmenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          {availableAmenities.map((amenity) => {
                            if (!amenity) return null;
                            const AmenityIcon = amenity.icon;
                            return (
                              <div 
                                key={amenity.id}
                                className={`property-amenity-icon ${amenity.colorClass}`}
                                title={amenity.label}
                              >
                                <span className="emoji-icon">{amenity.emoji}</span>
                                <AmenityIcon className="w-4 h-4 svg-icon" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <Button className="w-full" variant="outline" size="sm">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
