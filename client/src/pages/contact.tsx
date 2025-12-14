import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { Mail, Phone, MapPin, Clock, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";

const contacts = [
  {
    title: "Tourism & Civil Aviation Department",
    address: "Block No. 28, SDA Complex, Kasumpti, Shimla, Himachal Pradesh 171009",
    phone: "0177-2625924",
    email: "tourismmin-hp@nic.in",
  },
];

export default function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50">
      <NavigationHeader
        title="HP Tourism Portal"
        subtitle="Homestay & B&B Registration"
        showBack={false}
        showHome
        actions={
          <Button variant="outline" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
            Scroll to map
          </Button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-4 w-4" />
            <span>We’re here to help</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Contact HP Tourism eServices</h1>
          <p className="text-slate-600 max-w-3xl">
            Reach out for help with homestay registrations, approvals, payments, or portal access. Choose the option that best
            fits your query, or drop by our Shimla office.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm border-emerald-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                General Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <p>Questions about applications, inspections, or payment links? Our helpdesk can assist during business hours.</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-slate-600">tourismmin-hp@nic.in</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <p className="text-slate-600">0177-2625924 (10 AM – 5 PM)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Hours</p>
                    <p className="text-slate-600">Monday to Friday, IST</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-emerald-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Officer & Admin Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>Need officer credentials, role updates, or password resets? Reach out to your division admin or contact us.</p>
              <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-900">
                Tip: If you picked the wrong login, switch on the sign-in screen to the Officer or Applicant view.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-emerald-100 shadow-sm">
          <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
            <div className="h-[360px] w-full">
              <iframe
                title="Tourism & Civil Aviation Department Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3435.710927145389!2d77.15533787509016!3d31.092098274378563!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3905786d3290d9e5%3A0x2aa95a012d56e0b4!2sDept.%20of%20Tourism%20and%20Civil%20Aviation%20HP!5e0!3m2!1sen!2sin!4v1708600000000!5m2!1sen!2sin"
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="p-6 space-y-4 bg-white">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Visit us</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{contacts[0].address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Call</p>
                  <p className="text-sm text-slate-700">{contacts[0].phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Email</p>
                  <p className="text-sm text-slate-700">{contacts[0].email}</p>
                </div>
              </div>
              <div className="pt-2">
                <Button asChild className="w-full sm:w-auto">
                  <a href="https://mail.google.com/mail/?view=cm&fs=1&to=tourismmin-hp@nic.in" target="_blank" rel="noreferrer">
                    Drop us an email
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
