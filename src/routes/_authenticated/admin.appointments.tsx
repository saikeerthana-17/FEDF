import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { Calendar, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/appointments")({
  component: AdminAppointmentsPage,
});

function AdminAppointmentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: appts } = await supabase.from("appointments")
        .select("*, doctors(full_name, specialty)")
        .order("scheduled_at", { ascending: false })
        .limit(200);
      const list = appts ?? [];
      const ids = Array.from(new Set(list.map((a: any) => a.patient_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,full_name").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      setItems(list.map((a: any) => ({ ...a, _patient_name: map.get(a.patient_id) })));
    })();
  }, []);

  const filters = ["all", "confirmed", "pending_payment", "completed", "cancelled"];
  const visible = items.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return (a.doctors?.full_name ?? "").toLowerCase().includes(t)
      || (a._patient_name ?? "").toLowerCase().includes(t)
      || (a.doctors?.specialty ?? "").toLowerCase().includes(t);
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Appointments</h1>
        <p className="text-sm text-muted-foreground">All bookings across the platform.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search doctor, patient, specialty…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={"rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors " +
                (filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {visible.length === 0 && (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No appointments found.</CardContent></Card>
        )}
        {visible.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate font-medium">{a.doctors?.full_name ?? "—"}</div>
                  <Badge variant="outline" className="text-[10px]">{a.doctors?.specialty}</Badge>
                  {a.is_emergency && <Badge variant="destructive" className="text-[10px]">Emergency</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Patient: {a._patient_name ?? a.patient_id.slice(0, 8)} · {formatDateTime(a.scheduled_at)} · {a.mode}
                </div>
              </div>
              <Badge variant={a.status === "confirmed" ? "default" : a.status === "cancelled" ? "destructive" : "secondary"}>
                {a.status?.replace("_", " ")}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
