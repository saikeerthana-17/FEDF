import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pill, Search, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pharmacy")({
  component: AdminPharmacyPage,
});

function AdminPharmacyPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [meds, setMeds] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("pharmacies").select("*").order("created_at", { ascending: false }).then(({ data }) => setPharmacies(data ?? []));
    supabase.from("medicines").select("*").order("name").then(({ data }) => setMeds(data ?? []));
  }, []);

  const visibleMeds = meds.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()));
  const lowStock = meds.filter((m) => m.stock < 10).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Pharmacy</h1>
        <p className="text-sm text-muted-foreground">Pharmacies and medicine inventory across the platform.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pharmacies" value={pharmacies.length} />
        <Stat label="Medicines" value={meds.length} />
        <Stat label="Low stock" value={lowStock} tone={lowStock > 0 ? "text-orange-600" : ""} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Pharmacies</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {pharmacies.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Pill className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{p.name}</div>
                    {p.is_verified && <Badge className="bg-emerald-500/15 text-emerald-700">Verified</Badge>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {p.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</span>}
                    {p.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {pharmacies.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No pharmacies yet.</CardContent></Card>}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Medicine inventory</h2>
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search medicines…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {visibleMeds.slice(0, 100).map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.brand || "—"} · ₹{Number(m.price).toFixed(2)} / {m.unit}</div>
                  </div>
                  <Badge variant={m.stock === 0 ? "destructive" : m.stock < 10 ? "secondary" : "default"}>
                    {m.stock === 0 ? "Out" : `${m.stock} in stock`}
                  </Badge>
                </div>
              ))}
              {visibleMeds.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No medicines.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-2xl font-bold ${tone}`}>{value}</div>
    </CardContent></Card>
  );
}
