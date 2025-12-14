import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepConfig {
  id: number;
  label: string;
  shortLabel: string;
  requiredFields: string[];
  icon?: LucideIcon;
}

interface ApplicationStepperProps {
  currentStep: number;
  maxStepReached: number;
  totalSteps: number;
  formData: Record<string, any>;
  onStepClick: (step: number) => void;
  steps: StepConfig[];
}

export function ApplicationStepper({
  currentStep,
  maxStepReached,
  totalSteps,
  formData,
  onStepClick,
  steps,
}: ApplicationStepperProps) {
  const calculateStepCompletion = (step: StepConfig): number => {
    const requiredFields = step.requiredFields;
    if (requiredFields.length === 0) return 0;

    const filledFields = requiredFields.filter((field) => {
      const value = formData[field];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "string") return value.trim() !== "";
      if (typeof value === "number") return value > 0;
      return value !== null && value !== undefined && value !== "";
    });

    return Math.round((filledFields.length / requiredFields.length) * 100);
  };

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const completion = calculateStepCompletion(step);
          const isActive = currentStep === step.id;
          const isPast = currentStep > step.id;
          const isClickable = step.id <= maxStepReached;

          return (
            <div key={step.id} className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "w-full text-left transition-all",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
                data-testid={`stepper-step-${step.id}`}
              >
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                        isActive && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                        isPast && !isActive && "bg-primary/20 text-primary",
                        !isActive && !isPast && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isPast ? (
                        <Check className="w-4 h-4" />
                      ) : step.icon ? (
                        <step.icon className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-xs font-medium truncate transition-colors",
                          isActive && "text-primary",
                          isPast && !isActive && "text-foreground",
                          !isActive && !isPast && "text-muted-foreground"
                        )}
                      >
                        {step.shortLabel}
                      </p>
                      {completion > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {completion}% complete
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        isActive && "bg-primary",
                        isPast && !isActive && "bg-primary/60",
                        !isActive && !isPast && "bg-muted-foreground/20"
                      )}
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>
              </button>

              {index < totalSteps - 1 && (
                <div className="hidden sm:block w-full h-0.5 bg-muted absolute top-3.5 left-1/2 -translate-y-1/2 -z-10" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
