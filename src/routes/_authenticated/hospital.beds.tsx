import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WARDS = ["general", "private", "icu", "nicu", "emergency"] as const;

export const Route = createFileRoute("/_authenticated/hospital/beds")({
  head: () => ({ meta: [{ title: "Bed Inventory — MediCare+" }] }),
  component: Beds,
});

function Beds() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [selBranch, setSelBranch] = useState<string>("");
  const [beds, setBeds] = useState<any[]>([]);
  const [form, setForm] = useState({ ward_type: "general", total: 0, available: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: h } = await supabase.from("hospitals").select("id").eq("owner_user_id", user.id).maybeSingle();
      if (!h) return;
      const { data: br } = await supabase.from("hospital_branches").select("id, name").eq("hospital_id", h.id);
      setBranches(br ?? []);
      if (br?.[0]) setSelBranch(br[0].id);
    })();
  }, [user]);

  useEffect(() => {
    if (!selBranch) return;
    supabase.from("hospital_beds").select("*").eq("branch_id", selBranch).then(({ data }) => setBeds(data ?? []));
  }, [selBranch]);

  const upsert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selBranch) return toast.error("Select a branch first");
    const { error } = await supabase.from("hospital_beds").upsert({
      branch_id: selBranch, ward_type: form.ward_type,
      total_beds: form.total, available_beds: Math.min(form.available, form.total),
      updated_at: new Date().toISOString(),
    }, { onConflict: "branch_id,ward_type" });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    const { data } = await supabase.from("hospital_beds").select("*").eq("branch_id", selBranch);
    setBeds(data ?? []);
  };

  const updateAvail = async (id: string, delta: number) => {
    const bed = beds.find((b) => b.id === id);
    if (!bed) return;
    const next = Math.max(0, Math.min(bed.total_beds, bed.available_beds + delta));
    const { error } = await supabase.from("hospital_beds").update({ available_beds: next, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    setBeds(beds.map((b) => (b.id === id ? { ...b, available_beds: next } : b)));
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Bed & ICU inventory</h1>

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
            <form onSubmit={upsert} className="grid items-end gap-3 md:grid-cols-4">
              <div className="space-y-1.5"><Label>Ward type</Label>
                <Select value={form.ward_type} onValueChange={(v) => setForm({ ...form, ward_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WARDS.map((w) => <SelectItem key={w} value={w}>{w.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Total beds</Label><Input type="number" min={0} value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Available</Label><Input type="number" min={0} value={form.available} onChange={(e) => setForm({ ...form, available: Number(e.target.value) })} /></div>
              <Button type="submit">Save ward</Button>
            </form>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {beds.length === 0 && <div className="text-sm text-muted-foreground">No wards configured.</div>}
            {beds.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{b.ward_type}</div>
                    <div className="mt-1 text-2xl font-bold">{b.available_beds}<span className="text-base font-normal text-muted-foreground"> / {b.total_beds}</span></div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => updateAvail(b.id, -1)}>−</Button>
                    <Button variant="outline" size="sm" onClick={() => updateAvail(b.id, +1)}>+</Button>
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
