import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/use-location";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "loc-prompt-dismissed";

export function LocationPrompt() {
  const { user } = useAuth();
  const { permission, requestLocation, requesting } = useLocation();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (permission === "granted" || permission === "denied") {
      setDismissed(true);
      return;
    }
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(DISMISS_KEY) : "1";
    setDismissed(stored === "1");
    // Check profile consent — only prompt once per user account
    supabase.from("profiles").select("location_consent").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.location_consent) setDismissed(true);
    });
  }, [user, permission]);

  if (dismissed || permission === "granted") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 rounded-xl border border-primary/30 bg-card p-4 shadow-elevated">
      <button
        aria-label="Dismiss"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Enable location</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Required for SOS ambulance dispatch and ordering medicines from nearby pharmacies.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                await requestLocation();
              }}
              disabled={requesting}
            >
              {requesting ? "Requesting…" : "Allow location"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                sessionStorage.setItem(DISMISS_KEY, "1");
                setDismissed(true);
              }}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
