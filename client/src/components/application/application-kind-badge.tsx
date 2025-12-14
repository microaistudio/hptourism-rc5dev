import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicationKind } from "@shared/schema";

const APPLICATION_KIND_META: Record<ApplicationKind, { label: string; className: string }> = {
  new_registration: {
    label: "New Registration",
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700",
  },
  renewal: {
    label: "Renewal",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700",
  },
  add_rooms: {
    label: "Add Rooms",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700",
  },
  delete_rooms: {
    label: "Delete Rooms",
    className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700",
  },
  cancel_certificate: {
    label: "Cancel Certificate",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700",
  },
};

export function getApplicationKindLabel(kind?: ApplicationKind | null) {
  const key = (kind ?? "new_registration") as ApplicationKind;
  return APPLICATION_KIND_META[key].label;
}

export function isServiceApplication(kind?: ApplicationKind | null) {
  return Boolean(kind && kind !== "new_registration");
}

interface ApplicationKindBadgeProps {
  kind?: ApplicationKind | null;
  showDefault?: boolean;
  className?: string;
}

export function ApplicationKindBadge({
  kind,
  showDefault = false,
  className,
}: ApplicationKindBadgeProps) {
  const resolvedKind = (kind ?? "new_registration") as ApplicationKind;

  if (!showDefault && resolvedKind === "new_registration") {
    return null;
  }

  const meta = APPLICATION_KIND_META[resolvedKind];

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wide border",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </Badge>
  );
}
