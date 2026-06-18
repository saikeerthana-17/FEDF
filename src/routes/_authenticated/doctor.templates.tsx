import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pill, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/templates")({
  component: TemplatesPage,
});

type Medicine = { name: string; dose?: string; frequency?: string; duration?: string };
type Template = { id: string; name: string; diagnosis: string | null; medicines: Medicine[]; advice: string | null; created_at: string };

function emptyMed(): Medicine { return { name: "", dose: "", frequency: "1-0-1", duration: "5 days" }; }

function TemplatesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("prescription_templates").select("*").eq("doctor_user_id", user.id).order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as Template[]);
  };
  useEffect(() => { load(); }, [user]);

  const startNew = () => setEditing({ name: "", diagnosis: "", medicines: [emptyMed()], advice: "" });
  const save = async () => {
    if (!user || !editing?.name) return toast.error("Name is required");
    const payload = {
      doctor_user_id: user.id,
      name: editing.name,
      diagnosis: editing.diagnosis || null,
      medicines: (editing.medicines ?? []) as any,
      advice: editing.advice || null,
    };
    const op = editing.id
      ? supabase.from("prescription_templates").update(payload).eq("id", editing.id)
      : supabase.from("prescription_templates").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Template saved");
    setEditing(null);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("prescription_templates").delete().eq("id", id);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Prescription templates</h1>
          <p className="text-sm text-muted-foreground">Reusable presets to speed up prescribing.</p>
        </div>
        <Button onClick={startNew}><Plus className="mr-1 h-4 w-4" />New template</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editing.id ? "Edit" : "New"} template</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Template name</div>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Viral fever protocol" />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Suggested diagnosis</div>
                <Input value={editing.diagnosis ?? ""} onChange={(e) => setEditing({ ...editing, diagnosis: e.target.value })} placeholder="Acute viral fever" />
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Medicines</div>
              <div className="space-y-2">
                {(editing.medicines ?? []).map((m, i) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-border/60 p-2 sm:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto]">
                    <Input value={m.name} placeholder="Drug name" onChange={(e) => {
                      const arr = [...(editing.medicines ?? [])]; arr[i] = { ...m, name: e.target.value }; setEditing({ ...editing, medicines: arr });
                    }} />
                    <Input value={m.dose ?? ""} placeholder="500 mg" onChange={(e) => {
                      const arr = [...(editing.medicines ?? [])]; arr[i] = { ...m, dose: e.target.value }; setEditing({ ...editing, medicines: arr });
                    }} />
                    <Input value={m.frequency ?? ""} placeholder="1-0-1" onChange={(e) => {
                      const arr = [...(editing.medicines ?? [])]; arr[i] = { ...m, frequency: e.target.value }; setEditing({ ...editing, medicines: arr });
                    }} />
                    <Input value={m.duration ?? ""} placeholder="5 days" onChange={(e) => {
                      const arr = [...(editing.medicines ?? [])]; arr[i] = { ...m, duration: e.target.value }; setEditing({ ...editing, medicines: arr });
                    }} />
                    <Button variant="ghost" size="icon" onClick={() => {
                      const arr = (editing.medicines ?? []).filter((_, j) => j !== i); setEditing({ ...editing, medicines: arr });
                    }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditing({ ...editing, medicines: [...(editing.medicines ?? []), emptyMed()] })}>
                  <Plus className="mr-1 h-3 w-3" />Add medicine
                </Button>
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Advice (optional)</div>
              <Textarea value={editing.advice ?? ""} onChange={(e) => setEditing({ ...editing, advice: e.target.value })} rows={3} placeholder="Drink plenty of fluids, rest, return if fever > 102°F…" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save template</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground">Create your first to prescribe in seconds.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    {t.diagnosis && <div className="text-xs text-muted-foreground">{t.diagnosis}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>Edit</Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="space-y-1">
                  {t.medicines.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Pill className="h-3 w-3 text-primary" />
                      <span>{m.name} {m.dose && `· ${m.dose}`} {m.frequency && `· ${m.frequency}`} {m.duration && `· ${m.duration}`}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
