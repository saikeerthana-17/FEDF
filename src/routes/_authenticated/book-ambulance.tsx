/// <reference types="google.maps" />
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ambulance, MapPin, Loader2, Clock, Users, Heart, Baby, Activity, Check, Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "@/hooks/use-location";
import { useServerFn } from "@tanstack/react-start";
import { createAmbulanceBooking } from "@/lib/ambulance.functions";
import { loadGoogleMaps, haversineKm } from "@/lib/google-maps";
import { cn } from "@/lib/utils";
import basicImg from "@/assets/ambulance-basic.jpg";
import alsImg from "@/assets/ambulance-als.jpg";
import icuImg from "@/assets/ambulance-icu.jpg";
import neonatalImg from "@/assets/ambulance-neonatal.jpg";

export const Route = createFileRoute("/_authenticated/book-ambulance")({
  head: () => ({ meta: [{ title: "Book Ambulance — MediCare+" }] }),
  component: Book,
});

type AmbType = "basic" | "als" | "icu" | "neonatal";

interface VehicleSpec {
  id: AmbType;
  name: string;
  tagline: string;
  basePrice: number;
  perKm: number;
  capacity: string;
  equipment: string[];
  image: string;
  icon: any;
  color: string;
  avgSpeedKmh: number;
}

const VEHICLES: VehicleSpec[] = [
  {
    id: "basic", name: "Basic BLS", tagline: "Quick response · stable patient",
    basePrice: 500, perKm: 35, capacity: "1 patient + 1 attendant",
    equipment: ["Oxygen", "First aid", "Stretcher"],
    image: basicImg, icon: Ambulance, color: "#16a34a", avgSpeedKmh: 35,
  },
  {
    id: "als", name: "Advanced Life Support", tagline: "Paramedic + cardiac monitor",
    basePrice: 1000, perKm: 60, capacity: "1 patient + paramedic",
    equipment: ["Defibrillator", "ECG", "IV", "Suction"],
    image: alsImg, icon: Activity, color: "#dc2626", avgSpeedKmh: 35,
  },
  {
    id: "icu", name: "ICU on Wheels", tagline: "Mobile ICU with ventilator",
    basePrice: 1800, perKm: 90, capacity: "Critical care team",
    equipment: ["Ventilator", "Multi-para monitor", "Infusion pumps"],
    image: icuImg, icon: Heart, color: "#2563eb", avgSpeedKmh: 32,
  },
  {
    id: "neonatal", name: "Neonatal", tagline: "Newborn & infant transport",
    basePrice: 2200, perKm: 110, capacity: "Neonate + specialist",
    equipment: ["Incubator", "Warmer", "Neonatal ventilator"],
    image: neonatalImg, icon: Baby, color: "#f59e0b", avgSpeedKmh: 30,
  },
];

// Build a simulated set of nearby ambulances around user coords for the map preview
function simulateNearby(center: { lat: number; lng: number }) {
  // 2-4 vehicles per type at ring distances 0.4-3km
  const out: Array<{ id: string; type: AmbType; lat: number; lng: number; vehicleNumber: string }> = [];
  let n = 0;
  VEHICLES.forEach((v, vi) => {
    const count = v.id === "basic" ? 5 : v.id === "als" ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + vi;
      const r = 0.004 + Math.random() * 0.02; // ~0.5-2.5km
      out.push({
        id: `sim-${n++}`,
        type: v.id,
        lat: center.lat + Math.sin(angle) * r,
        lng: center.lng + Math.cos(angle) * r * 1.2,
        vehicleNumber: `KA-${10 + Math.floor(Math.random() * 80)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${1000 + Math.floor(Math.random() * 8999)}`,
      });
    }
  });
  return out;
}

function ambulanceIcon(g: typeof google, color: string) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'>
      <circle cx='22' cy='22' r='20' fill='${color}' opacity='0.15'/>
      <circle cx='22' cy='22' r='14' fill='${color}' stroke='white' stroke-width='3'/>
      <path d='M14 22h16M22 14v16' stroke='white' stroke-width='2.5' stroke-linecap='round'/>
    </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new g.maps.Size(44, 44),
    anchor: new g.maps.Point(22, 22),
  };
}

