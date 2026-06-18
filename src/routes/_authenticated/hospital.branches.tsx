import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/hospital/branches")({
  head: () => ({ meta: [{ title: "Branches — MediCare+" }] }),
  component: Branches,
});

function Branches() {
  const { user } = useAuth();
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", address: "", city: "", pincode: "", phone: "", lat: "", lng: "" });

  const load = async (hid: string) => {
    const { data } = await supabase.from("hospital_branches").select("*").eq("hospital_id", hid).order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: h } = await supabase.from("hospitals").select("id").eq("owner_user_id", user.id).maybeSingle();
      if (h) { setHospitalId(h.id); await load(h.id); }
    })();
  }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId || !form.name) return;
    const { error } = await supabase.from("hospital_branches").insert({
      hospital_id: hospitalId, name: form.name, address: form.address || null, city: form.city || null,
      pincode: form.pincode || null, phone: form.phone || null,
      lat: form.lat ? Number(form.lat) : null, lng: form.lng ? Number(form.lng) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Branch added");
    setForm({ name: "", address: "", city: "", pincode: "", phone: "", lat: "", lng: "" });
    load(hospitalId);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this branch and its beds?")) return;
    const { error } = await supabase.from("hospital_branches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (hospitalId) load(hospitalId);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Branches</h1>

      <Card className="p-6">
        <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2"><Label>Branch name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Lat / Lng</Label>
            <div className="flex gap-2"><Input placeholder="Lat" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /><Input placeholder="Lng" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></div>
          </div>
          <div className="md:col-span-4"><Button type="submit" className="gap-2"><Plus className="h-4 w-4" />Add branch</Button></div>
        </form>
      </Card>

      <div className="grid gap-3">
        {items.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No branches yet.</div>}
        {items.map((b) => (
          <Card key={b.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-semibold">{b.name}</div>
              <div className="text-sm text-muted-foreground">{[b.address, b.city, b.pincode].filter(Boolean).join(", ")}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
