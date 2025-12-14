import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Loader2,
  ArrowLeft,
  ClipboardCheck,
  AlertCircle,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { HomestayApplication } from "@shared/schema";
import { ApplicationSummaryCard } from "@/components/application/application-summary";

interface ApplicationData {
  application: HomestayApplication;
  owner: {
    fullName: string;
    mobile: string;
    email?: string;
  };
}

interface DealingAssistant {
  id: string;
  fullName: string;
  mobile: string;
}

const generateTimeSlots = (startHour = 8, endHour = 19) => {
  const slots: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      if (hour === endHour && minute > 45) continue;
      const labelHour = String(hour).padStart(2, "0");
      const labelMinute = String(minute).padStart(2, "0");
      slots.push(`${labelHour}:${labelMinute}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots(8, 19);

const formatTimeLabel = (slot: string) => {
  const [hour, minute] = slot.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return format(date, "h:mm a");
};

const combineDateAndTime = (date: Date, time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hour, minute, 0, 0);
  return combined;
};

export default function DTDOScheduleInspection() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>(TIME_SLOTS[8] ?? "10:00");
  const [assignedDA, setAssignedDA] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const { data, isLoading } = useQuery<ApplicationData>({
    queryKey: ["/api/dtdo/applications", id],
  });

  const { data: dasData } = useQuery<{ das: DealingAssistant[] }>({
    queryKey: ["/api/dtdo/available-das"],
  });

  const scheduleInspectionMutation = useMutation({
    mutationFn: async (data: {
      applicationId: string;
      inspectionDate: string;
      assignedTo: string;
      specialInstructions: string;
    }) => {
      const response = await apiRequest("POST", "/api/dtdo/schedule-inspection", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dtdo/applications"] });
      toast({
        title: "Inspection Scheduled",
        description: "The inspection order has been assigned to the DA successfully.",
      });
      setLocation("/dtdo/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule inspection. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Application Not Found</h3>
            <Button onClick={() => setLocation("/dtdo/dashboard")} className="mt-4" data-testid="button-back">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { application, owner } = data;

  const handleSchedule = () => {
    if (!selectedDate) {
      toast({
        title: "Validation Error",
        description: "Please select an inspection date",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTime) {
      toast({
        title: "Validation Error",
        description: "Please select an inspection time",
        variant: "destructive",
      });
      return;
    }

    if (!assignedDA) {
      toast({
        title: "Validation Error",
        description: "Please select a Dealing Assistant",
        variant: "destructive",
      });
      return;
    }

    // Ensure date is in the future
    const combinedDate = combineDateAndTime(selectedDate, selectedTime);
    if (combinedDate < new Date()) {
      toast({
        title: "Validation Error",
        description: "Inspection date must be in the future",
        variant: "destructive",
      });
      return;
    }

    scheduleInspectionMutation.mutate({
      applicationId: id!,
      inspectionDate: combinedDate.toISOString(),
      assignedTo: assignedDA,
      specialInstructions,
    });
  };

  const availableDAs = dasData?.das || [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const minSelectableDate = tomorrow;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/dtdo/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Inspection</h1>
          <p className="text-muted-foreground mt-1">
            Assign inspection order to a Dealing Assistant
          </p>
        </div>
      </div>

      {/* Application Summary */}
      <ApplicationSummaryCard
        title="Application Details"
        icon={<ClipboardCheck className="h-5 w-5" />}
        className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
        application={application}
        owner={{
          name: owner.fullName,
          mobile: owner.mobile,
          email: owner.email,
        }}
        extraRows={[
          { label: "Address", value: application.address },
          { label: "District", value: application.district },
          { label: "Tehsil", value: application.tehsil },
        ]}
      />

      {/* Inspection Scheduling Form */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
          <CardDescription>
            Schedule the site inspection and assign a Dealing Assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Inspection Date &amp; Time
            </Label>
            <div className="grid gap-3 sm:grid-cols-[1.4fr,0.6fr]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground",
                    )}
                    data-testid="button-inspection-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < minSelectableDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Select
                value={selectedTime}
                onValueChange={setSelectedTime}
                disabled={!selectedDate}
              >
                <SelectTrigger data-testid="select-inspection-time">
                  <SelectValue placeholder="Pick time slot" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {formatTimeLabel(slot)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Calendar opens from the next working day. Time slots are locked to 15-minute intervals
              (00, 15, 30, 45) to match DA field visits.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedDA" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Assign to Dealing Assistant
            </Label>
            <Select value={assignedDA} onValueChange={setAssignedDA}>
              <SelectTrigger id="assignedDA" data-testid="select-da">
                <SelectValue placeholder="Select a DA" />
              </SelectTrigger>
              <SelectContent>
                {availableDAs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No DAs available in this district
                  </div>
                ) : (
                  availableDAs.map((da) => (
                    <SelectItem key={da.id} value={da.id}>
                      {da.fullName} - {da.mobile}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Message for Owner (optional)</Label>
            <Textarea
              id="specialInstructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Share any visit prep guidance the owner should see (e.g., documents to keep ready, accessibility notes)."
              rows={4}
              data-testid="textarea-instructions"
            />
            <p className="text-xs text-muted-foreground">
              This note is included in the owner notification and shown on their dashboard.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSchedule}
              disabled={
                scheduleInspectionMutation.isPending ||
                !selectedDate ||
                !selectedTime ||
                !assignedDA
              }
              data-testid="button-schedule"
            >
              {scheduleInspectionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Schedule Inspection
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/dtdo/dashboard")}
              disabled={scheduleInspectionMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
