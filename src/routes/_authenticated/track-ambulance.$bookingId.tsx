/// <reference types="google.maps" />
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Ambulance, Clock, MapPin, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleMaps, haversineKm } from "@/lib/google-maps";

export const Route = createFileRoute("/_authenticated/track-ambulance/$bookingId")({
  head: () => ({ meta: [{ title: "Live Tracking — MediCare+" }] }),
  component: TrackPage,
});

type Booking = {
  id: string; status: string; pickup_lat: number; pickup_lng: number;
  pickup_address: string | null; drop_address: string | null;
  ambulance_id: string | null; driver_id: string | null;
  fare_estimate: number | null; eta_minutes: number | null; ambulance_type: string;
};

const STATUS_LABEL: Record<string, string> = {
  requested: "Requesting", searching: "Searching for ambulance",
  assigned: "Driver assigned", en_route: "En route to pickup",
  arrived: "Arrived at pickup", in_transit: "On the way to hospital",
  completed: "Trip completed", cancelled: "Cancelled",
};

function TrackPage() {
  const { bookingId } = Route.useParams();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const ambMarkerRef = useRef<google.maps.Marker | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const pathRef = useRef<google.maps.Polyline | null>(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [driver, setDriver] = useState<{ full_name: string; phone: string | null } | null>(null);
  const [ambLoc, setAmbLoc] = useState<{ lat: number; lng: number; heading?: number | null; speed_kmh?: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load booking + subscribe to updates
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("ambulance_bookings").select("*").eq("id", bookingId).maybeSingle();
      if (cancelled) return;
      if (error || !data) { setError(error?.message ?? "Booking not found"); return; }
      setBooking(data as Booking);
      if (data.driver_id) {
        const { data: d } = await supabase.from("ambulance_drivers").select("full_name, phone").eq("id", data.driver_id).maybeSingle();
        if (!cancelled && d) setDriver(d);
      }
    })();
    const ch = supabase
      .channel(`booking-${bookingId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ambulance_bookings", filter: `id=eq.${bookingId}` }, async (payload) => {
        const next = payload.new as Booking;
        setBooking(next);
        if (next.driver_id && !driver) {
          const { data: d } = await supabase.from("ambulance_drivers").select("full_name, phone").eq("id", next.driver_id).maybeSingle();
          if (d) setDriver(d);
        }
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [bookingId]);

  // Subscribe to ambulance live location once we know the ambulance_id
  const ambulanceId = booking?.ambulance_id ?? null;
  useEffect(() => {
    if (!ambulanceId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ambulance_locations")
        .select("lat,lng,heading,speed_kmh")
        .eq("ambulance_id", ambulanceId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setAmbLoc(data as any);
    })();
    const ch = supabase
      .channel(`amb-${ambulanceId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "ambulance_locations", filter: `ambulance_id=eq.${ambulanceId}` },
        (payload) => setAmbLoc(payload.new as any)
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [ambulanceId]);

  // Initialise map
  useEffect(() => {
    if (!booking || !mapDivRef.current || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled || !mapDivRef.current) return;
      const center = { lat: booking.pickup_lat, lng: booking.pickup_lng };
      const map = new g.maps.Map(mapDivRef.current, {
        center, zoom: 14,
        disableDefaultUI: true, zoomControl: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1424" }] },
          { featureType: "poi", stylers: [{ visibility: "off" }] },
        ],
      });
      mapRef.current = map;
      pickupMarkerRef.current = new g.maps.Marker({
        map, position: center, title: "Pickup",
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#10b981", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
      });
    }).catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [booking]);

  // Update ambulance marker + fit bounds
  useEffect(() => {
    const map = mapRef.current; if (!map || !ambLoc || !booking) return;
    const g = (window as any).google as typeof google;
    const pos = { lat: ambLoc.lat, lng: ambLoc.lng };
    if (!ambMarkerRef.current) {
      ambMarkerRef.current = new g.maps.Marker({
        map, position: pos, title: "Ambulance",
        icon: { path: "M -8 -4 L 8 -4 L 8 4 L -8 4 Z M -3 -1 L 3 -1 M 0 -3 L 0 1", scale: 1.4, fillColor: "#ef4444", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 1.5, rotation: ambLoc.heading ?? 0 },
        zIndex: 999,
      });
    } else {
      ambMarkerRef.current.setPosition(pos);
      const icon = ambMarkerRef.current.getIcon() as google.maps.Symbol;
      ambMarkerRef.current.setIcon({ ...icon, rotation: ambLoc.heading ?? icon.rotation ?? 0 });
    }
    // Polyline pickup<->ambulance
    const path = [pos, { lat: booking.pickup_lat, lng: booking.pickup_lng }];
    if (!pathRef.current) {
      pathRef.current = new g.maps.Polyline({ map, path, strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 4 });
    } else {
      pathRef.current.setPath(path);
    }
    const bounds = new g.maps.LatLngBounds();
    bounds.extend(pos); bounds.extend({ lat: booking.pickup_lat, lng: booking.pickup_lng });
    map.fitBounds(bounds, 80);
  }, [ambLoc, booking]);

  if (error) return <Card className="p-6"><div className="text-destructive">{error}</div></Card>;
  if (!booking) return <Card className="p-6">Loading trip…</Card>;

  const distanceKm = ambLoc ? haversineKm(ambLoc, { lat: booking.pickup_lat, lng: booking.pickup_lng }) : null;
  const liveEta = distanceKm != null ? Math.max(1, Math.round((distanceKm / 35) * 60)) : booking.eta_minutes;
  const isLive = ["assigned", "en_route", "arrived", "in_transit"].includes(booking.status);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="relative h-[70vh] overflow-hidden rounded-2xl border bg-card shadow-elegant">
        <div ref={mapDivRef} className="absolute inset-0" />
        {!ambLoc && isLive && (
          <div className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow">
            Waiting for ambulance GPS…
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <Badge className="gap-1"><Ambulance className="h-3 w-3" />{booking.ambulance_type.toUpperCase()}</Badge>
            <Badge variant={isLive ? "default" : "secondary"} className={isLive ? "animate-pulse" : ""}>
              {STATUS_LABEL[booking.status] ?? booking.status}
            </Badge>
          </div>

          {liveEta != null && isLive && (
            <div className="rounded-xl bg-gradient-primary p-4 text-primary-foreground">
              <div className="flex items-center gap-2 text-sm opacity-90"><Clock className="h-4 w-4" />ETA</div>
              <div className="font-display text-3xl font-bold">{liveEta} min</div>
              {distanceKm != null && <div className="text-xs opacity-80">{distanceKm.toFixed(1)} km away</div>}
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <div>
                <div className="font-medium">Pickup</div>
                <div className="text-muted-foreground">{booking.pickup_address ?? `${booking.pickup_lat.toFixed(4)}, ${booking.pickup_lng.toFixed(4)}`}</div>
              </div>
            </div>
            {booking.drop_address && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div>
                  <div className="font-medium">Drop</div>
                  <div className="text-muted-foreground">{booking.drop_address}</div>
                </div>
              </div>
            )}
          </div>

          {booking.fare_estimate != null && (
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Fare estimate</span>
              <span className="font-semibold">₹{booking.fare_estimate}</span>
            </div>
          )}
        </Card>

        {driver && (
          <Card className="space-y-2 p-5">
            <div className="text-xs uppercase text-muted-foreground">Driver</div>
            <div className="font-semibold">{driver.full_name}</div>
            {driver.phone && (
              <Button asChild variant="outline" className="w-full gap-2">
                <a href={`tel:${driver.phone}`}><Phone className="h-4 w-4" />Call driver</a>
              </Button>
            )}
          </Card>
        )}

        {booking.status === "completed" && (
          <Button asChild className="w-full"><Link to="/appointments">Back to appointments</Link></Button>
        )}
      </div>
    </div>
  );
}
