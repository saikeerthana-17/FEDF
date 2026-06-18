import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Ambulance, Truck, Navigation, Activity, Sparkles, ArrowRight,
  MapPin, Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ambulance/dashboard")({
  head: () => ({ meta: [{ title: "Ambulance Ops — MediCare+" }] }),
  component: AmbulanceDashboard,
});

function AmbulanceDashboard() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["amb-dash", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: provider } = await supabase.from("ambulance_providers").select("*").eq("owner_user_id", user!.id).maybeSingle();
      let fleet: any[] = [];
      let bookings: any[] = [];
      if (provider) {
        const f = await supabase.from("ambulances").select("*").eq("provider_id", provider.id);
        fleet = f.data ?? [];
        const b = await supabase.from("ambulance_bookings").select("*").eq("provider_id", provider.id).order("created_at", { ascending: false }).limit(20);
        bookings = b.data ?? [];
      }
      // Driver mode fallback
      const { data: driver } = await supabase.from("ambulance_drivers").select("*, ambulance_providers(name)").eq("user_id", user!.id).maybeSingle();
      return { provider, fleet, bookings, driver };
    },
  });

  const provider = data?.provider;
  const driver = data?.driver;
  const fleet = data?.fleet ?? [];
  const bookings = data?.bookings ?? [];
  const onDuty = fleet.filter((a) => a.status === "available" || a.status === "on_trip").length;
  const activeJobs = bookings.filter((b) => ["accepted", "en_route", "on_trip", "searching"].includes(b.status)).length;
  const completed = bookings.filter((b) => b.status === "completed").length;

  if (!provider && !driver) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-8 text-center">
          <Ambulance className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl font-bold">Get on the road</h2>
          <p className="mt-2 text-sm text-muted-foreground">Register your ambulance service or join as a driver.</p>
          <Link to="/signup-ambulance" className="mt-4 inline-block"><Button>Register provider</Button></Link>
        </Card>
      </div>
    );
  }

  // Driver-only view
  if (!provider && driver) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl border bg-[var(--gradient-primary)] p-8 text-primary-foreground shadow-elevated">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-400/30 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> Driver portal
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold">Hello, {driver.full_name}</h1>
            <p className="mt-1 text-sm text-white/80">{driver.ambulance_providers?.name}</p>
          </div>
        </div>
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Driver app</h2>
          <p className="text-sm text-muted-foreground">Go on duty, accept trips and broadcast GPS to patients.</p>
          <Link to="/ambulance/driver" className="mt-4 inline-block">
            <Button className="gap-2"><Navigation className="h-4 w-4" />Open driver console</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-[var(--gradient-primary)] p-8 text-primary-foreground shadow-elevated">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-rose-400/30 blur-3xl" />
        <div className="absolute -bottom-12 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> {provider!.is_verified ? "Verified fleet" : "Pending verification"}
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">{provider!.name}</h1>
            <div className="mt-1 text-sm text-white/80">{provider!.city ?? "—"} · Ambulance operations</div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:min-w-[440px]">
            <HeroStat icon={Truck} value={fleet.length} label="Fleet" />
            <HeroStat icon={Activity} value={onDuty} label="On duty" />
            <HeroStat icon={Navigation} value={activeJobs} label="Active jobs" />
          </div>
        </div>
      </div>

      {/* Live ops */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live operations</h2>
            <Badge variant={activeJobs > 0 ? "destructive" : "secondary"} className="gap-1">
              {activeJobs > 0 ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {activeJobs > 0 ? `${activeJobs} in progress` : "All clear"}
            </Badge>
          </div>
          {bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              No trips yet. Once patients request rides in your area, they'll appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.slice(0, 8).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{b.ambulance_type}</Badge>
                      <Badge
                        variant={b.status === "completed" ? "secondary" : b.status === "cancelled" ? "destructive" : "default"}
                        className="text-[10px]"
                      >
                        {b.status}
                      </Badge>
                      {b.eta_minutes && <span className="text-xs text-muted-foreground">ETA {b.eta_minutes}m</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{b.pickup_address || `${b.pickup_lat?.toFixed(4)}, ${b.pickup_lng?.toFixed(4)}`}</span>
                    </div>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    <Clock className="ml-auto h-3 w-3" />
                    {formatDateTime(b.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Console</h2>
          <div className="space-y-2">
            <QuickLink to="/ambulance/fleet" icon={Truck} label="Fleet" desc="Vehicles & drivers" />
            <QuickLink to="/ambulance/driver" icon={Navigation} label="Driver app" desc="On-duty controls" />
          </div>
          <div className="mt-5 rounded-xl bg-gradient-to-br from-rose-500/10 to-primary/5 p-4 ring-1 ring-rose-500/15">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Trips completed</div>
            <div className="mt-1 font-display text-3xl font-bold">{completed}</div>
            <div className="mt-1 text-xs text-muted-foreground">Lifetime · keep up the great work.</div>
          </div>
        </Card>
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

function QuickLink({ to, icon: Icon, label, desc }: { to: string; icon: any; label: string; desc: string }) {
  return (
    <Link to={to}>
      <div className="group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-primary/50 hover:bg-primary/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
