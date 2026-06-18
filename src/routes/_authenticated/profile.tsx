import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCog, Save, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, mapsUrl } from "@/hooks/use-location";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — MediCare+" }] }),
  component: ProfilePage,
});

const FIELDS = [
  ["full_name", "Full name", "text"],
  ["phone", "Phone", "tel"],
  ["age", "Age", "number"],
  ["gender", "Gender", "text"],
  ["blood_group", "Blood group", "text"],
  ["emergency_contact_name", "Emergency contact name", "text"],
  ["emergency_contact_phone", "Emergency contact phone", "tel"],
] as const;

function ProfilePage() {
  const { user } = useAuth();
  const { coords } = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setForm(data ?? {});
      setLoading(false);
    });
  }, [user]);

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload: any = {
      full_name: form.full_name ?? null,
      phone: form.phone ?? null,
      age: form.age ? Number(form.age) : null,
      gender: form.gender ?? null,
      blood_group: form.blood_group ?? null,
      address: form.address ?? null,
      emergency_contact_name: form.emergency_contact_name ?? null,
      emergency_contact_phone: form.emergency_contact_phone ?? null,
      allergies: form.allergies ?? null,
      chronic_conditions: form.chronic_conditions ?? null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserCog className="h-5 w-5" /></span>
          My Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Keep your medical info up to date — it's shared with dispatch in emergencies.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Personal details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {FIELDS.map(([k, label, type]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} type={type} value={form[k] ?? ""} onChange={(e) => update(k, e.target.value)} />
            </div>
          ))}
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="address">Home address</Label>
            <Textarea id="address" rows={2} value={form.address ?? ""} onChange={(e) => update("address", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Medical history</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea id="allergies" rows={2} value={form.allergies ?? ""} onChange={(e) => update("allergies", e.target.value)} placeholder="e.g. Penicillin, peanuts…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chronic">Chronic conditions</Label>
            <Textarea id="chronic" rows={2} value={form.chronic_conditions ?? ""} onChange={(e) => update("chronic_conditions", e.target.value)} placeholder="e.g. Diabetes, hypertension…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Live location</CardTitle></CardHeader>
        <CardContent>
          {coords ? (
            <div className="text-sm space-y-1">
              <div>Lat/Lng: <code>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</code></div>
              <div className="text-xs text-muted-foreground">Accuracy ±{Math.round(coords.accuracy)}m · updates while the app is open.</div>
              <a className="text-primary text-xs underline" target="_blank" rel="noreferrer" href={mapsUrl(coords.lat, coords.lng)}>Open in Google Maps</a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Location not shared yet. Enable from the prompt at the bottom of the screen.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-gradient-primary">
          <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
