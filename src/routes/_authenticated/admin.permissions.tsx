import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Search, ShieldCheck, RotateCcw, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth, primaryRole, type AppRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/permissions")({
  head: () => ({ meta: [{ title: "Permissions Matrix — MediCare+" }] }),
  component: PermissionsPage,
});

type Perm = { key: string; label: string; description: string; defaults: Partial<Record<AppRole, boolean>> };
type Group = { name: string; perms: Perm[] };

const ALL_ROLES: AppRole[] = ["patient", "doctor", "hospital", "ambulance", "admin", "super_admin"];

const T = true, F = false;
const ALL = { patient: T, doctor: T, hospital: T, ambulance: T, admin: T, super_admin: T };
const STAFF = { patient: F, doctor: T, hospital: T, ambulance: T, admin: T, super_admin: T };
const ADMINS = { patient: F, doctor: F, hospital: F, ambulance: F, admin: T, super_admin: T };
const SUPER = { patient: F, doctor: F, hospital: F, ambulance: F, admin: F, super_admin: T };

const CATALOG: Group[] = [
  {
    name: "Patient features",
    perms: [
      { key: "patient.book_appointment", label: "Book appointments", description: "Schedule visits with verified doctors", defaults: { ...ALL } },
      { key: "patient.video_consult", label: "Video consultation", description: "Join secure consultation rooms", defaults: { ...ALL } },
      { key: "patient.pharmacy_order", label: "Order medicines", description: "Place pharmacy orders and track delivery", defaults: { ...ALL } },
      { key: "patient.book_ambulance", label: "Book ambulance", description: "Request emergency / scheduled ambulance", defaults: { ...ALL } },
      { key: "patient.sos", label: "SOS emergency button", description: "One-tap emergency dispatch", defaults: { ...ALL } },
    ],
  },
  {
    name: "Doctor workspace",
    perms: [
      { key: "doctor.workspace", label: "Clinical workspace", description: "Live consultation workspace", defaults: { ...STAFF, hospital: F, ambulance: F } },
      { key: "doctor.prescribe", label: "Issue prescriptions", description: "Create and sign prescriptions", defaults: { doctor: T, admin: T, super_admin: T } },
      { key: "doctor.templates", label: "Rx templates", description: "Save reusable prescription templates", defaults: { doctor: T, admin: T, super_admin: T } },
      { key: "doctor.analytics", label: "Earnings & analytics", description: "View own earnings and performance", defaults: { doctor: T, admin: T, super_admin: T } },
    ],
  },
  {
    name: "Hospital portal",
    perms: [
      { key: "hospital.branches", label: "Manage branches", description: "Create and edit branches", defaults: { hospital: T, admin: T, super_admin: T } },
      { key: "hospital.departments", label: "Manage departments", description: "Configure departments per branch", defaults: { hospital: T, admin: T, super_admin: T } },
      { key: "hospital.beds", label: "Bed & ICU availability", description: "Update live bed counts", defaults: { hospital: T, admin: T, super_admin: T } },
    ],
  },
  {
    name: "Ambulance operations",
    perms: [
      { key: "ambulance.fleet", label: "Manage fleet", description: "Add vehicles and drivers", defaults: { ambulance: T, admin: T, super_admin: T } },
      { key: "ambulance.driver_app", label: "Driver app", description: "Accept jobs and stream location", defaults: { ambulance: T, admin: T, super_admin: T } },
      { key: "ambulance.dispatch", label: "Dispatch override", description: "Reassign live bookings", defaults: { admin: T, super_admin: T } },
    ],
  },
  {
    name: "Admin operations",
    perms: [
      { key: "admin.verify_doctors", label: "Verify doctors", description: "Approve/reject doctor applications", defaults: { ...ADMINS } },
      { key: "admin.verify_hospitals", label: "Verify hospitals", description: "Approve hospital partners", defaults: { ...ADMINS } },
      { key: "admin.verify_ambulance", label: "Verify ambulance providers", description: "Approve ambulance partners", defaults: { ...ADMINS } },
      { key: "admin.payments", label: "Finance & payouts", description: "View payments, refunds, invoices", defaults: { ...ADMINS } },
      { key: "admin.emergency_console", label: "Emergency console", description: "Triage live SOS requests", defaults: { ...ADMINS } },
    ],
  },
  {
    name: "Super admin",
    perms: [
      { key: "super.grant_roles", label: "Grant / revoke roles", description: "Promote users into any role", defaults: { ...SUPER } },
      { key: "super.permissions", label: "Edit permissions matrix", description: "Toggle this very page", defaults: { ...SUPER } },
      { key: "super.rotate_keys", label: "Rotate API keys", description: "Emergency key rotation", defaults: { ...SUPER } },
    ],
  },
];

const ROLE_LABEL: Record<AppRole, string> = {
  patient: "Patient", doctor: "Doctor", hospital: "Hospital",
  ambulance: "Ambulance", admin: "Admin", super_admin: "Super",
};
const ROLE_TINT: Record<AppRole, string> = {
  patient: "from-slate-400 to-slate-500",
  doctor: "from-emerald-500 to-teal-500",
  hospital: "from-sky-500 to-cyan-500",
  ambulance: "from-rose-500 to-pink-500",
  admin: "from-violet-500 to-fuchsia-500",
  super_admin: "from-amber-400 to-orange-500",
};

