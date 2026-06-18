import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
  at: number;
}

interface LocationContextValue {
  coords: Coords | null;
  permission: PermissionState | "unknown";
  requesting: boolean;
  error: string | null;
  requestLocation: () => Promise<Coords | null>;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [permission, setPermission] = useState<PermissionState | "unknown">("unknown");
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);

  const syncToProfile = useCallback(async (c: Coords) => {
    if (!user) return;
    const now = Date.now();
    // Throttle DB writes to once per 60s
    if (now - lastSyncRef.current < 60_000) return;
    lastSyncRef.current = now;
    await supabase.from("profiles").update({
      last_lat: c.lat,
      last_lng: c.lng,
      last_location_accuracy: c.accuracy,
      last_location_at: new Date(c.at).toISOString(),
      location_consent: true,
    }).eq("id", user.id);
  }, [user]);

  const startWatch = useCallback(() => {
    if (watchIdRef.current != null || !("geolocation" in navigator)) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c: Coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: pos.timestamp,
        };
        setCoords(c);
        setPermission("granted");
        setError(null);
        syncToProfile(c);
      },
      (err) => {
        setError(err.message);
        if (err.code === err.PERMISSION_DENIED) setPermission("denied");
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
  }, [syncToProfile]);

  const requestLocation = useCallback(async (): Promise<Coords | null> => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported by this browser");
      return null;
    }
    setRequesting(true);
    return new Promise<Coords | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c: Coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            at: pos.timestamp,
          };
          setCoords(c);
          setPermission("granted");
          setError(null);
          setRequesting(false);
          syncToProfile(c);
          startWatch();
          resolve(c);
        },
        (err) => {
          setError(err.message);
          if (err.code === err.PERMISSION_DENIED) setPermission("denied");
          setRequesting(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15_000 },
      );
    });
  }, [startWatch, syncToProfile]);

  // On mount (when user is logged in), check existing permission and auto-start
  useEffect(() => {
    if (!user) return;
    if (!("geolocation" in navigator)) return;
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((status) => {
        setPermission(status.state);
        if (status.state === "granted") {
          requestLocation();
        }
        status.onchange = () => setPermission(status.state);
      }).catch(() => {});
    }
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <LocationContext.Provider value={{ coords, permission, requesting, error, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}

export const mapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export const nearbySearchUrl = (lat: number, lng: number, query: string) =>
  `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},14z`;
