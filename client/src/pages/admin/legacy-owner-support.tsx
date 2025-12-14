import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, FileText, Share2 } from "lucide-react";

const ownerFlowUrl = "/existing-owner";

const checklist = [
  {
    title: "Verified RC Copy",
    description: "Ensure the owner has a scanned copy of their valid Registration Certificate.",
  },
  {
    title: "Ownership Proof",
    description: "Collect the latest property tax/revenue record proving ownership.",
  },
  {
    title: "Utility Bill",
    description: "A recent (last 3 months) commercial electricity or water bill is required.",
  },
  {
    title: "Consent Letter",
    description: "If the operator is different from the owner, obtain a signed consent letter.",
  },
];

export default function LegacyOwnerSupport() {
  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin Toolkit</p>
        <h1 className="text-3xl font-bold">Legacy Owner Support</h1>
        <p className="text-muted-foreground">
          Use this playbook while onboarding existing RC holders into the digital workflow. Share the owner link, verify artefacts, and track migrations.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share Owner Link
            </CardTitle>
            <CardDescription>Open the public facing legacy form in a separate window and share with the applicant.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href={ownerFlowUrl} target="_blank" rel="noreferrer">
                Preview Owner Flow
              </a>
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard
                  .writeText(new URL(ownerFlowUrl, window.location.origin).toString())
                  .catch(() => null);
              }}
            >
              Copy Link
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {checklist.map((item) => (
            <div key={item.title} className="rounded-lg border p-4">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Migration Checklist
            </CardTitle>
            <CardDescription>Quick steps for the admin desk to validate and migrate legacy owners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Verify RC copy and match details with district records.</p>
            <p>2. Confirm supporting documents and scan quality.</p>
            <p>3. Create/assign a DA for the district if not already mapped.</p>
            <p>4. Log the migration case in the district tracker sheet.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reference Material
            </CardTitle>
            <CardDescription>Handy references while helping owners on calls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Owner FAQ Deck</p>
                <p className="text-sm text-muted-foreground">Talking points for typical onboarding queries.</p>
              </div>
              <Badge variant="outline">Coming soon</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">District Escalation Sheet</p>
                <p className="text-sm text-muted-foreground">Keep DA/DTDO contact list updated weekly.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href="/admin/super-console#communications">Update</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
