
import { UseFormReturn } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ApplicationForm } from "@/lib/application-schema";

interface Step6SimpleReviewProps {
    form: UseFormReturn<ApplicationForm>;
    submitConfirmed: boolean;
    setSubmitConfirmed: (confirmed: boolean) => void;
    activeDraftApplication: any;
    title?: string;
    description?: string;
    confirmationText?: string;
    currentRooms?: number;
}

export function Step6SimpleReview({
    form,
    submitConfirmed,
    setSubmitConfirmed,
    activeDraftApplication,
    title = "Review & Submit",
    description = "Please review your request details below before submitting.",
    confirmationText = "I confirm that the details provided are accurate and I want to submit this request.",
    currentRooms
}: Step6SimpleReviewProps) {
    const parentApplicationNumber = activeDraftApplication?.parentApplicationNumber;

    // Calculate simple room summary from form
    const single = Number(form.watch("singleBedRooms")) || 0;
    const double = Number(form.watch("doubleBedRooms")) || 0;
    const suite = Number(form.watch("familySuites")) || 0;
    const totalRooms = single + double + suite;

    return (
        <div className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50 text-blue-900">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-700 font-semibold">{title}</AlertTitle>
                <AlertDescription className="text-blue-800">
                    {description}
                </AlertDescription>
            </Alert>

            <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Request Summary
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Application Type:</span>
                        <p className="font-medium">Delete Rooms (Update Inventory)</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Parent Application:</span>
                        <p className="font-medium">{parentApplicationNumber || "N/A"}</p>
                    </div>
                    {currentRooms !== undefined && (
                        <div>
                            <span className="text-muted-foreground">Current Rooms:</span>
                            <p className="font-medium text-lg">{currentRooms}</p>
                        </div>
                    )}
                    <div>
                        <span className="text-muted-foreground">New Total Rooms:</span>
                        <p className="font-medium text-emerald-600 text-lg">{totalRooms}</p>
                    </div>
                    <div className="col-span-2">
                        <span className="text-muted-foreground">New Configuration:</span>
                        <p className="font-medium">
                            {single} Single, {double} Double, {suite} Suites
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 space-y-4">
                <h3 className="font-semibold text-lg text-slate-900">Confirmation</h3>
                <div className="flex items-start space-x-3">
                    <Checkbox
                        id="confirm-submit"
                        checked={submitConfirmed}
                        onCheckedChange={(checked) => setSubmitConfirmed(checked === true)}
                        className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none">
                        <label
                            htmlFor="confirm-submit"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900"
                        >
                            {confirmationText}
                        </label>
                        <p className="text-sm text-slate-500">
                            I certify that I am the authorized owner/representative of this property.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
