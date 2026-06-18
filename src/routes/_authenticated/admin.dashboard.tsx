import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Stethoscope, Building2, Ambulance, Calendar, IndianRupee,
  Shield, Pill, ArrowRight, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import { inr, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [doctors, patients, hospitals, providers, appts, payments, emergencies, pharmacies] = await Promise.all([
        supabase.from("doctors").select("id,is_verified,application_status"),
        supabase.from("profiles").select("id"),
        supabase.from("hospitals").select("id,is_verified,application_status"),
        supabase.from("ambulance_providers").select("id,is_verified,application_status"),
        supabase.from("appointments").select("id,status,scheduled_at,created_at"),
        supabase.from("payments").select("amount,status,refunded_amount,created_at"),
        supabase.from("emergency_requests").select("id,status,created_at"),
        supabase.from("pharmacies").select("id"),
      ]);
      return {
        doctors: doctors.data ?? [],
        patients: patients.data ?? [],
        hospitals: hospitals.data ?? [],
        providers: providers.data ?? [],
        appts: appts.data ?? [],
        payments: payments.data ?? [],
        emergencies: emergencies.data ?? [],
        pharmacies: pharmacies.data ?? [],
      };
    },
  });

  const d = stats;
  const revenue = (d?.payments ?? []).filter((p: any) => p.status === "succeeded").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const refunded = (d?.payments ?? []).reduce((s: number, p: any) => s + Number(p.refunded_amount ?? 0), 0);
  const pendingDoctors = (d?.doctors ?? []).filter((x: any) => !x.is_verified).length;
  const pendingHospitals = (d?.hospitals ?? []).filter((x: any) => !x.is_verified).length;
  const pendingProviders = (d?.providers ?? []).filter((x: any) => !x.is_verified).length;
  const openEmergencies = (d?.emergencies ?? []).filter((x: any) => x.status === "open").length;
  const todayAppts = (d?.appts ?? []).filter((a: any) => {
    const dt = new Date(a.scheduled_at);
    const now = new Date();
    return dt.toDateString() === now.toDateString();
  }).length;

  const kpis = [
    { label: "Revenue", value: inr(revenue), sub: `${inr(refunded)} refunded`, icon: IndianRupee, tone: "text-emerald-600" },
    { label: "Patients", value: d?.patients.length ?? 0, sub: "Registered users", icon: Users, tone: "text-blue-600" },
    { label: "Doctors", value: (d?.doctors ?? []).filter((x: any) => x.is_verified).length, sub: `${pendingDoctors} pending`, icon: Stethoscope, tone: "text-violet-600" },
    { label: "Appointments", value: d?.appts.length ?? 0, sub: `${todayAppts} today`, icon: Calendar, tone: "text-orange-600" },
  ];

  const queues = [
    { to: "/admin/doctors", label: "Doctor verifications", count: pendingDoctors, icon: Stethoscope },
    { to: "/admin/hospitals", label: "Hospital approvals", count: pendingHospitals, icon: Building2 },
    { to: "/admin/ambulance", label: "Ambulance providers", count: pendingProviders, icon: Ambulance },
    { to: "/admin/emergency", label: "Open emergencies", count: openEmergencies, icon: Shield, urgent: openEmergencies > 0 },
  ];

  const sections = [
    { to: "/admin/patients", label: "Patients", desc: "Browse all registered users", icon: Users },
    { to: "/admin/appointments", label: "Appointments", desc: "Platform-wide bookings", icon: Calendar },
    { to: "/admin/payments", label: "Finance", desc: "Revenue, refunds & invoices", icon: IndianRupee },
    { to: "/admin/pharmacy", label: "Pharmacy", desc: "Pharmacies & medicine stock", icon: Pill },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Everything happening across MediCare+ at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.tone}`} />
            </div>
            <div className="mt-3 font-display text-2xl font-bold">{k.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Action queue</h2>
            <Badge variant="secondary" className="text-xs">{pendingDoctors + pendingHospitals + pendingProviders + openEmergencies} items</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {queues.map((q) => (
              <Link key={q.to} to={q.to}>
                <div className={`group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50 ${q.urgent ? "border-red-300 bg-red-50/50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${q.urgent ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"}`}>
                      <q.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{q.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {q.count === 0 ? "All clear" : `${q.count} awaiting review`}
                      </div>
                    </div>
                  </div>
                  {q.count > 0 ? (
                    q.urgent ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <Clock className="h-4 w-4 text-orange-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Network</h2>
          <div className="space-y-3">
            <Stat icon={Building2} label="Hospitals" value={d?.hospitals.length ?? 0} />
            <Stat icon={Ambulance} label="Ambulance providers" value={d?.providers.length ?? 0} />
            <Stat icon={Pill} label="Pharmacies" value={d?.pharmacies.length ?? 0} />
            <Stat icon={Stethoscope} label="Verified doctors" value={(d?.doctors ?? []).filter((x: any) => x.is_verified).length} />
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Manage</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((s) => (
            <Link key={s.to} to={s.to}>
              <Card className="group p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="font-medium">{s.label}</div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.desc}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest appointments</h2>
          <Link to="/admin/appointments"><Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
        </div>
        {(d?.appts ?? []).length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">No appointments yet.</div>
        ) : (
          <div className="space-y-2">
            {(d?.appts ?? []).slice(0, 6).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="text-sm">
                  <div className="font-medium">{formatDateTime(a.scheduled_at)}</div>
                  <div className="text-xs text-muted-foreground">Booked {formatDateTime(a.created_at)}</div>
                </div>
                <Badge variant={a.status === "confirmed" ? "default" : "secondary"}>{a.status?.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground"><Icon className="h-4 w-4" /></div>
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-display text-lg font-bold">{value}</span>
    </div>
  );
}
