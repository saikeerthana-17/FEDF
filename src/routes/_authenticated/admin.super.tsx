import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { Crown, ShieldPlus, UserMinus, Sparkles, Stethoscope, Building2, Ambulance, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/use-auth";
import { useAuth, primaryRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/super")({
  head: () => ({ meta: [{ title: "Super Admin — MediCare+" }] }),
  component: SuperAdminPage,
});

const ROLE_META: Record<Exclude<AppRole, "patient">, { label: string; icon: any; tint: string }> = {
  super_admin: { label: "Super Admin", icon: Crown, tint: "from-amber-400 to-orange-500" },
  admin: { label: "Admin", icon: Shield, tint: "from-violet-500 to-fuchsia-500" },
  hospital: { label: "Hospital", icon: Building2, tint: "from-sky-500 to-cyan-500" },
  ambulance: { label: "Ambulance", icon: Ambulance, tint: "from-rose-500 to-pink-500" },
  doctor: { label: "Doctor", icon: Stethoscope, tint: "from-emerald-500 to-teal-500" },
};

const ROLES: (keyof typeof ROLE_META)[] = ["super_admin", "admin", "hospital", "ambulance", "doctor"];

function SuperAdminPage() {
  const { roles: myRoles } = useAuth();
  const isSuper = primaryRole(myRoles) === "super_admin";

  const [active, setActive] = useState<keyof typeof ROLE_META>("admin");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const loadCounts = useCallback(async () => {
    const next: Record<string, number> = {};
    for (const r of ROLES) {
      const { data } = await supabase.rpc("list_role_members", { _role: r });
      next[r] = (data ?? []).length;
    }
    setCounts(next);
  }, []);

  const load = useCallback(async (role: keyof typeof ROLE_META) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_role_members", { _role: role });
    if (error) toast.error(error.message);
    setMembers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(active); }, [active, load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  const grant = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    const { error } = await supabase.rpc("grant_role_by_email", { _email: trimmed, _role: active });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${ROLE_META[active].label} role granted to ${trimmed}`);
    setEmail("");
    load(active);
    loadCounts();
  };

  const revoke = async (userId: string) => {
    const { error } = await supabase.rpc("revoke_role", { _user_id: userId, _role: active });
    if (error) return toast.error(error.message);
    toast.success("Role revoked");
    load(active);
    loadCounts();
  };

  const meta = ROLE_META[active];
  const Icon = meta.icon;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-[var(--gradient-primary)] p-8 text-primary-foreground shadow-elevated">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> Super Admin Console
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Mission Control</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Grant access, manage every role on the platform, and keep the network running like a precision instrument.
            </p>
          </div>
          <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/20">
            <Crown className="h-9 w-9" />
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ROLES.map((r) => {
            const m = ROLE_META[r];
            const RI = m.icon;
            const isActive = active === r;
            return (
              <button
                key={r}
                onClick={() => setActive(r)}
                className={
                  "group rounded-xl border px-3 py-3 text-left backdrop-blur-md transition-all " +
                  (isActive
                    ? "border-white/40 bg-white/20 shadow-lg"
                    : "border-white/10 bg-white/5 hover:bg-white/10")
                }
              >
                <div className="flex items-center justify-between">
                  <RI className="h-4 w-4" />
                  <span className="text-xs font-semibold tabular-nums">{counts[r] ?? "·"}</span>
                </div>
                <div className="mt-2 text-xs font-medium">{m.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grant card */}
      <Card className="overflow-hidden border-2 border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.tint} text-white shadow-md`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Grant {meta.label} role</div>
              <div className="text-xs text-muted-foreground">User must have already signed up. Enter their account email.</div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="person@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") grant(); }}
            />
            <Button onClick={grant} disabled={busy || !email.trim()} className="gap-2">
              <ShieldPlus className="h-4 w-4" /> Grant access
            </Button>
          </div>
          {active === "super_admin" && !isSuper && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              Only existing super admins can grant the super admin role.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{meta.label} members</h2>
            <p className="text-xs text-muted-foreground">{members.length} user{members.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {loading ? (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : members.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No {meta.label.toLowerCase()}s yet. Grant access above.</CardContent></Card>
        ) : (
          <div className="grid gap-2">
            {members.map((m) => (
              <Card key={m.user_id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`bg-gradient-to-br ${meta.tint} text-white text-xs font-semibold`}>
                      {initials(m.full_name || m.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.full_name || m.email}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[10px]"><Icon className="mr-1 h-3 w-3" />{meta.label}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => revoke(m.user_id)}
                  >
                    <UserMinus className="mr-1 h-4 w-4" />Revoke
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tip */}
      <Card className="bg-muted/40">
        <CardContent className="p-5 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">How it works</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Granting a role unlocks that portal for the user on their next page load. Doctors are typically auto-approved through the verification flow; use this console for staff, ops, and emergency overrides.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
