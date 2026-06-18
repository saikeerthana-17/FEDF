import { useEffect, useState } from "react";
import { Siren, Phone, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, mapsUrl } from "@/hooks/use-location";

// Emergency helpline (India: 108). Change to your operations number.
export const EMERGENCY_HELPLINE = "108";

export function SOSButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"choose" | "ambulance">("choose");
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  const { user } = useAuth();
  const { coords, permission, requesting, requestLocation } = useLocation();

  useEffect(() => {
    if (!open) {
      setView("choose");
      setNotes("");
      setCreatedId(null);
    }
  }, [open]);

  const bookAmbulance = async () => {
    if (!user) return;
    setSubmitting(true);
    let c = coords;
    if (!c) c = await requestLocation();

    // Fetch profile for patient summary (sent to ambulance/hospital)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,phone,age,gender,blood_group,address,allergies,chronic_conditions,emergency_contact_name,emergency_contact_phone")
      .eq("id", user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("emergency_requests")
      .insert({
        user_id: user.id,
        request_type: "ambulance",
        lat: c?.lat ?? null,
        lng: c?.lng ?? null,
        accuracy: c?.accuracy ?? null,
        address_note: notes || null,
        patient_summary: profile ?? {},
        status: "open",
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setCreatedId(data.id);
    toast.success("Ambulance dispatched — nearest providers notified");
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="gap-2 bg-destructive font-bold text-destructive-foreground shadow-lg hover:bg-destructive/90 animate-pulse"
      >
        <Siren className="h-4 w-4" />
        SOS
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          {view === "choose" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Siren className="h-5 w-5" /> Emergency SOS
                </DialogTitle>
                <DialogDescription>Choose how we can help you right now.</DialogDescription>
              </DialogHeader>

              <div className="mt-2 grid gap-3">
                <button
                  onClick={() => setView("ambulance")}
                  className="group flex items-start gap-4 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 text-left transition-colors hover:bg-destructive/10"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
                    <Siren className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold">Book an Ambulance</div>
                    <div className="text-xs text-muted-foreground">
                      Sends your GPS location & medical history to the nearest ambulance / hospital.
                    </div>
                  </div>
                </button>

                <a
                  href={`tel:${EMERGENCY_HELPLINE}`}
                  onClick={async () => {
                    if (!user) return;
                    const c = coords ?? (await requestLocation());
                    await supabase.from("emergency_requests").insert({
                      user_id: user.id,
                      request_type: "call",
                      lat: c?.lat ?? null,
                      lng: c?.lng ?? null,
                      accuracy: c?.accuracy ?? null,
                      status: "open",
                    });
                  }}
                  className="group flex items-start gap-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold">Request a call (Emergency only)</div>
                    <div className="text-xs text-muted-foreground">
                      Calls our 24/7 medical helpline ({EMERGENCY_HELPLINE}).
                    </div>
                  </div>
                </a>
              </div>
            </>
          )}

          {view === "ambulance" && !createdId && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Siren className="h-5 w-5" /> Confirm ambulance request
                </DialogTitle>
                <DialogDescription>
                  Your location and medical profile will be shared with the nearest dispatcher.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4" />
                    Live location
                  </div>
                  {coords ? (
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                      <div>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{Math.round(coords.accuracy)}m</div>
                      <a className="text-primary underline" target="_blank" rel="noreferrer" href={mapsUrl(coords.lat, coords.lng)}>
                        Open in Google Maps
                      </a>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={requestLocation} disabled={requesting}>
                        {requesting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <MapPin className="mr-2 h-3 w-3" />}
                        {permission === "denied" ? "Location blocked — enable in browser" : "Share my location"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Landmark / extra notes (optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. 2nd floor, blue gate, patient is conscious…"
                    rows={3}
                  />
                </div>

                {!coords && permission === "denied" && (
                  <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    Without location, dispatch may take longer. Please describe your address in notes.
                  </div>
                )}

                <Button onClick={bookAmbulance} disabled={submitting} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Siren className="mr-2 h-4 w-4" />}
                  Dispatch ambulance now
                </Button>
              </div>
            </>
          )}

          {createdId && (
            <>
              <DialogHeader>
                <DialogTitle className="text-green-600">Ambulance on the way</DialogTitle>
                <DialogDescription>
                  Request ID: <code className="text-xs">{createdId.slice(0, 8)}</code>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p>The nearest available ambulance has been notified. If no ambulance is available, partner hospitals are alerted to dispatch one.</p>
                <p>Stay on this page. Keep your phone unlocked — the dispatcher may call you on the number in your profile.</p>
                <a href={`tel:${EMERGENCY_HELPLINE}`} className="block">
                  <Button variant="outline" className="w-full">
                    <Phone className="mr-2 h-4 w-4" /> Call helpline ({EMERGENCY_HELPLINE})
                  </Button>
                </a>
                <Button onClick={() => setOpen(false)} className="w-full" variant="secondary">Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
