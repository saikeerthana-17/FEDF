import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Ambulance, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/ambulance")({
  component: AdminAmbulancePage,
});

function AdminAmbulancePage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "verified" | "all">("pending");

  const load = async () => {
    const { data } = await supabase.from("ambulance_providers").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const verify = async (id: string, val: boolean) => {
    const { error } = await supabase.from("ambulance_providers").update({
      is_verified: val,
      application_status: val ? "approved" : "rejected",
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(val ? "Provider approved" : "Provider revoked");
    load();
  };

  const filtered = items.filter((h) =>
    filter === "all" ? true : filter === "verified" ? h.is_verified : !h.is_verified,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Ambulance Providers</h1>
          <p className="text-sm text-muted-foreground">Approve fleet operator applications.</p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {(["pending", "verified", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={"rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors " +
                (filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {f} {f !== "all" && `(${items.filter((d) => f === "verified" ? d.is_verified : !d.is_verified).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No providers in this view.</CardContent></Card>
        )}
        {filtered.map((h) => (
          <Card key={h.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Ambulance className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium truncate">{h.name}</div>
                  {h.is_verified ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700">Verified</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {h.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{h.city}</span>}
                  {h.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{h.phone}</span>}
                  {h.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{h.email}</span>}
                </div>
              </div>
              {h.is_verified ? (
                <Button variant="outline" size="sm" onClick={() => verify(h.id, false)}>
                  <XCircle className="mr-1 h-4 w-4" />Revoke
                </Button>
              ) : (
                <Button size="sm" onClick={() => verify(h.id, true)}>
                  <CheckCircle2 className="mr-1 h-4 w-4" />Approve
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
