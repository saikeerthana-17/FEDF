import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Navigation, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { acceptAmbulanceBooking, updateBookingStatus } from "@/lib/ambulance.functions";

export const Route = createFileRoute("/_authenticated/ambulance/driver")({
  head: () => ({ meta: [{ title: "Driver App — MediCare+" }] }),
  component: DriverApp,
});

function DriverApp() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<any>(null);
  const [ambulance, setAmbulance] = useState<any>(null);
  const [online, setOnline] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const watchRef = useRef<number | null>(null);
  const accept = useServerFn(acceptAmbulanceBooking);
  const setStatus = useServerFn(updateBookingStatus);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: d } = await supabase.from("ambulance_drivers").select("*").eq("user_id", user.id).maybeSingle();
      setDriver(d);
      if (d) {
        const { data: a } = await supabase.from("ambulances").select("*").eq("active_driver_id", d.id).maybeSingle();
        setAmbulance(a);
        setOnline(a?.status === "available");
        const { data: act } = await supabase.from("ambulance_bookings").select("*").eq("driver_id", d.id).in("status", ["assigned", "en_route", "arrived", "in_transit"]).maybeSingle();
        setActive(act);
      }
    })();
  }, [user]);

  // Poll available requests when online & no active booking
  useEffect(() => {
    if (!online || active) return;
    const fetchReqs = async () => {
      const { data } = await supabase.from("ambulance_bookings").select("*").eq("status", "searching").order("created_at", { ascending: false }).limit(10);
      setRequests(data ?? []);
    };
    fetchReqs();
    const ch = supabase.channel("amb-search").on("postgres_changes", { event: "*", schema: "public", table: "ambulance_bookings" }, fetchReqs).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [online, active]);

  // GPS push when online
  useEffect(() => {
    if (!ambulance) return;
    if (!online) {
      if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      return;
    }
    if (!("geolocation" in navigator)) return;
    let lastSent = 0;
    watchRef.current = navigator.geolocation.watchPosition(async (pos) => {
      const now = Date.now();
      if (now - lastSent < 5000) return;
      lastSent = now;
      await supabase.from("ambulance_locations").insert({
        ambulance_id: ambulance.id,
        lat: pos.coords.latitude, lng: pos.coords.longitude,
        heading: pos.coords.heading ?? null, speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : null,
      });
    }, (err) => console.error(err), { enableHighAccuracy: true, maximumAge: 5000 });
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [online, ambulance]);

  const toggleOnline = async () => {
    if (!ambulance) return;
    const next = !online;
    const { error } = await supabase.from("ambulances").update({ status: next ? "available" : "offline" }).eq("id", ambulance.id);
    if (error) return toast.error(error.message);
    setOnline(next);
    toast.success(next ? "You're online — ready for trips" : "You're offline");
  };

  const onAccept = async (b: any) => {
    try {
      await accept({ data: { bookingId: b.id, ambulanceId: ambulance.id, etaMinutes: 10 } });
      toast.success("Booking accepted");
      const { data: act } = await supabase.from("ambulance_bookings").select("*").eq("id", b.id).maybeSingle();
      setActive(act);
    } catch (e: any) { toast.error(e.message); }
  };

  const advance = async (status: "en_route" | "arrived" | "in_transit" | "completed") => {
    if (!active) return;
    try {
      await setStatus({ data: { bookingId: active.id, status } });
      if (status === "completed") setActive(null);
      else setActive({ ...active, status });
    } catch (e: any) { toast.error(e.message); }
  };

  if (!driver) return <Card className="p-6">You aren't registered as a driver. <a className="text-primary underline" href="/signup-ambulance">Register here</a>.</Card>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Driver — {driver.full_name}</h1>
          <div className="text-sm text-muted-foreground">{ambulance ? `${ambulance.vehicle_number} · ${ambulance.ambulance_type.toUpperCase()}` : "No ambulance assigned"}</div>
        </div>
        <Button onClick={toggleOnline} variant={online ? "destructive" : "default"} className="gap-2">
          <Power className="h-4 w-4" />{online ? "Go offline" : "Go online"}
        </Button>
      </div>

      {active ? (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <Badge>{active.status.replace("_", " ")}</Badge>
              <div className="mt-2 font-semibold">Active trip</div>
              <div className="text-sm text-muted-foreground">Pickup: {active.pickup_address ?? `${active.pickup_lat.toFixed(4)}, ${active.pickup_lng.toFixed(4)}`}</div>
              {active.drop_address && <div className="text-sm text-muted-foreground">Drop: {active.drop_address}</div>}
              <div className="mt-2 text-sm">Fare est. ₹{active.fare_estimate}</div>
            </div>
            <div className="flex flex-col gap-2">
              {active.status === "assigned" && <Button onClick={() => advance("en_route")}>Start trip</Button>}
              {active.status === "en_route" && <Button onClick={() => advance("arrived")}>Arrived at pickup</Button>}
              {active.status === "arrived" && <Button onClick={() => advance("in_transit")}>Picked up patient</Button>}
              {active.status === "in_transit" && <Button onClick={() => advance("completed")}>Complete trip</Button>}
            </div>
          </div>
        </Card>
      ) : online ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold uppercase text-muted-foreground">Incoming requests</div>
          {requests.length === 0 && <Card className="p-6 text-sm text-muted-foreground">Waiting for new requests…</Card>}
          {requests.map((r) => (
            <Card key={r.id} className="flex items-center justify-between p-4">
              <div>
                <Badge variant="outline">{r.ambulance_type.toUpperCase()}</Badge>
                <div className="mt-1 text-sm">{r.pickup_address ?? `${r.pickup_lat.toFixed(4)}, ${r.pickup_lng.toFixed(4)}`}</div>
                <div className="text-xs text-muted-foreground">Est. ₹{r.fare_estimate}</div>
              </div>
              <Button onClick={() => onAccept(r)} className="gap-2"><Navigation className="h-4 w-4" />Accept</Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center text-sm text-muted-foreground">Go online to receive trip requests.</Card>
      )}
    </div>
  );
}
