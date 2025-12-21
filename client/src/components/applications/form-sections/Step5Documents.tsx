import { Dispatch, SetStateAction } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, Paperclip } from "lucide-react";
import { ObjectUploader, type UploadedFileMetadata } from "@/components/ObjectUploader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface UploadedDocuments {
    revenuePapers: UploadedFileMetadata[];
    affidavitSection29: UploadedFileMetadata[];
    undertakingFormC: UploadedFileMetadata[];
    commercialElectricityBill: UploadedFileMetadata[];
    commercialWaterBill: UploadedFileMetadata[];
}

interface Step5DocumentsProps {
    uploadedDocuments: UploadedDocuments;
    setUploadedDocuments: Dispatch<SetStateAction<UploadedDocuments>>;
    propertyPhotos: UploadedFileMetadata[];
    setPropertyPhotos: Dispatch<SetStateAction<UploadedFileMetadata[]>>;
    additionalDocuments: UploadedFileMetadata[];
    setAdditionalDocuments: Dispatch<SetStateAction<UploadedFileMetadata[]>>;
    requiresCommercialUtilityProof: boolean;
    isCorrection?: boolean;
    correctionNotes?: string;
    applicationKind?: string;
    isLegacyRC?: boolean;
}

export function Step5Documents({
    uploadedDocuments,
    setUploadedDocuments,
    propertyPhotos,
    setPropertyPhotos,
    additionalDocuments,
    setAdditionalDocuments,
    requiresCommercialUtilityProof,
    isCorrection = false,
    correctionNotes,
    applicationKind,
    isLegacyRC = false,
}: Step5DocumentsProps) {

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle>Upload Documents (ANNEXURE-II)</CardTitle>
                </div>
                <CardDescription>Upload required documents as per 2025 Homestay Rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Correction Mode Banner */}
                {isCorrection && (
                    <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 dark:text-amber-200">
                            {isLegacyRC ? "Existing RC - Supporting Documents" : "Correction Mode"}
                        </AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                            {isLegacyRC ? (
                                "Upload any supporting documents needed for your Existing RC application. Only supporting documents (PDF or JPG format) are required."
                            ) : (
                                <>Please update the documents that need correction and resubmit your application.</>
                            )}
                            {correctionNotes && (
                                <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-700">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">DA Feedback:</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{correctionNotes}</p>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* For Legacy RC, show only supporting documents */}
                {isLegacyRC ? (
                    <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>Existing RC Applications</strong> only require supporting documents. You do not need to upload Revenue Papers, Affidavits, or other new registration documents.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Paperclip className="w-4 h-4 text-muted-foreground" />
                                <label className="text-sm font-medium">
                                    Supporting Documents (Up to 5 files)
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                                Upload any supporting documents such as NOC, fire safety certificate, water quality report, or any other relevant documents. (PDF or JPG format, Max 5 files)
                            </p>
                            <ObjectUploader
                                label="Upload Supporting Documents"
                                multiple={true}
                                maxFiles={5}
                                fileType="additional-document"
                                category="documents"
                                accept=".pdf,.jpg,.jpeg"
                                onUploadComplete={(paths) => setAdditionalDocuments(paths)}
                                existingFiles={additionalDocuments}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Revenue Papers (Jamabandi & Tatima) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Revenue Papers (Jamabandi & Tatima) <span className="text-destructive">*</span>
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Land revenue records showing ownership
                            </p>
                            <ObjectUploader
                                label="Upload Revenue Papers"
                                maxFiles={2}
                                fileType="revenue-papers"
                                onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, revenuePapers: paths }))}
                                existingFiles={uploadedDocuments.revenuePapers}
                                isMissing={uploadedDocuments.revenuePapers.length === 0}
                            />
                        </div>

                        {/* Affidavit under Section 29 */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Affidavit under Section 29 <span className="text-destructive">*</span>
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Sworn statement as per homestay regulations
                            </p>
                            <ObjectUploader
                                label="Upload Affidavit"
                                maxFiles={1}
                                fileType="affidavit-section29"
                                onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, affidavitSection29: paths }))}
                                existingFiles={uploadedDocuments.affidavitSection29}
                                isMissing={uploadedDocuments.affidavitSection29.length === 0}
                            />
                        </div>

                        {/* Undertaking in Form-C */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Undertaking in Form-C <span className="text-destructive">*</span>
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Signed undertaking form as per prescribed format
                            </p>
                            <ObjectUploader
                                label="Upload Form-C"
                                maxFiles={1}
                                fileType="undertaking-form-c"
                                onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, undertakingFormC: paths }))}
                                existingFiles={uploadedDocuments.undertakingFormC}
                                isMissing={uploadedDocuments.undertakingFormC.length === 0}
                            />
                        </div>

                        {requiresCommercialUtilityProof && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Proof of Commercial Electricity Bill <span className="text-destructive">*</span>
                                    </label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Upload the latest electricity bill that shows the commercial tariff for this property
                                    </p>
                                    <ObjectUploader
                                        label="Upload Electricity Bill"
                                        maxFiles={1}
                                        fileType="commercial-electricity-bill"
                                        onUploadComplete={(paths) =>
                                            setUploadedDocuments((prev) => ({ ...prev, commercialElectricityBill: paths }))
                                        }
                                        existingFiles={uploadedDocuments.commercialElectricityBill}
                                        isMissing={uploadedDocuments.commercialElectricityBill.length === 0}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Proof of Commercial Water Bill <span className="text-destructive">*</span>
                                    </label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Upload the commercial water connection bill for this homestay
                                    </p>
                                    <ObjectUploader
                                        label="Upload Water Bill"
                                        maxFiles={1}
                                        fileType="commercial-water-bill"
                                        onUploadComplete={(paths) =>
                                            setUploadedDocuments((prev) => ({ ...prev, commercialWaterBill: paths }))
                                        }
                                        existingFiles={uploadedDocuments.commercialWaterBill}
                                        isMissing={uploadedDocuments.commercialWaterBill.length === 0}
                                    />
                                </div>
                            </>
                        )}

                        {/* Property Photographs */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Property Photographs <span className="text-destructive">*</span> (Minimum 2 photos)
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Clear photos of property exterior, rooms, and facilities
                            </p>
                            <ObjectUploader
                                label="Upload Property Photos"
                                multiple={true}
                                maxFiles={10}
                                fileType="property-photo"
                                category="photos"
                                onUploadComplete={(paths) => setPropertyPhotos(paths)}
                                existingFiles={propertyPhotos}
                                isMissing={propertyPhotos.length < 2}
                            />
                        </div>

                        {/* Additional/Supporting Documents Section */}
                        <div className="space-y-2 border-t pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Paperclip className="w-4 h-4 text-muted-foreground" />
                                <label className="text-sm font-medium">
                                    Additional/Supporting Documents (Optional)
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                                Upload any supporting documents such as NOC, fire safety certificate, water quality report, etc. (Max 5 files)
                            </p>
                            <ObjectUploader
                                label="Upload Supporting Documents"
                                multiple={true}
                                maxFiles={5}
                                fileType="additional-document"
                                category="documents"
                                onUploadComplete={(paths) => setAdditionalDocuments(paths)}
                                existingFiles={additionalDocuments}
                            />
                        </div>

                        {/* Validation Messages */}
                        {(() => {
                            console.log("Step5Documents applicationKind:", applicationKind);
                            const isDeleteRooms = applicationKind === 'delete_rooms';

                            const missingRevenue = !isDeleteRooms && uploadedDocuments.revenuePapers.length === 0;
                            const missingAffidavit = !isDeleteRooms && uploadedDocuments.affidavitSection29.length === 0;
                            const missingUndertaking = !isDeleteRooms && uploadedDocuments.undertakingFormC.length === 0;
                            const missingElectricity =
                                !isDeleteRooms && requiresCommercialUtilityProof && uploadedDocuments.commercialElectricityBill.length === 0;
                            const missingWater =
                                !isDeleteRooms && requiresCommercialUtilityProof && uploadedDocuments.commercialWaterBill.length === 0;
                            const missingPhotos = !isDeleteRooms && propertyPhotos.length < 2;
                            const showWarning =
                                missingRevenue ||
                                missingAffidavit ||
                                missingUndertaking ||
                                missingElectricity ||
                                missingWater ||
                                missingPhotos;
                            if (!showWarning) {
                                return null;
                            }
                            return (
                                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mt-4">
                                    <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">Required documents missing:</p>
                                    <ul className="text-sm text-orange-700 dark:text-orange-300 list-disc list-inside space-y-1">
                                        {missingRevenue && <li>Revenue Papers (Jamabandi & Tatima)</li>}
                                        {missingAffidavit && <li>Affidavit under Section 29</li>}
                                        {missingUndertaking && <li>Undertaking in Form-C</li>}
                                        {missingElectricity && <li>Proof of commercial electricity bill</li>}
                                        {missingWater && <li>Proof of commercial water bill</li>}
                                        {missingPhotos && <li>At least 2 property photos ({propertyPhotos.length}/2)</li>}
                                    </ul>
                                </div>
                            );
                        })()}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
