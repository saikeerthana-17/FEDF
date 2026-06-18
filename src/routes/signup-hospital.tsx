import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { applyAsHospital } from "@/lib/hospital.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/medicare-logo.png";

export const Route = createFileRoute("/signup-hospital")({
  head: () => ({ meta: [{ title: "Register your Hospital — MediCare+" }] }),
  component: SignupHospital,
});

function SignupHospital() {
  const navigate = useNavigate();
  const apply = useServerFn(applyAsHospital);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState({ email: "", password: "" });
  const [h, setH] = useState({
    name: "", hospital_type: "multi_specialty", description: "",
    address: "", city: "", state: "", pincode: "",
    phone: "", email: "", website: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.email || account.password.length < 8) {
      return toast.error("Enter a valid email and password (min 8 chars).");
    }
    if (!h.name || !h.hospital_type) return toast.error("Hospital name and type are required.");

    setLoading(true);
    try {
      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: { emailRedirectTo: window.location.origin + "/hospital/dashboard", data: { full_name: h.name } },
      });
      if (error) throw error;
      if (!data.session) {
        await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
      }
      // Apply
      await apply({ data: { ...h, email: h.email || undefined, website: h.website || undefined, description: h.description || undefined } });
      toast.success("Hospital registered! Admin will verify shortly.");
      navigate({ to: "/hospital/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.4fr]">
      <div className="hidden bg-gradient-to-br from-[#0a1e3a] via-[#0e2a4d] to-[#08152c] p-10 text-white md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} className="h-9 w-9" alt="logo" />
          <span className="font-display text-lg font-bold">MediCare+</span>
        </Link>
        <div>
          <Building2 className="h-12 w-12 text-cyan-300" />
          <h1 className="mt-4 font-display text-4xl font-bold">Run a smarter hospital.</h1>
          <p className="mt-3 max-w-md text-white/70">Real-time ICU & bed availability, branch management, and seamless patient routing across MediCare's network.</p>
          <ul className="mt-6 space-y-2 text-sm text-white/80">
            <li>• Multi-branch operations</li><li>• Ward-level bed inventory</li><li>• Integrated patient flow & emergency intake</li>
          </ul>
        </div>
        <div className="text-xs text-white/40">Enterprise access · Verified providers only</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-2xl p-8 shadow-elevated">
          <Link to="/login" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </Link>
          <h2 className="font-display text-2xl font-bold">Register your hospital</h2>
          <p className="mt-1 text-sm text-muted-foreground">An admin will verify your application within 24 hours.</p>

          <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</div>
            </div>
            <div className="space-y-1.5">
              <Label>Login email</Label>
              <Input type="email" required value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" required minLength={8} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
            </div>

            <div className="md:col-span-2 mt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hospital</div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Hospital name</Label>
              <Input required value={h.name} onChange={(e) => setH({ ...h, name: e.target.value })} placeholder="Apollo Care Hospital" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={h.hospital_type} onValueChange={(v) => setH({ ...h, hospital_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multi_specialty">Multi-specialty</SelectItem>
                  <SelectItem value="super_specialty">Super-specialty</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic centre</SelectItem>
                  <SelectItem value="maternity">Maternity & child</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={h.city} onChange={(e) => setH({ ...h, city: e.target.value })} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input value={h.address} onChange={(e) => setH({ ...h, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={h.state} onChange={(e) => setH({ ...h, state: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Pincode</Label>
              <Input value={h.pincode} onChange={(e) => setH({ ...h, pincode: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={h.phone} onChange={(e) => setH({ ...h, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Public email</Label>
              <Input type="email" value={h.email} onChange={(e) => setH({ ...h, email: e.target.value })} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Website</Label>
              <Input type="url" value={h.website} onChange={(e) => setH({ ...h, website: e.target.value })} placeholder="https://" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>About</Label>
              <Textarea rows={3} value={h.description} onChange={(e) => setH({ ...h, description: e.target.value })} />
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
