import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, BedDouble, ShieldCheck, Clock, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/hospital/dashboard")({
  head: () => ({ meta: [{ title: "Hospital Dashboard — MediCare+" }] }),
  component: HospitalDashboard,
});

function HospitalDashboard() {
  const { user } = useAuth();
  const [hospital, setHospital] = useState<any>(null);
  const [stats, setStats] = useState({ branches: 0, totalBeds: 0, availableBeds: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: h } = await supabase.from("hospitals").select("*").eq("owner_user_id", user.id).maybeSingle();
      setHospital(h);
      if (h) {
        const { data: branches } = await supabase.from("hospital_branches").select("id").eq("hospital_id", h.id);
        const branchIds = (branches ?? []).map((b: any) => b.id);
        let totalBeds = 0, availableBeds = 0;
        if (branchIds.length) {
          const { data: beds } = await supabase.from("hospital_beds").select("total_beds, available_beds").in("branch_id", branchIds);
          for (const b of beds ?? []) { totalBeds += b.total_beds; availableBeds += b.available_beds; }
        }
        setStats({ branches: branches?.length ?? 0, totalBeds, availableBeds });
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!hospital) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl font-bold">No hospital yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Register your hospital to access the portal.</p>
          <Link to="/signup-hospital" className="mt-4 inline-block"><Button>Register hospital</Button></Link>
        </Card>
      </div>
    );
  }

  const occupancy = stats.totalBeds ? Math.round(((stats.totalBeds - stats.availableBeds) / stats.totalBeds) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-[var(--gradient-primary)] p-8 text-primary-foreground shadow-elevated">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl" />
        <div className="absolute -bottom-12 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur-md">
              {hospital.is_verified
                ? <><ShieldCheck className="h-3 w-3" /> Verified hospital</>
                : <><Clock className="h-3 w-3" /> Pending verification</>}
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">{hospital.name}</h1>
            <div className="mt-1 text-sm text-white/80">{hospital.city ? `${hospital.city} · ` : ""}{hospital.hospital_type?.replace(/_/g, " ")}</div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:min-w-[440px]">
            <HeroStat icon={Building2} value={stats.branches} label="Branches" />
            <HeroStat icon={BedDouble} value={stats.totalBeds} label="Total beds" />
            <HeroStat icon={BedDouble} value={`${stats.availableBeds}`} label="Available" />
          </div>
        </div>
        {stats.totalBeds > 0 && (
          <div className="relative mt-6">
            <div className="mb-1 flex items-center justify-between text-xs text-white/80">
              <span>Live occupancy</span>
              <span className="font-semibold">{occupancy}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${occupancy}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/hospital/branches"><Card className="p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevated h-full"><Building2 className="h-6 w-6 text-primary" /><div className="mt-3 font-semibold">Manage branches</div><div className="text-sm text-muted-foreground">Add locations, contact info, geo coordinates.</div></Card></Link>
        <Link to="/hospital/departments"><Card className="p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevated h-full"><Network className="h-6 w-6 text-primary" /><div className="mt-3 font-semibold">Departments</div><div className="text-sm text-muted-foreground">Specialties, heads of dept and contacts per branch.</div></Card></Link>
        <Link to="/hospital/beds"><Card className="p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevated h-full"><BedDouble className="h-6 w-6 text-primary" /><div className="mt-3 font-semibold">Bed & ICU inventory</div><div className="text-sm text-muted-foreground">Update ward-level availability in real time.</div></Card></Link>
      </div>
    </div>
  );
}

function HeroStat({ icon: Icon, value, label }: { icon: any; value: any; label: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
      <div className="flex items-center justify-between text-white/70">
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-1 font-display text-xl font-bold leading-tight">{value}</div>
    </div>
  );
}
