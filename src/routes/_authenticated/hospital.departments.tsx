import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Stethoscope, Phone, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/hospital/departments")({
  head: () => ({ meta: [{ title: "Departments — MediCare+" }] }),
  component: Departments,
});

interface Branch { id: string; name: string }
interface Dept {
  id: string; branch_id: string; name: string;
  head_doctor_name: string | null; phone: string | null;
  description: string | null; is_active: boolean;
}

const PRESETS = [
  "Cardiology","Neurology","Orthopedics","Pediatrics","Oncology",
  "Radiology","General Surgery","Gynecology","Dermatology","ENT",
  "Emergency","ICU","Pathology","Pulmonology","Nephrology",
];

function Departments() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selBranch, setSelBranch] = useState<string>("");
  const [depts, setDepts] = useState<Dept[]>([]);
  const [form, setForm] = useState({ name: "", head: "", phone: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: h } = await supabase.from("hospitals").select("id").eq("owner_user_id", user.id).maybeSingle();
      if (!h) return;
      const { data: br } = await supabase.from("hospital_branches").select("id,name").eq("hospital_id", h.id).order("created_at");
      setBranches((br as any) ?? []);
      if (br?.[0]) setSelBranch(br[0].id);
    })();
  }, [user]);

  const load = async (branchId: string) => {
    const { data } = await supabase.from("hospital_departments" as any).select("*").eq("branch_id", branchId).order("created_at");
    setDepts((data as any) ?? []);
  };

  useEffect(() => {
    if (!selBranch) return;
    load(selBranch);
    const ch = supabase
      .channel(`depts-${selBranch}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_departments", filter: `branch_id=eq.${selBranch}` },
        () => load(selBranch))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selBranch]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selBranch || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("hospital_departments" as any).insert({
      branch_id: selBranch,
      name: form.name.trim(),
      head_doctor_name: form.head || null,
      phone: form.phone || null,
      description: form.description || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Department added");
    setForm({ name: "", head: "", phone: "", description: "" });
  };

  const toggleActive = async (d: Dept) => {
    const { error } = await supabase.from("hospital_departments" as any)
      .update({ is_active: !d.is_active, updated_at: new Date().toISOString() }).eq("id", d.id);
    if (error) toast.error(error.message);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    const { error } = await supabase.from("hospital_departments" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Departments</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage specialty departments per branch.</p>
      </div>

      {branches.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">Add a branch first.</Card>
      ) : (
        <>
          <div className="max-w-sm">
            <Label>Branch</Label>
            <Select value={selBranch} onValueChange={setSelBranch}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Card className="p-6">
            <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Department name</Label>
                <Input list="dept-presets" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cardiology" />
                <datalist id="dept-presets">{PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
              <div className="space-y-1.5"><Label>Head doctor</Label><Input value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} placeholder="Dr. …" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Extension or direct" /></div>
              <div className="space-y-1.5 md:col-span-4"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Services offered, hours, etc." /></div>
              <div className="md:col-span-4"><Button type="submit" disabled={saving} className="gap-2"><Plus className="h-4 w-4" />Add department</Button></div>
            </form>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {depts.length === 0 && <div className="text-sm text-muted-foreground py-4">No departments yet.</div>}
            {depts.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      <div className="font-semibold truncate">{d.name}</div>
                      {!d.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                    {d.head_doctor_name && <div className="text-xs text-muted-foreground mt-1">Head: {d.head_doctor_name}</div>}
                    {d.phone && <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Phone className="h-3 w-3" />{d.phone}</div>}
                    {d.description && <div className="text-sm mt-2 text-muted-foreground line-clamp-2">{d.description}</div>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" title={d.is_active ? "Deactivate" : "Activate"} onClick={() => toggleActive(d)}>
                      <Power className={`h-4 w-4 ${d.is_active ? "text-emerald-600" : "text-muted-foreground"}`} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => del(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
