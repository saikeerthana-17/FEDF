import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Ambulance, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { applyAsAmbulanceOperator } from "@/lib/ambulance-signup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/medicare-logo.png";

export const Route = createFileRoute("/signup-ambulance")({
  head: () => ({ meta: [{ title: "Register as Ambulance Operator — MediCare+" }] }),
  component: SignupAmbulance,
});

function SignupAmbulance() {
  const navigate = useNavigate();
  const apply = useServerFn(applyAsAmbulanceOperator);
  const [loading, setLoading] = useState(false);
  const [acc, setAcc] = useState({ email: "", password: "" });
  const [f, setF] = useState({
    name: "", city: "", phone: "", email: "",
    driver_full_name: "", driver_phone: "", license_number: "",
    vehicle_number: "", ambulance_type: "basic" as "basic" | "als" | "icu" | "neonatal",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acc.email || acc.password.length < 8) return toast.error("Email and 8+ char password required");
    if (!f.name || !f.driver_full_name || !f.vehicle_number) return toast.error("Operator, driver name and vehicle # required");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: acc.email, password: acc.password,
        options: { emailRedirectTo: window.location.origin + "/ambulance/driver", data: { full_name: f.driver_full_name } },
      });
      if (error) throw error;
      if (!data.session) await supabase.auth.signInWithPassword({ email: acc.email, password: acc.password });
      await apply({ data: { ...f, email: f.email || undefined } });
      toast.success("Operator registered! Admin will verify shortly.");
      navigate({ to: "/ambulance/driver" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.4fr]">
      <div className="hidden bg-gradient-to-br from-[#3a0a0a] via-[#4d0e1f] to-[#1c0808] p-10 text-white md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} className="h-9 w-9" alt="logo" />
          <span className="font-display text-lg font-bold">MediCare+</span>
        </Link>
        <div>
          <Ambulance className="h-12 w-12 text-rose-300" />
          <h1 className="mt-4 font-display text-4xl font-bold">Save more lives, faster.</h1>
          <p className="mt-3 max-w-md text-white/70">Get live dispatch jobs, GPS-based routing, and transparent fare settlements on India's premium emergency network.</p>
        </div>
        <div className="text-xs text-white/40">Enterprise access · Verified providers only</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-2xl p-8 shadow-elevated">
          <Link to="/login" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </Link>
          <h2 className="font-display text-2xl font-bold">Register your fleet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add your first vehicle now — more later from the fleet dashboard.</p>

          <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</div>
            <div className="space-y-1.5">
              <Label>Login email</Label>
              <Input type="email" required value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" required minLength={8} value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} />
            </div>

            <div className="md:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operator</div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Operator name</Label>
              <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="MediFast Ambulance Services" />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Operator phone</Label>
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </div>

            <div className="md:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Driver (you)</div>
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input required value={f.driver_full_name} onChange={(e) => setF({ ...f, driver_full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Driver phone</Label>
              <Input value={f.driver_phone} onChange={(e) => setF({ ...f, driver_phone: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>License number</Label>
              <Input value={f.license_number} onChange={(e) => setF({ ...f, license_number: e.target.value })} />
            </div>

            <div className="md:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vehicle</div>
            <div className="space-y-1.5">
              <Label>Vehicle number</Label>
              <Input required value={f.vehicle_number} onChange={(e) => setF({ ...f, vehicle_number: e.target.value })} placeholder="MH-12-AB-3456" />
            </div>
            <div className="space-y-1.5">
              <Label>Ambulance type</Label>
              <Select value={f.ambulance_type} onValueChange={(v: any) => setF({ ...f, ambulance_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (BLS)</SelectItem>
                  <SelectItem value="als">Advanced Life Support</SelectItem>
                  <SelectItem value="icu">ICU on wheels</SelectItem>
                  <SelectItem value="neonatal">Neonatal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 mt-2">
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary">
                {loading ? "Submitting..." : <>Submit application <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
