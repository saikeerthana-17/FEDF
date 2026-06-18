import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Users, IndianRupee } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ appts: 0, patients: 0, revenue: 0, rating: 4.8 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: doc } = await supabase.from("doctors").select("id, rating").eq("user_id", user.id).maybeSingle();
      if (!doc) return;
      const { data: appts } = await supabase.from("appointments").select("patient_id").eq("doctor_id", doc.id);
      const { data: pays } = await supabase.from("payments").select("amount").eq("doctor_id", doc.id).eq("status", "succeeded");
      const revenue = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const patients = new Set((appts ?? []).map((a) => a.patient_id)).size;
      setStats({ appts: appts?.length ?? 0, patients, revenue, rating: Number(doc.rating ?? 4.8) });
    })();
  }, [user]);

  const items = [
    { icon: Activity, label: "Total appointments", value: stats.appts },
    { icon: Users, label: "Unique patients", value: stats.patients },
    { icon: IndianRupee, label: "Revenue (₹)", value: stats.revenue.toLocaleString() },
    { icon: TrendingUp, label: "Rating", value: stats.rating.toFixed(1) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Practice performance at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <Card key={it.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{it.label}</div>
                <it.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 font-display text-3xl font-bold">{it.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Weekly activity</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-2">
            {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/20 to-primary" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 text-center text-xs text-muted-foreground">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d}>{d}</div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