function Book() {
  const navigate = useNavigate();
  const { coords, requestLocation, requesting } = useLocation();
  const create = useServerFn(createAmbulanceBooking);

  const [selected, setSelected] = useState<AmbType>("basic");
  const [pickupAddr, setPickupAddr] = useState("");
  const [dropAddr, setDropAddr] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const fleetMarkersRef = useRef<google.maps.Marker[]>([]);

  // Stable simulated fleet, regenerated when coords arrive
  const fleet = useMemo(() => (coords ? simulateNearby(coords) : []), [coords?.lat, coords?.lng]);

  // Per-vehicle nearest unit stats
  const stats = useMemo(() => {
    if (!coords) return {} as Record<AmbType, { count: number; etaMin: number; nearestKm: number }>;
    const out: any = {};
    VEHICLES.forEach((v) => {
      const units = fleet.filter((f) => f.type === v.id);
      const distances = units.map((u) => haversineKm(coords, { lat: u.lat, lng: u.lng }));
      const nearest = distances.length ? Math.min(...distances) : 99;
      const eta = Math.max(2, Math.round((nearest / v.avgSpeedKmh) * 60));
      out[v.id] = { count: units.length, etaMin: eta, nearestKm: nearest };
    });
    return out;
  }, [fleet, coords]);

  // Init map
  useEffect(() => {
    if (!coords || !mapDivRef.current || mapRef.current) return;
    loadGoogleMaps().then((g) => {
      if (!mapDivRef.current) return;
      const map = new g.maps.Map(mapDivRef.current, {
        center: { lat: coords.lat, lng: coords.lng },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi.business", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });
      mapRef.current = map;
      userMarkerRef.current = new g.maps.Marker({
        map, position: { lat: coords.lat, lng: coords.lng }, title: "Pickup",
        icon: {
          path: g.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#2563eb",
          fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3,
        },
        zIndex: 1000,
      });
    }).catch((e) => toast.error(e.message || "Could not load map"));
  }, [coords]);

  // Sync ambulance markers (filtered by selected type — show selected type prominently, others faded)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof window === "undefined") return;
    const g = (window as any).google as typeof google;
    if (!g) return;

    fleetMarkersRef.current.forEach((m) => m.setMap(null));
    fleetMarkersRef.current = [];

    fleet.forEach((f) => {
      const spec = VEHICLES.find((v) => v.id === f.type)!;
      const isSelected = f.type === selected;
      const m = new g.maps.Marker({
        map, position: { lat: f.lat, lng: f.lng }, title: `${spec.name} · ${f.vehicleNumber}`,
        icon: ambulanceIcon(g, isSelected ? spec.color : "#94a3b8"),
        opacity: isSelected ? 1 : 0.45,
        zIndex: isSelected ? 100 : 1,
      });
      fleetMarkersRef.current.push(m);
    });
  }, [fleet, selected]);

  const book = async () => {
    let c = coords;
    if (!c) c = await requestLocation();
    if (!c) return toast.error("Location is required to book an ambulance");
    setLoading(true);
    try {
      const { booking } = await create({
        data: {
          ambulanceType: selected,
          pickupLat: c.lat, pickupLng: c.lng,
          pickupAddress: pickupAddr || undefined,
          dropAddress: dropAddr || undefined,
          notes: notes || undefined,
        },
      });
      setConfirmed(true);
      toast.success("Ambulance dispatched! Tracking now…");
      setTimeout(() => navigate({ to: "/track-ambulance/$bookingId", params: { bookingId: booking.id } }), 900);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedSpec = VEHICLES.find((v) => v.id === selected)!;
  const selectedStats = stats[selected] ?? { count: 0, etaMin: 6, nearestKm: 1 };
  const fareEstimate = selectedSpec.basePrice + Math.round(selectedStats.nearestKm * selectedSpec.perKm);

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] relative overflow-hidden bg-muted">
      {/* MAP */}
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* Top search bar */}
      <div className="absolute left-1/2 top-4 z-20 w-[min(560px,calc(100%-2rem))] -translate-x-1/2">
        <div className="rounded-2xl border border-border/60 bg-background/95 p-3 shadow-elevated backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center pt-1">
              <div className="h-2 w-2 rounded-full bg-blue-600" />
              <div className="my-1 h-6 w-px bg-border" />
              <div className="h-2 w-2 rounded-sm bg-red-600" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Input
                value={pickupAddr} onChange={(e) => setPickupAddr(e.target.value)}
                placeholder={coords ? "Pickup (using your live location)" : "Detecting location…"}
                className="h-9 border-0 bg-muted/50 text-sm focus-visible:ring-1"
              />
              <Input
                value={dropAddr} onChange={(e) => setDropAddr(e.target.value)}
                placeholder="Where to? (hospital address)"
                className="h-9 border-0 bg-muted/50 text-sm focus-visible:ring-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location prompt overlay */}
      {!coords && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="max-w-sm rounded-2xl border bg-card p-6 text-center shadow-elevated">
            <MapPin className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-3 font-display text-lg font-bold">Share your location</h3>
            <p className="mt-1 text-sm text-muted-foreground">We need it to dispatch the nearest ambulance and show a live map.</p>
            <Button onClick={requestLocation} disabled={requesting} className="mt-4 w-full gap-2">
              {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Use my location
            </Button>
          </div>
        </div>
      )}

      {/* Bottom vehicle picker sheet */}
      {coords && (
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="absolute inset-x-0 bottom-0 z-20"
        >
          <div className="mx-auto max-w-3xl rounded-t-3xl border-t border-x border-border/60 bg-background/98 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border" />

            <div className="px-4 pb-3 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">Choose your ambulance</h3>
                  <p className="text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" />{fleet.length} units around you</span>
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />ETA {selectedStats.etaMin} min</Badge>
              </div>

              {/* Horizontal vehicle cards */}
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {VEHICLES.map((v) => {
                  const s = stats[v.id] ?? { count: 0, etaMin: 6, nearestKm: 1 };
                  const fare = v.basePrice + Math.round(s.nearestKm * v.perKm);
                  const isSel = v.id === selected;
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelected(v.id)}
                      className={cn(
                        "group relative flex-shrink-0 overflow-hidden rounded-2xl border-2 bg-card text-left transition-all",
                        "w-[180px]",
                        isSel ? "border-primary shadow-elevated ring-4 ring-primary/15" : "border-border/60 hover:border-primary/40",
                      )}
                    >
                      <div className="relative h-20 w-full overflow-hidden bg-gradient-to-br from-muted to-muted/30">
                        <img
                          src={v.image} alt={v.name} loading="lazy"
                          width={768} height={512}
                          className={cn("h-full w-full object-cover transition-transform", isSel && "scale-105")}
                        />
                        {isSel && (
                          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div className="absolute bottom-1.5 left-2">
                          <Badge className="h-5 gap-1 border-0 bg-background/90 text-foreground" variant="secondary">
                            <Icon className="h-3 w-3" style={{ color: v.color }} />
                            <span className="text-[10px] font-semibold">{s.count} near</span>
                          </Badge>
                        </div>
                      </div>
                      <div className="px-3 py-2.5">
                        <div className="text-sm font-semibold leading-tight">{v.name}</div>
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{v.tagline}</div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <div className="text-base font-bold">₹{fare}</div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />{s.etaMin}m
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected details */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-xl border bg-muted/30 p-3"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" />{selectedSpec.capacity}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{selectedSpec.equipment.join(" • ")}</span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Notes (compact) */}
              <Input
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for driver (e.g. patient condition, gate number)"
                className="mt-3 h-10 text-sm"
              />

              {/* Confirm */}
              <Button
                onClick={book} disabled={loading || confirmed}
                size="lg"
                className="mt-3 w-full gap-2 bg-gradient-primary text-base font-semibold shadow-elevated"
              >
                {confirmed ? (
                  <><Check className="h-5 w-5" />Confirmed — opening tracker</>
                ) : loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" />Dispatching…</>
                ) : (
                  <>
                    <Ambulance className="h-5 w-5" />
                    Book {selectedSpec.name} · ₹{fareEstimate}
                    <Navigation className="ml-auto h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                Fare is an estimate. Final amount depends on actual distance.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
