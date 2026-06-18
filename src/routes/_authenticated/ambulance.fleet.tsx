import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/ambulance/fleet")({
  head: () => ({ meta: [{ title: "Fleet — MediCare+" }] }),
  component: Fleet,
});

function Fleet() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("ambulance_providers").select("*").eq("owner_user_id", user.id).maybeSingle();
      setProvider(p);
      if (p) {
        const { data: a } = await supabase.from("ambulances").select("*").eq("provider_id", p.id);
        setAmbulances(a ?? []);
        const { data: t } = await supabase.from("ambulance_bookings").select("*").eq("provider_id", p.id).order("created_at", { ascending: false }).limit(20);
        setTrips(t ?? []);
      }
    })();
  }, [user]);

  if (!provider) return <Card className="p-6">No operator account found.</Card>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{provider.name}</h1>
        <div className="text-sm text-muted-foreground">{provider.city} {provider.is_verified ? "· Verified" : "· Pending verification"}</div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Vehicles</div>
        <div className="grid gap-3 md:grid-cols-2">
          {ambulances.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{a.vehicle_number}</div>
                  <div className="text-xs uppercase text-muted-foreground">{a.ambulance_type}</div>
                </div>
                <Badge variant={a.status === "available" ? "default" : "outline"}>{a.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recent trips</div>
        <div className="space-y-2">
          {trips.length === 0 && <div className="text-sm text-muted-foreground">No trips yet.</div>}
          {trips.map((t) => (
            <Card key={t.id} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm">{t.pickup_address ?? `${t.pickup_lat?.toFixed(3)}, ${t.pickup_lng?.toFixed(3)}`}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
              </div>
              <Badge variant="outline">{t.status}</Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
