import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileSignature, Activity } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/prescribe/$appointmentId")({
  component: PrescribePage,
});

type Medicine = { name: string; dose?: string; frequency?: string; duration?: string };

function PrescribePage() {
  const { appointmentId } = useParams({ from: "/_authenticated/doctor/prescribe/$appointmentId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appt, setAppt] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [doctorRow, setDoctorRow] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [meds, setMeds] = useState<Medicine[]>([{ name: "", dose: "", frequency: "1-0-1", duration: "5 days" }]);
  const [vitals, setVitals] = useState({ bp_systolic: "", bp_diastolic: "", heart_rate: "", temperature_c: "", spo2: "", weight_kg: "", height_cm: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: a } = await supabase.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
      setAppt(a);
      if (a) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", a.patient_id).maybeSingle();
        setPatient(p);
      }
      const { data: d } = await supabase.from("doctors").select("*").eq("user_id", user.id).maybeSingle();
      setDoctorRow(d);
      const { data: tpls } = await supabase.from("prescription_templates").select("*").eq("doctor_user_id", user.id).order("name");
      setTemplates(tpls ?? []);
    })();
  }, [user, appointmentId]);

  const applyTemplate = (id: string) => {
    const t = templates.find((t) => t.id === id);
    if (!t) return;
    if (t.diagnosis) setDiagnosis(t.diagnosis);
    if (t.advice) setAdvice(t.advice);
    if (Array.isArray(t.medicines) && t.medicines.length) setMeds(t.medicines);
    toast.success(`Loaded "${t.name}"`);
  };

  const sign = async () => {
    if (!appt || !doctorRow || !user) return;
    if (meds.filter((m) => m.name.trim()).length === 0) return toast.error("Add at least one medicine");
    setSaving(true);
    const filtered = meds.filter((m) => m.name.trim());

    const { error: rxErr } = await supabase.from("prescriptions").insert({
      appointment_id: appt.id,
      doctor_id: doctorRow.id,
      patient_id: appt.patient_id,
      diagnosis: diagnosis || null,
      advice: advice || null,
      follow_up_date: followUp || null,
      medicines: filtered as any,
    });
    if (rxErr) { setSaving(false); return toast.error(rxErr.message); }

    const vNums: any = {};
    let anyVital = false;
    for (const [k, v] of Object.entries(vitals)) {
      if (v !== "") { vNums[k] = Number(v); anyVital = true; }
    }
    if (anyVital) {
      await supabase.from("vitals").insert({
        patient_id: appt.patient_id,
        doctor_id: doctorRow.id,
        ...vNums,
      });
    }

    await supabase.from("appointments").update({ status: "completed" }).eq("id", appt.id);

    toast.success("Prescription signed and sent");
    setSaving(false);
    navigate({ to: "/doctor/patients" });
  };

  if (!appt) return <div className="p-12 text-center text-muted-foreground">Loading appointment…</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">New prescription</h1>
        <p className="text-sm text-muted-foreground">For {patient?.full_name || "patient"} · {new Date(appt.scheduled_at).toLocaleString()}</p>
      </div>

      {templates.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm font-medium">Apply template:</span>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Choose template…" /></SelectTrigger>
              <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Vitals (optional)</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <LabeledInput label="BP systolic" value={vitals.bp_systolic} onChange={(v) => setVitals({ ...vitals, bp_systolic: v })} />
          <LabeledInput label="BP diastolic" value={vitals.bp_diastolic} onChange={(v) => setVitals({ ...vitals, bp_diastolic: v })} />
          <LabeledInput label="Heart rate" value={vitals.heart_rate} onChange={(v) => setVitals({ ...vitals, heart_rate: v })} />
          <LabeledInput label="Temp (°C)" value={vitals.temperature_c} onChange={(v) => setVitals({ ...vitals, temperature_c: v })} />
          <LabeledInput label="SpO2" value={vitals.spo2} onChange={(v) => setVitals({ ...vitals, spo2: v })} />
          <LabeledInput label="Weight (kg)" value={vitals.weight_kg} onChange={(v) => setVitals({ ...vitals, weight_kg: v })} />
          <LabeledInput label="Height (cm)" value={vitals.height_cm} onChange={(v) => setVitals({ ...vitals, height_cm: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Diagnosis & medicines</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnosis" />
          <div className="space-y-2">
            {meds.map((m, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border/60 p-2 sm:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto]">
                <Input value={m.name} placeholder="Drug name" onChange={(e) => { const arr = [...meds]; arr[i] = { ...m, name: e.target.value }; setMeds(arr); }} />
                <Input value={m.dose ?? ""} placeholder="500 mg" onChange={(e) => { const arr = [...meds]; arr[i] = { ...m, dose: e.target.value }; setMeds(arr); }} />
                <Input value={m.frequency ?? ""} placeholder="1-0-1" onChange={(e) => { const arr = [...meds]; arr[i] = { ...m, frequency: e.target.value }; setMeds(arr); }} />
                <Input value={m.duration ?? ""} placeholder="5 days" onChange={(e) => { const arr = [...meds]; arr[i] = { ...m, duration: e.target.value }; setMeds(arr); }} />
                <Button variant="ghost" size="icon" onClick={() => setMeds(meds.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setMeds([...meds, { name: "", dose: "", frequency: "1-0-1", duration: "5 days" }])}>
              <Plus className="mr-1 h-3 w-3" />Add medicine
            </Button>
          </div>
          <Textarea value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Advice (e.g. rest, hydration, red flags…)" rows={3} />
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Follow-up date (optional)</div>
            <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="w-48" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate({ to: "/doctor/schedule" })}>Cancel</Button>
        <Button onClick={sign} disabled={saving} className="bg-gradient-primary">
          <FileSignature className="mr-1 h-4 w-4" />{saving ? "Signing…" : "Sign & send"}
        </Button>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" />
    </div>
  );
}
