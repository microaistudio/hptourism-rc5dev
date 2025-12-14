export const MANDATORY_POINTS = [
  { key: "applicationForm", label: "Application form as per ANNEXURE I" },
  { key: "documents", label: "Documents list as per ANNEXURE II" },
  { key: "onlinePayment", label: "Online payment facility (UPI/Net Banking/Cards)" },
  { key: "wellMaintained", label: "Well-maintained furnished home with quality flooring" },
  { key: "cleanRooms", label: "Clean, airy, pest-free rooms with external ventilation" },
  { key: "comfortableBedding", label: "Comfortable bedding with quality fabrics" },
  { key: "roomSize", label: "Minimum room & bathroom size compliance" },
  { key: "cleanKitchen", label: "Smoke-free, clean, hygienic, odor-free kitchen" },
  { key: "cutleryCrockery", label: "Good quality cutlery and crockery" },
  { key: "waterFacility", label: "RO/Aquaguard/Mineral water availability" },
  { key: "wasteDisposal", label: "Waste disposal as per municipal laws" },
  { key: "energySavingLights", label: "Energy-saving lights (CFL/LED) in rooms & public areas" },
  { key: "visitorBook", label: "Visitor book and feedback facilities" },
  { key: "doctorDetails", label: "Doctor names, addresses, phone numbers displayed" },
  { key: "luggageAssistance", label: "Lost luggage assistance facilities" },
  { key: "fireEquipment", label: "Basic fire equipment available" },
  { key: "guestRegister", label: "Guest check-in/out register (with passport details for foreigners)" },
  { key: "cctvCameras", label: "CCTV cameras in common areas" },
] as const;

export const DESIRABLE_POINTS = [
  { key: "parking", label: "Parking with adequate road width" },
  { key: "attachedBathroom", label: "Attached private bathroom with toiletries" },
  { key: "toiletAmenities", label: "Toilet with seat, lid, and toilet paper" },
  { key: "hotColdWater", label: "Hot & cold running water with sewage connection" },
  { key: "waterConservation", label: "Water conservation taps/showers" },
  { key: "diningArea", label: "Dining area serving fresh & hygienic food" },
  { key: "wardrobe", label: "Wardrobe with minimum 4 hangers in guest rooms" },
  { key: "storage", label: "Cabinets or drawers for storage in rooms" },
  { key: "furniture", label: "Quality chairs, work desk, and furniture" },
  { key: "laundry", label: "Washing machine/dryer or laundry services" },
  { key: "refrigerator", label: "Refrigerator in homestay" },
  { key: "lounge", label: "Lounge or sitting arrangement in lobby" },
  { key: "heatingCooling", label: "Heating & cooling in closed public rooms" },
  { key: "luggageHelp", label: "Assistance with luggage on request" },
  { key: "safeStorage", label: "Safe storage facilities in rooms" },
  { key: "securityGuard", label: "Security guard facilities" },
  { key: "himachaliCrafts", label: "Promotion of Himachali handicrafts & architecture" },
  { key: "rainwaterHarvesting", label: "Rainwater harvesting system" },
] as const;

export const MANDATORY_TOTAL = MANDATORY_POINTS.length;
export const DESIRABLE_TOTAL = DESIRABLE_POINTS.length;
