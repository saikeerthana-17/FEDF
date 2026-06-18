/// <reference types="google.maps" />
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Phone, Navigation, Star, Loader2, Pill, Hospital, ExternalLink, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useLocation, mapsUrl } from "@/hooks/use-location";
import { searchNearbyPlaces, type NearbyPlace } from "@/lib/places.functions";

export const Route = createFileRoute("/_authenticated/nearby")({
  head: () => ({
    meta: [
      { title: "Nearby Pharmacies & Hospitals — MediCare+" },
      { name: "description", content: "Find pharmacies and hospitals near your current location with live map, ratings, distance, call and directions." },
    ],
  }),
  component: NearbyPage,
});

type PlaceType = "pharmacy" | "hospital";

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Load Google Maps JS API once
let mapsLoader: Promise<typeof google> | null = null;
function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (mapsLoader) return mapsLoader;
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  mapsLoader = new Promise((resolve, reject) => {
    (window as any).__initMediCareMap = () => resolve((window as any).google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initMediCareMap${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return mapsLoader;
}

function NearbyPage() {
  const { coords, permission, requestLocation, requesting } = useLocation();
  const search = useServerFn(searchNearbyPlaces);
  const [type, setType] = useState<PlaceType>("pharmacy");
  const [radius, setRadius] = useState(5000);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // Init map when coords first available
  useEffect(() => {
    if (!coords || !mapDivRef.current || mapRef.current) return;
    loadGoogleMaps()
      .then((g) => {
        if (!mapDivRef.current) return;
        const map = new g.maps.Map(mapDivRef.current, {
          center: { lat: coords.lat, lng: coords.lng },
          zoom: 14,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;
        infoRef.current = new g.maps.InfoWindow();
        userMarkerRef.current = new g.maps.Marker({
          map,
          position: { lat: coords.lat, lng: coords.lng },
          title: "You are here",
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
        });
      })
      .catch((e) => toast.error(e.message || "Could not load map"));
  }, [coords]);

  // Run search
  const runSearch = async () => {
    if (!coords) {
      const c = await requestLocation();
      if (!c) return;
    }
    const c = coords ?? (await requestLocation());
    if (!c) return;
    setLoading(true);
    const { places: results, error } = await search({ data: { lat: c.lat, lng: c.lng, type, radius } });
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setPlaces(results);
    setSelectedId(null);
  };

  // Auto-run when coords first arrive or type/radius changes (with debounce on radius)
  useEffect(() => {
    if (!coords) return;
    const t = setTimeout(() => runSearch(), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng, type, radius]);

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof window === "undefined") return;
    const g = (window as any).google as typeof google;
    if (!g) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new g.maps.LatLngBounds();
    if (coords) bounds.extend({ lat: coords.lat, lng: coords.lng });

    places.forEach((p) => {
      const marker = new g.maps.Marker({
        map,
        position: { lat: p.lat, lng: p.lng },
        title: p.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: type === "pharmacy" ? "#16a34a" : "#dc2626",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        setSelectedId(p.id);
        infoRef.current?.setContent(
          `<div style="font-family:system-ui;max-width:220px"><div style="font-weight:600;margin-bottom:4px">${p.name}</div><div style="font-size:12px;color:#555">${p.address}</div></div>`,
        );
        infoRef.current?.open({ map, anchor: marker });
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: p.lat, lng: p.lng });
    });

    if (places.length > 0) map.fitBounds(bounds, 60);
  }, [places, coords, type]);

  // Pan to selected card
  useEffect(() => {
    if (!selectedId) return;
    const place = places.find((p) => p.id === selectedId);
    if (!place || !mapRef.current) return;
    mapRef.current.panTo({ lat: place.lat, lng: place.lng });
    mapRef.current.setZoom(Math.max(mapRef.current.getZoom() ?? 14, 15));
  }, [selectedId, places]);

  const sorted = useMemo(() => {
    if (!coords) return places;
    return [...places].sort(
      (a, b) => distanceKm(coords.lat, coords.lng, a.lat, a.lng) - distanceKm(coords.lat, coords.lng, b.lat, b.lng),
    );
  }, [places, coords]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="flex items-center gap-3 font-display text-3xl font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          Nearby health services
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live map of pharmacies and hospitals around your current location.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <Tabs value={type} onValueChange={(v) => setType(v as PlaceType)}>
            <TabsList>
              <TabsTrigger value="pharmacy" className="gap-2"><Pill className="h-4 w-4" /> Pharmacies</TabsTrigger>
              <TabsTrigger value="hospital" className="gap-2"><Hospital className="h-4 w-4" /> Hospitals</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex min-w-[220px] flex-1 items-center gap-3">
            <span className="shrink-0 text-xs text-muted-foreground">Radius: {(radius / 1000).toFixed(1)} km</span>
            <Slider min={1000} max={15000} step={500} value={[radius]} onValueChange={(v) => setRadius(v[0])} />
          </div>
          {!coords ? (
            <Button onClick={requestLocation} disabled={requesting} size="sm">
              {requesting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <MapPin className="mr-2 h-3 w-3" />}
              {permission === "denied" ? "Location blocked" : "Share location"}
            </Button>
          ) : (
            <Button onClick={runSearch} disabled={loading} size="sm" variant="outline">
              {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              Refresh
            </Button>
          )}
        </CardContent>
      </Card>

      {!coords && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {permission === "denied"
                ? "Location access is blocked. Enable location in your browser to find nearby services."
                : "Share your location to see pharmacies and hospitals around you."}
            </div>
          </CardContent>
        </Card>
      )}

      {coords && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-2">
            {loading && places.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching nearby…
              </div>
            )}
            {!loading && sorted.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                No {type === "pharmacy" ? "pharmacies" : "hospitals"} found in this radius. Try increasing it.
              </div>
            )}
            {sorted.map((p) => {
              const d = distanceKm(coords.lat, coords.lng, p.lat, p.lng);
              const selected = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`group w-full rounded-xl border bg-card p-3 text-left transition-colors ${
                    selected ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold">{p.name}</div>
                        {p.openNow === true && <Badge variant="outline" className="border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400">Open</Badge>}
                        {p.openNow === false && <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400">Closed</Badge>}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{p.address}</div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />{d.toFixed(1)} km</span>
                        {p.rating != null && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {p.rating.toFixed(1)}{p.userRatingCount ? ` (${p.userRatingCount})` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.phone && (
                      <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="h-7 gap-1.5"><Phone className="h-3 w-3" />Call</Button>
                      </a>
                    )}
                    <a
                      href={p.googleMapsUri || mapsUrl(p.lat, p.lng)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="outline" className="h-7 gap-1.5"><Navigation className="h-3 w-3" />Directions</Button>
                    </a>
                    {p.websiteUri && (
                      <a href={p.websiteUri} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 gap-1.5"><Globe className="h-3 w-3" />Website<ExternalLink className="h-3 w-3" /></Button>
                      </a>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-xl border bg-muted/30">
            <div ref={mapDivRef} className="h-[70vh] w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
