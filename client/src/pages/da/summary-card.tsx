import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";

export type SummaryCardBreakdown = {
  label: string;
  value: number;
  variant?: "muted" | "warning" | "danger" | "success";
};

export type SlaNotice = {
  status: "ok" | "warning" | "danger";
  message: string;
};

interface SummaryCardProps {
  title: string;
  icon: LucideIcon;
  metric: number;
  breakdown: SummaryCardBreakdown[];
  accent?: "default" | "critical" | "warning";
  sla?: SlaNotice | null;
  onClick?: () => void;
}

const accentIconBg: Record<NonNullable<SummaryCardProps["accent"]>, string> = {
  default: "bg-muted text-primary",
  critical: "bg-rose-50 text-rose-600",
  warning: "bg-amber-50 text-amber-700",
};

const breakdownText: Record<NonNullable<SummaryCardBreakdown["variant"]>, string> = {
  muted: "text-muted-foreground",
  warning: "text-amber-700",
  danger: "text-rose-700",
  success: "text-emerald-700",
};

const slaTextStyles: Record<NonNullable<SlaNotice["status"]>, string> = {
  ok: "text-muted-foreground",
  warning: "text-amber-700",
  danger: "text-rose-700",
};

export function DASummaryCard({
  title,
  icon: Icon,
  metric,
  breakdown,
  accent = "default",
  sla,
  onClick,
}: SummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
    >
      <Card className="w-full h-full rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-tight text-muted-foreground">{title}</p>
              <p className="text-3xl font-semibold mt-1">{metric}</p>
            </div>
            <div className={cn("p-2 rounded-full", accentIconBg[accent])}>
              <Icon className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={cn("font-semibold", breakdownText[item.variant ?? "muted"])}>{item.value}</span>
              </div>
            ))}
          </div>

          {sla && (
            <div className={cn("text-xs flex items-center gap-2", slaTextStyles[sla.status])}>
              <AlertTriangle className="w-4 h-4" />
              <span>{sla.message}</span>
            </div>
          )}
        </div>
      </Card>
    </button>
  );
}
