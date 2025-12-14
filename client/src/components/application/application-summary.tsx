import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HomestayApplication } from "@shared/schema";

export interface SummaryRow {
  label: string;
  value?: ReactNode;
}

interface OwnerSummary {
  name?: string | null;
  mobile?: string | null;
  email?: string | null;
}

interface ApplicationSummaryCardProps {
  application: Partial<HomestayApplication>;
  owner?: OwnerSummary;
  title?: string;
  icon?: ReactNode;
  extraRows?: SummaryRow[];
  className?: string;
  highlightCategoryBadge?: boolean;
}

const formatCategory = (category?: string | null) => {
  if (!category) {
    return undefined;
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const buildLocation = (app: Partial<HomestayApplication>) => {
  const parts = [
    app.address,
    app.tehsilOther && app.tehsil === "__other" ? app.tehsilOther : app.tehsil,
    app.district,
    app.pincode,
  ].filter((part): part is string => Boolean(part && part.toString().trim().length));

  return parts.join(", ");
};

const renderValue = (value?: ReactNode) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return value;
};

export function ApplicationSummaryCard({
  application,
  owner,
  title = "Application Summary",
  icon,
  extraRows = [],
  className,
  highlightCategoryBadge = true,
}: ApplicationSummaryCardProps) {
  const ownerName = owner?.name ?? application.ownerName;
  const ownerMobile = owner?.mobile ?? application.ownerMobile;
  const location = buildLocation(application);

  const rows: SummaryRow[] = [
    { label: "Application #", value: application.applicationNumber || application.id },
    { label: "Property Name", value: application.propertyName },
    { label: "Owner", value: ownerName },
    { label: "Contact", value: ownerMobile },
    { label: "Email", value: owner?.email ?? (application as any)?.ownerEmail },
    { label: "Location", value: location },
    { label: "Total Rooms", value: application.totalRooms != null ? application.totalRooms.toString() : undefined },
  ];

  if (highlightCategoryBadge && application.category) {
    rows.push({
      label: "Category",
      value: (
        <Badge variant="secondary" className="capitalize">
          {formatCategory(application.category)}
        </Badge>
      ),
    });
  } else {
    rows.push({ label: "Category", value: formatCategory(application.category) });
  }

  rows.push({
    label: "Status",
    value: application.status ? application.status.replace(/_/g, " ") : undefined,
  });

  const combinedRows = [...rows, ...extraRows];

  return (
    <Card className={cn("space-y-2", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {combinedRows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium text-right">{renderValue(row.value)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
