import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Siren, Phone, MapPin, ExternalLink } from "lucide-react";
import { mapsUrl } from "@/hooks/use-location";

export const Route = createFileRoute("/_authenticated/admin/emergency")({
  component: EmergencyPage,
});

function EmergencyPage() {
  const [sos, setSos] = useState<any[]>([]);
  const [appts, setAppts] = useState<any[]>([]);

  const load = async () => {
    const [s, a] = await Promise.all([
      supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("appointments").select("*").eq("is_emergency", true).order("created_at", { ascending: false }),
    ]);
    setSos(s.data ?? []);
    setAppts(a.data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("er-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("emergency_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Emergency Triage</h1>
          <p className="text-sm text-muted-foreground">SOS dispatch requests and high-priority cases.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Siren className="h-4 w-4 text-destructive" />Live SOS requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sos.length === 0 && <p className="text-sm text-muted-foreground">No active SOS requests.</p>}
          {sos.map((r) => {
            const ps = (r.patient_summary ?? {}) as any;
            return (
              <div key={r.id} className={`rounded-lg border p-4 ${r.status === "open" ? "border-destructive/40 bg-destructive/5" : "bg-muted/30"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {r.request_type === "ambulance" ? "🚑 Ambulance dispatch" : "📞 Call request"}
                      </span>
                      <Badge variant={r.status === "open" ? "destructive" : "secondary"} className="capitalize">{r.status}</Badge>
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <div><strong className="text-foreground">Patient:</strong> {ps.full_name ?? r.user_id.slice(0, 8)}</div>
                      <div><strong className="text-foreground">Phone:</strong> {ps.phone ?? "—"}</div>
                      <div><strong className="text-foreground">Age/Sex:</strong> {ps.age ?? "—"} / {ps.gender ?? "—"}</div>
                      <div><strong className="text-foreground">Blood:</strong> {ps.blood_group ?? "—"}</div>
                      {ps.allergies && <div className="sm:col-span-2"><strong className="text-foreground">Allergies:</strong> {ps.allergies}</div>}
                      {ps.chronic_conditions && <div className="sm:col-span-2"><strong className="text-foreground">Conditions:</strong> {ps.chronic_conditions}</div>}
                      {r.address_note && <div className="sm:col-span-2"><strong className="text-foreground">Notes:</strong> {r.address_note}</div>}
                    </div>
                    {r.lat && r.lng && (
                      <a href={mapsUrl(r.lat, r.lng)} target="_blank" rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <MapPin className="h-3 w-3" /> {r.lat.toFixed(4)}, {r.lng.toFixed(4)} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {r.status === "open" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, "dispatched")}>Mark dispatched</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "resolved")}>Resolve</Button>
                    {ps.phone && <a href={`tel:${ps.phone}`}><Button size="sm" variant="outline"><Phone className="mr-1 h-3 w-3" />Call patient</Button></a>}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Emergency appointments</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {appts.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
          {appts.map((a) => (
            <div key={a.id} className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{a.reason || "Emergency consultation"}</div>
              <div className="text-xs text-muted-foreground">Patient {a.patient_id.slice(0, 8)} · {a.mode}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
