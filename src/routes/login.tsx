import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, ArrowRight, Stethoscope, Building2, Ambulance, ShieldCheck, Crown, KeyRound, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import logo from "@/assets/medicare-logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — MediCare+" }] }),
  component: LoginPage,
});

const professionalRoles = [
  { id: "doctor", label: "Doctor Portal", desc: "Consultations, prescriptions, patient records", icon: Stethoscope, signupTo: "/signup-doctor", status: "live" as const },
  { id: "hospital", label: "Hospital Portal", desc: "Branches, departments, ICU & bed management", icon: Building2, signupTo: "/signup-hospital", status: "live" as const },
  { id: "ambulance", label: "Ambulance Operator", desc: "Fleet, drivers, live dispatch, trip log", icon: Ambulance, signupTo: "/signup-ambulance", status: "live" as const },
  { id: "admin", label: "Admin Portal", desc: "Verifications, finance, operations", icon: ShieldCheck, signupTo: null, status: "live" as const, note: "Sign in with an admin account" },
  { id: "super", label: "Super Admin", desc: "Platform-wide analytics & system control", icon: Crown, signupTo: null, status: "soon" as const },
];

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  const redirectByRole = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const roles = (data ?? []).map((r) => r.role as string);
    if (roles.includes("admin") || roles.includes("super_admin")) navigate({ to: "/admin/doctors" });
    else if (roles.includes("hospital")) navigate({ to: "/hospital/dashboard" });
    else if (roles.includes("ambulance")) navigate({ to: "/ambulance/driver" });
    else if (roles.includes("doctor")) navigate({ to: "/doctor/schedule" });
    else navigate({ to: "/dashboard" });
  };

  useEffect(() => {
    if (user) redirectByRole(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    if (data.user) await redirectByRole(data.user.id);
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) toast.error(result.error.message);
  };

  return (
    <div className="relative grid min-h-screen md:grid-cols-2">
      <div className="hidden bg-gradient-primary p-12 md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 p-1">
            <img src={logo} alt="MediCare" className="h-full w-full object-contain" />
          </div>
          <span className="font-display text-lg font-bold">MediCare+</span>
        </Link>
        <div className="text-primary-foreground">
          <h2 className="font-display text-4xl font-bold leading-tight">Care that meets you where you are.</h2>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Book verified doctors, order medicines, and reach emergency help — all from one premium healthcare platform.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/60">© 2026 MediCare+ Healthcare Pvt. Ltd.</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md p-8 shadow-elevated">
          <h1 className="font-display text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your patient account</p>

          <Button onClick={handleGoogle} variant="outline" className="mt-6 w-full gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary">
              {loading ? "Signing in..." : <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
          </p>

          {/* Professionals trigger — discreet, premium */}
          <button
            type="button"
            onClick={() => setProOpen(true)}
            className="group mt-6 flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-transparent p-3 text-left transition-all hover:border-primary/40 hover:shadow-soft"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5 text-foreground/70 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight">Professionals</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Restricted access</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        </Card>
      </div>

      {/* Professionals slide-in panel */}
      <AnimatePresence>
        {proOpen && (
          <>
            <motion.div
              key="pro-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setProOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
            />
            <motion.aside
              key="pro-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 32 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-gradient-to-b from-[#0a1e3a] via-[#0e2a4d] to-[#08152c] text-white shadow-2xl"
            >
              {/* glass highlight overlay */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_60%)]" />

              <div className="relative flex items-start justify-between border-b border-white/10 p-6">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/80">Enterprise access</div>
                  <h2 className="mt-1 font-display text-2xl font-bold">Professionals</h2>
                  <p className="mt-1 text-sm text-white/60">Secure portals for verified care providers.</p>
                </div>
                <button
                  onClick={() => setProOpen(false)}
                  className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative flex-1 space-y-3 overflow-y-auto p-6">
                {professionalRoles.map((r, i) => {
                  const Icon = r.icon;
                  const isSoon = r.status === "soon";
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.05 }}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all hover:border-cyan-300/40 hover:bg-white/10"
                    >
                      <div className="relative flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 ring-1 ring-white/10">
                          <Icon className="h-5 w-5 text-cyan-200" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold tracking-tight">{r.label}</div>
                            {isSoon ? (
                              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200">Soon</span>
                            ) : (
                              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200">Live</span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-white/60">{r.desc}</div>
                          {r.note && <div className="mt-1.5 text-[11px] text-cyan-200/80">{r.note}</div>}

                          {!isSoon && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setProOpen(false);
                                  document.getElementById("email")?.focus();
                                  toast.info(`Sign in below with your ${r.label.toLowerCase()} email`);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                              >
                                Sign in <ArrowRight className="h-3 w-3" />
                              </button>
                              {r.signupTo && (
                                <Link
                                  to={r.signupTo}
                                  onClick={() => setProOpen(false)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition-colors hover:bg-cyan-400/20"
                                >
                                  Apply / Sign up <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          )}
                          {isSoon && (
                            <button
                              type="button"
                              onClick={() => toast.info(`${r.label} launches in our next phase`)}
                              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70"
                            >
                              Notify me <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="relative border-t border-white/10 p-6 text-[11px] leading-relaxed text-white/50">
                Professional access is restricted to verified providers and audited continuously. Unauthorized attempts are logged.
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