function PermissionsPage() {
  const { roles } = useAuth();
  const isSuper = primaryRole(roles) === "super_admin";

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("role_permissions").select("role, permission_key, allowed");
    if (error) toast.error(error.message);
    const next: Record<string, boolean> = {};
    for (const row of data ?? []) next[`${row.role}:${row.permission_key}`] = !!row.allowed;
    setOverrides(next);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.map((g) => ({
      ...g,
      perms: g.perms.filter((p) =>
        p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.key.includes(q)
      ),
    })).filter((g) => g.perms.length > 0);
  }, [query]);

  const isAllowed = (role: AppRole, perm: Perm) => {
    const k = `${role}:${perm.key}`;
    if (k in overrides) return overrides[k];
    return !!perm.defaults[role];
  };

  const toggle = async (role: AppRole, perm: Perm) => {
    if (!isSuper) { toast.error("Only super admins can change permissions"); return; }
    if (role === "super_admin" && perm.key === "super.permissions") {
      toast.error("This safeguard cannot be disabled");
      return;
    }
    const next = !isAllowed(role, perm);
    const k = `${role}:${perm.key}`;
    setSavingKey(k);
    setOverrides((o) => ({ ...o, [k]: next }));
    const { error } = await supabase.rpc("set_role_permission", { _role: role, _key: perm.key, _allowed: next });
    setSavingKey(null);
    if (error) {
      toast.error(error.message);
      setOverrides((o) => { const { [k]: _drop, ...rest } = o; return rest; });
    } else {
      toast.success(`${ROLE_LABEL[role]} · ${perm.label} ${next ? "enabled" : "disabled"}`);
    }
  };

  const resetAll = async () => {
    if (!isSuper) return;
    if (!confirm("Reset every role back to factory defaults? This clears all overrides.")) return;
    const { error } = await supabase.from("role_permissions").delete().not("id", "is", null);
    if (error) return toast.error(error.message);
    setOverrides({});
    toast.success("Permissions matrix reset to defaults");
  };

  const totalOverrides = Object.keys(overrides).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-[var(--gradient-primary)] p-8 text-primary-foreground shadow-elevated">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <ShieldCheck className="h-3 w-3" /> Access control
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Permissions Matrix</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Toggle exactly what each role can access across the platform. Changes apply on the user's next page load.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1">{CATALOG.reduce((n, g) => n + g.perms.length, 0)} permissions</span>
              <span className="rounded-full bg-white/15 px-3 py-1">{ALL_ROLES.length} roles</span>
              <span className="rounded-full bg-white/15 px-3 py-1">{totalOverrides} custom override{totalOverrides === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/20">
            <KeyRound className="h-9 w-9" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search permissions…" className="pl-9" />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
        <Button variant="ghost" onClick={resetAll} disabled={!isSuper || totalOverrides === 0} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </Button>
      </div>

      {!isSuper && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-900">
            <Lock className="h-4 w-4" />
            You can view the matrix, but only super admins can change toggles.
          </CardContent>
        </Card>
      )}

      {/* Matrix */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <tr>
                  <th className="sticky left-0 z-20 min-w-[280px] bg-muted/60 px-4 py-3 text-left font-medium text-muted-foreground">Permission</th>
                  {ALL_ROLES.map((r) => (
                    <th key={r} className="px-3 py-3 text-center font-medium">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${ROLE_TINT[r]} text-[10px] font-bold text-white shadow`}>
                          {ROLE_LABEL[r].slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs">{ROLE_LABEL[r]}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={ALL_ROLES.length + 1} className="py-16 text-center text-muted-foreground">Loading matrix…</td></tr>
                ) : groups.length === 0 ? (
                  <tr><td colSpan={ALL_ROLES.length + 1} className="py-16 text-center text-muted-foreground">No matching permissions.</td></tr>
                ) : (
                  groups.map((g) => (
                    <Fragment key={g.name}>
                      <tr className="bg-gradient-to-r from-primary/5 to-transparent">
                        <td colSpan={ALL_ROLES.length + 1} className="sticky left-0 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary">
                          {g.name}
                        </td>
                      </tr>
                      {g.perms.map((p) => (
                        <tr key={p.key} className="border-t hover:bg-muted/30">
                          <td className="sticky left-0 z-10 bg-background/95 px-4 py-3">
                            <div className="font-medium">{p.label}</div>
                            <div className="text-xs text-muted-foreground">{p.description}</div>
                            <div className="mt-1 font-mono text-[10px] text-muted-foreground/70">{p.key}</div>
                          </td>
                          {ALL_ROLES.map((r) => {
                            const allowed = isAllowed(r, p);
                            const overridden = `${r}:${p.key}` in overrides;
                            const k = `${r}:${p.key}`;
                            return (
                              <td key={r} className="px-3 py-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Switch
                                    checked={allowed}
                                    onCheckedChange={() => toggle(r, p)}
                                    disabled={!isSuper || savingKey === k}
                                  />
                                  {overridden && (
                                    <Badge variant="outline" className="px-1.5 py-0 text-[9px]">custom</Badge>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="p-5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">How this works · </span>
          Defaults reflect the role's baseline access. Toggling creates a stored override and shows a <Badge variant="outline" className="mx-1 px-1.5 py-0 text-[9px]">custom</Badge> tag.
          Use Reset to clear every override and restore the factory matrix.
        </CardContent>
      </Card>
    </div>
  );
}
