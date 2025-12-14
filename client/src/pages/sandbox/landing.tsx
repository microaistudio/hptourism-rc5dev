import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavigationHeader } from "@/components/navigation-header";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useLocation } from "wouter";
import { Sparkles, Users, ShieldCheck, FileSignature } from "lucide-react";

const mockStats = [
  { label: "Applications processed", value: "19,705" },
  { label: "Average SLA", value: "48 hrs" },
  { label: "District offices onboarded", value: "12" },
];

const officerLinks = [
  { title: "DA Dashboard", description: "Scrutiny & inspection queue" },
  { title: "DTDO Dashboard", description: "Field inspection workflow" },
  { title: "Payment Monitor", description: "HimKosh reconciliation" },
];

export default function SandboxLandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <NavigationHeader
        title="HP Tourism Sandbox"
        subtitle="Prototype landing concepts"
        showBack
        onBack={() => setLocation("/")}
        actions={
          <div className="flex gap-3">
            <ThemeSwitcher />
            <Button variant="outline" onClick={() => setLocation("/login?audience=user")}>
              User Login
            </Button>
            <Button onClick={() => setLocation("/login?audience=office")}>Office Login</Button>
          </div>
        }
      />

      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">prototype</p>
            <h1 className="text-4xl font-bold leading-tight">
              Digital front door for Himachal Pradesh Tourism eServices
            </h1>
            <p className="text-muted-foreground text-lg">
              This sandbox page lets us experiment with copy, entry points, and metrics without
              disturbing the production homepage. Use it to demo alternate hero layouts and officer
              pathways.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => alert("CTA placeholder")}>
                Apply for Homestay
              </Button>
              <Button size="lg" variant="outline" onClick={() => alert("CTA placeholder")}>
                Explore Officer Hub
              </Button>
            </div>
          </div>

          <Card className="shadow-lg border border-primary/10 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Demo Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockStats.map((stat) => (
                <div key={stat.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-semibold">{stat.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-white border-y py-12 px-4">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" /> Split Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Prototype how we separate owner vs. officer journeys to reduce confusion on the main
              sign in page.
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="w-5 h-5 text-primary" /> Trust Signals
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Showcase compliance badges, SLAs, and approvals to build confidence for demos.
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSignature className="w-5 h-5 text-primary" /> Contact & CTA strip
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Lorem ipsum copy to mock how contact emails, toll-free numbers, and downloads could be
              presented.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 py-16 bg-gradient-to-b from-slate-100 to-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-8">Officer quick links (mock)</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {officerLinks.map((link) => (
              <Card key={link.title} className="shadow">
                <CardHeader>
                  <CardTitle>{link.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {link.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
