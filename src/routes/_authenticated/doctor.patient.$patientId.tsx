import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { initials, formatDate, formatDateTime, inr } from "@/lib/format";
import {
  ArrowLeft, Phone, Droplet, AlertTriangle, HeartPulse, Activity, FileText,
  Calendar, Thermometer, Wind, Scale, User, Pill, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor/patient/$patientId")({
  head: () => ({ meta: [{ title: "Patient context — MediCare+" }] }),
  component: PatientContext,
});

function PatientContext() {
  const { patientId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["doc-patient", patientId],
    queryFn: async () => {
      const [{ data: profile }, { data: prescriptions }, { data: vitals }, { data: appointments }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", patientId).maybeSingle(),
        supabase.from("prescriptions").select("*, doctors(full_name, specialty)").eq("patient_id", patientId).order("created_at", { ascending: false }),
        supabase.from("vitals").select("*").eq("patient_id", patientId).order("recorded_at", { ascending: false }).limit(30),
        supabase.from("appointments").select("*, doctors(full_name, specialty)").eq("patient_id", patientId).order("scheduled_at", { ascending: false }).limit(20),
      ]);
      return { profile, prescriptions: prescriptions ?? [], vitals: vitals ?? [], appointments: appointments ?? [] };
    },
  });

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const profile = data?.profile;
  const vitals = data?.vitals ?? [];
  const latest = vitals[0];
  const prescriptions = data?.prescriptions ?? [];
  const appointments = data?.appointments ?? [];

  if (!profile) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-8 text-center">
          <User className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Patient not found or access denied.</p>
          <Link to="/doctor/dashboard"><Button variant="ghost" className="mt-3 gap-2"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/doctor/dashboard"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back to dashboard</Button></Link>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="relative bg-[var(--gradient-primary)] p-6 text-primary-foreground">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-5">
            <Avatar className="h-20 w-20 border-4 border-white/30">
              <AvatarFallback className="bg-white/20 text-2xl text-white">{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold">{profile.full_name || "Unnamed patient"}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
                {profile.age && <span>{profile.age} yrs</span>}
                {profile.gender && <span className="capitalize">{profile.gender}</span>}
                {profile.blood_group && <span className="inline-flex items-center gap-1"><Droplet className="h-3 w-3" />{profile.blood_group}</span>}
                {profile.phone && <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-3 w-3" />{profile.phone}</a>}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" />{prescriptions.length} Rx</Badge>
              <Badge variant="secondary" className="gap-1"><Calendar className="h-3 w-3" />{appointments.length} visits</Badge>
            </div>
          </div>
        </div>

        {/* Health snapshot */}
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <SnapshotCard icon={AlertTriangle} title="Allergies" content={profile.allergies} accent="text-red-600" />
          <SnapshotCard icon={HeartPulse} title="Chronic conditions" content={profile.chronic_conditions} accent="text-orange-600" />
          <SnapshotCard
            icon={Phone}
            title="Emergency contact"
            content={profile.emergency_contact_name ? `${profile.emergency_contact_name}${profile.emergency_contact_phone ? ` · ${profile.emergency_contact_phone}` : ""}` : null}
            accent="text-primary"
          />
        </div>
      </Card>

      {/* Latest vitals strip */}
      {latest && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <VitalChip icon={HeartPulse} label="BP" value={latest.bp_systolic && latest.bp_diastolic ? `${latest.bp_systolic}/${latest.bp_diastolic}` : "—"} unit="mmHg" />
          <VitalChip icon={Activity} label="Heart rate" value={latest.heart_rate ?? "—"} unit="bpm" />
          <VitalChip icon={Wind} label="SpO₂" value={latest.spo2 ?? "—"} unit="%" />
          <VitalChip icon={Thermometer} label="Temp" value={latest.temperature_c ?? "—"} unit="°C" />
          <VitalChip icon={Scale} label="Weight" value={latest.weight_kg ?? "—"} unit="kg" />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="prescriptions">
        <TabsList>
          <TabsTrigger value="prescriptions" className="gap-2"><Pill className="h-4 w-4" />Past prescriptions ({prescriptions.length})</TabsTrigger>
          <TabsTrigger value="vitals" className="gap-2"><Activity className="h-4 w-4" />Vitals history</TabsTrigger>
          <TabsTrigger value="appointments" className="gap-2"><Calendar className="h-4 w-4" />Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="mt-4 space-y-3">
          {prescriptions.length === 0 && <EmptyState text="No prescriptions on record yet." />}
          {prescriptions.map((rx: any) => (
            <Card key={rx.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{rx.diagnosis || "General prescription"}</div>
                  <div className="text-xs text-muted-foreground">
                    by Dr. {rx.doctors?.full_name ?? "—"} · {rx.doctors?.specialty} · {formatDate(rx.created_at)}
                  </div>
                </div>
                {rx.follow_up_date && <Badge variant="outline">Follow-up: {formatDate(rx.follow_up_date)}</Badge>}
              </div>
              {Array.isArray(rx.medicines) && rx.medicines.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {rx.medicines.map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                      <Pill className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{m.name}</span>
                      {m.dosage && <span className="text-muted-foreground">· {m.dosage}</span>}
                      {m.frequency && <span className="text-muted-foreground">· {m.frequency}</span>}
                      {m.duration && <span className="text-muted-foreground">· {m.duration}</span>}
                    </div>
                  ))}
                </div>
              )}
              {rx.advice && <p className="mt-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">Advice: </span>{rx.advice}</p>}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="vitals" className="mt-4">
          {vitals.length === 0 ? <EmptyState text="No vitals recorded yet." /> : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">When</th>
                      <th className="px-3 py-2 text-left">BP</th>
                      <th className="px-3 py-2 text-left">HR</th>
                      <th className="px-3 py-2 text-left">SpO₂</th>
                      <th className="px-3 py-2 text-left">Temp</th>
                      <th className="px-3 py-2 text-left">Weight</th>
                      <th className="px-3 py-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitals.map((v: any) => (
                      <tr key={v.id} className="border-t">
                        <td className="px-4 py-2 text-xs text-muted-foreground">{formatDateTime(v.recorded_at)}</td>
                        <td className="px-3 py-2">{v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : "—"}</td>
                        <td className="px-3 py-2">{v.heart_rate ?? "—"}</td>
                        <td className="px-3 py-2">{v.spo2 ?? "—"}</td>
                        <td className="px-3 py-2">{v.temperature_c ?? "—"}</td>
                        <td className="px-3 py-2">{v.weight_kg ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{v.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="appointments" className="mt-4 space-y-2">
          {appointments.length === 0 && <EmptyState text="No past appointments." />}
          {appointments.map((a: any) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="font-medium">{a.doctors?.full_name ?? "—"} <span className="text-xs text-muted-foreground">· {a.doctors?.specialty}</span></div>
                <div className="text-xs text-muted-foreground">{formatDateTime(a.scheduled_at)} · {a.reason || "Consultation"} · {a.mode}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.status === "completed" ? "default" : "secondary"}>{a.status?.replace("_", " ")}</Badge>
                {a.status !== "cancelled" && (
                  <Link to="/doctor/prescribe/$appointmentId" params={{ appointmentId: a.id }}>
                    <Button size="sm" variant="outline" className="gap-1"><Pill className="h-3 w-3" />Prescribe</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SnapshotCard({ icon: Icon, title, content, accent }: { icon: any; title: string; content: string | null | undefined; accent: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${accent}`}>
        <Icon className="h-3.5 w-3.5" />{title}
      </div>
      <div className="mt-2 text-sm">
        {content ? content : <span className="text-muted-foreground">— not provided</span>}
      </div>
    </div>
  );
}

function VitalChip({ icon: Icon, label, value, unit }: { icon: any; label: string; value: any; unit: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span><Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-1 font-display text-2xl font-bold">
        {value}<span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
