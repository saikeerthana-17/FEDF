import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope, Calendar, Users, FileText, ClipboardList, BookTemplate,
  Activity, ArrowRight, IndianRupee, Star, Sparkles, Clock, Video,
} from "lucide-react";
import { inr, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/doctor/dashboard")({
  head: () => ({ meta: [{ title: "Doctor Dashboard — MediCare+" }] }),
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["doc-dash", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: doc } = await supabase.from("doctors").select("*").eq("user_id", user!.id).maybeSingle();
      if (!doc) return { doc: null, today: [], upcoming: [], payments: [], rxCount: 0 };
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const [{ data: today }, { data: upcoming }, { data: payments }, { count: rxCount }] = await Promise.all([
        supabase.from("appointments").select("*").eq("doctor_id", doc.id).gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString()).order("scheduled_at"),
        supabase.from("appointments").select("*").eq("doctor_id", doc.id).gt("scheduled_at", end.toISOString()).order("scheduled_at").limit(5),
        supabase.from("payments").select("amount,status,created_at").eq("doctor_id", doc.id).limit(200),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("doctor_id", doc.id),
      ]);
      return { doc, today: today ?? [], upcoming: upcoming ?? [], payments: payments ?? [], rxCount: rxCount ?? 0 };
    },
  });

  const doc = data?.doc;
  const earnings = (data?.payments ?? []).filter((p: any) => p.status === "succeeded").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const todayCount = (data?.today ?? []).length;
  const todayConfirmed = (data?.today ?? []).filter((a: any) => a.status === "confirmed").length;
  const nextAppt = (data?.today ?? []).find((a: any) => new Date(a.scheduled_at) > new Date()) ?? (data?.upcoming ?? [])[0];

  if (!doc) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-8 text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl font-bold">No doctor profile yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Apply to get verified as a doctor on the platform.</p>
          <Link to="/signup-doctor" className="mt-4 inline-block"><Button>Apply as doctor</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-[var(--gradient-primary)] p-8 text-primary-foreground shadow-elevated">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> {doc.is_verified ? "Verified clinician" : "Verification pending"}
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Dr. {doc.full_name}</h1>
            <div className="mt-1 text-sm text-white/80">{doc.specialty} · {doc.experience_years}y experience · ⭐ {doc.rating}</div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:min-w-[440px]">
            <HeroStat icon={Calendar} value={todayCount} label="Today" />
            <HeroStat icon={IndianRupee} value={inr(earnings)} label="Earned" />
            <HeroStat icon={FileText} value={data?.rxCount ?? 0} label="Rx written" />
          </div>
        </div>
      </div>

      {/* Next up + quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Next appointment</h2>
            <Link to="/doctor/schedule"><Button variant="ghost" size="sm">Full schedule <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
          </div>
          {nextAppt ? (
            <div className="mt-4 rounded-xl border bg-gradient-to-br from-primary/5 to-accent/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Starts</div>
                  <div className="mt-1 font-display text-2xl font-bold">{formatDateTime(nextAppt.scheduled_at)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{nextAppt.reason || "General consultation"} · {nextAppt.mode}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={nextAppt.status === "confirmed" ? "default" : "secondary"}>{nextAppt.status?.replace("_", " ")}</Badge>
                  <div className="flex gap-2">
                    <Link to="/doctor/patient/$patientId" params={{ patientId: nextAppt.patient_id }}>
                      <Button size="sm" variant="outline" className="gap-2"><Users className="h-4 w-4" />Patient context</Button>
                    </Link>
                    {nextAppt.mode === "video" && (
                      <Link to="/video/$appointmentId" params={{ appointmentId: nextAppt.id }}>
                        <Button size="sm" className="gap-2"><Video className="h-4 w-4" />Join</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No upcoming appointments. Patients can find you under Find Doctors.
            </div>
          )}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Today · {todayConfirmed} confirmed</h3>
            </div>
            <div className="space-y-2">
              {(data?.today ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">Clear day. Take a breath.</div>
              )}
              {(data?.today ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="text-xs text-muted-foreground">{a.reason || "Consultation"} · {a.mode}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "confirmed" ? "default" : "secondary"} className="text-[10px]">{a.status?.replace("_", " ")}</Badge>
                    <Link to="/doctor/patient/$patientId" params={{ patientId: a.patient_id }}>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"><Users className="h-3 w-3" />View patient</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Workflow</h2>
          <div className="space-y-2">
            <QuickLink to="/doctor/schedule" icon={Calendar} label="Manage schedule" desc="Slots, leaves" />
            <QuickLink to="/doctor/patients" icon={Users} label="Patient list" desc="History & vitals" />
            <QuickLink to="/doctor/templates" icon={BookTemplate} label="Rx templates" desc="Prescribe faster" />
            <QuickLink to="/doctor/workspace" icon={ClipboardList} label="Workspace" desc="Notes & tasks" />
            <QuickLink to="/doctor/analytics" icon={Activity} label="Analytics" desc="Trends & income" />
          </div>
          <div className="mt-5 rounded-xl bg-gradient-to-br from-accent/15 to-primary/10 p-4 ring-1 ring-accent/20">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Rating</div>
            <div className="mt-1 flex items-center gap-2 font-display text-3xl font-bold">
              {Number(doc.rating).toFixed(1)} <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Consultation fee · {inr(doc.consultation_fee)}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HeroStat({ icon: Icon, value, label }: { icon: any; value: any; label: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
      <div className="flex items-center justify-between text-white/70">
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-1 font-display text-xl font-bold leading-tight">{value}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, desc }: { to: string; icon: any; label: string; desc: string }) {
  return (
    <Link to={to}>
      <div className="group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-primary/50 hover:bg-primary/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
