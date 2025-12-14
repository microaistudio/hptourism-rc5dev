import { generateCertificatePDF } from "../client/src/lib/certificateGenerator";
import type { HomestayApplication } from "@shared/schema";

type DraftInput = {
  certificateNumber: string,
  applicationNumber: string,
  propertyName: string,
  ownerName: string,
  address: string,
  district: string,
  pincode: string,
  totalRooms: number,
  category: string,
  issueDate?: string,
  expiryDate?: string,
};

const createApplication = (draft: DraftInput): HomestayApplication => ({
  id: draft.applicationNumber,
  userId: `draft-${draft.applicationNumber}`,
  applicationNumber: draft.applicationNumber,
  certificateNumber: draft.certificateNumber,
  propertyName: draft.propertyName,
  ownerName: draft.ownerName,
  address: draft.address,
  district: draft.district,
  pincode: draft.pincode,
  totalRooms: draft.totalRooms,
  category: draft.category,
  certificateIssuedDate: draft.issueDate,
  certificateExpiryDate: draft.expiryDate,
  applicationKind: "new_registration",
  status: "approved",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ownerMobile: "",
  ownerEmail: "",
  ownerGender: "male",
  locationType: "gp",
  propertyOwnership: "owned",
  projectType: "new_project",
  propertyArea: "0",
  attachedWashrooms: 0,
  singleBedRooms: 0,
  doubleBedRooms: 0,
  familySuites: 0,
  applicationKindFeesContext: null,
  applicationKindServiceContext: null,
});

const drafts: DraftInput[] = [
  {
    certificateNumber: "DRAFT-GC-001",
    applicationNumber: "DRAFT-APP-001",
    propertyName: "Green Chakloo",
    ownerName: "Hemant Kumar",
    address: "Village Chakloo, PO Baldeyan",
    district: "Shimla",
    pincode: "171015",
    totalRooms: 6,
    category: "silver",
  },
  {
    certificateNumber: "DRAFT-DI-002",
    applicationNumber: "DRAFT-APP-002",
    propertyName: "Devbhoomi Inn Shimla",
    ownerName: "Devender Kumar Chauhan",
    address: "Chauhan Cottage, Lower Kachighatti",
    district: "Shimla",
    pincode: "171202",
    totalRooms: 4,
    category: "silver",
  },
  {
    certificateNumber: "DRAFT-HH-003",
    applicationNumber: "DRAFT-APP-003",
    propertyName: "Humble Home Stay",
    ownerName: "Tashi Palmo",
    address: "Palmo Cottage, VPO Beolia",
    district: "Shimla",
    pincode: "171013",
    totalRooms: 4,
    category: "silver",
  },
];

for (const draft of drafts) {
  const application = createApplication(draft);
  generateCertificatePDF(application, "policy_portrait");
  generateCertificatePDF(application, "policy_landscape");
  generateCertificatePDF(application, "policy_heritage");
}
