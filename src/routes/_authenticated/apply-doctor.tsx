import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Stethoscope, ShieldCheck, Clock, Upload, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/apply-doctor")({
  head: () => ({ meta: [{ title: "Apply as Doctor — MediCare+" }] }),
  component: ApplyDoctor,
});

function ApplyDoctor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [existing, setExisting] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    specialty: "",
    qualifications: "",
    experience_years: 1,
    consultation_fee: 500,
    city: "",
    bio: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("doctors").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setExisting(data);
      });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!photo) return toast.error("Please upload a profile photo so patients can recognize you.");
    setLoading(true);
    let avatar_url: string | null = null;
    try {
      const path = `${user.id}/avatar-${Date.now()}-${photo.name.replace(/\s+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("doctor-avatars").upload(path, photo, { upsert: true });
      if (upErr) throw upErr;
      avatar_url = path;
    } catch (e: any) {
      setLoading(false);
      return toast.error(e.message ?? "Photo upload failed");
    }
    const { error } = await supabase.from("doctors").insert({
      ...form,
      user_id: user.id,
      avatar_url,
      is_verified: false,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted! An admin will verify shortly.");
    navigate({ to: "/dashboard" });
  };

  if (existing) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold">Application on file</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You've already submitted a doctor profile.
          </p>
          <div className="mt-6 inline-flex items-center gap-2">
            {existing.is_verified ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified — doctor portal unlocked
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" /> Pending admin verification
              </Badge>
            )}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            {existing.is_verified
              ? "Sign out and back in to access the doctor workspace."
              : "Once verified, sign out and back in to access the doctor workspace."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Apply as a Doctor</h1>
        <p className="text-sm text-muted-foreground">
          Submit your credentials. An admin will verify before you can see patients.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="mb-2 block">Profile photo <span className="text-destructive">*</span></Label>
            <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-primary-foreground ring-2 ring-primary/20">
                {photo ? (
                  <img src={URL.createObjectURL(photo)} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-7 w-7" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{photo ? photo.name : "Upload a clear headshot"}</div>
                <div className="text-xs text-muted-foreground">Square JPG or PNG, shown to patients on your profile.</div>
              </div>
              <Upload className="h-4 w-4 text-primary" />
              <input type="file" accept="image/jpeg,image/png" className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Full name</Label>
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Dr. Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Specialty</Label>
            <Input required value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Cardiology" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bengaluru" />
          </div>
          <div className="space-y-1.5">
            <Label>Experience (years)</Label>
            <Input type="number" min={0} required value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Consultation fee (₹)</Label>
            <Input type="number" min={0} required value={form.consultation_fee} onChange={(e) => setForm({ ...form, consultation_fee: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Qualifications</Label>
            <Input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="MBBS, MD (AIIMS)" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Short bio</Label>
            <Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell patients about your practice..." />
          </div>
          <Button type="submit" disabled={loading} size="lg" className="bg-gradient-primary md:col-span-2">
            {loading ? "Submitting..." : "Submit application"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
