import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Pill, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/prescriptions")({
  component: PrescriptionsPage,
});

type Rx = {
  id: string;
  diagnosis: string | null;
  advice: string | null;
  follow_up_date: string | null;
  created_at: string;
  medicines: Array<{ name: string; dose?: string; frequency?: string; duration?: string }>;
};

function PrescriptionsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Rx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as unknown as Rx[]);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Prescriptions</h1>
        <p className="text-sm text-muted-foreground">All digital prescriptions issued to you.</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No prescriptions yet</p>
            <p className="text-sm text-muted-foreground">Your doctor's prescriptions will appear here after consultation.</p>
          </CardContent>
        </Card>
      ) : (
        items.map((rx) => (
          <Card key={rx.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{rx.diagnosis || "Consultation"}</CardTitle>
                <p className="text-xs text-muted-foreground">{new Date(rx.created_at).toLocaleString()}</p>
              </div>
              {rx.follow_up_date && (
                <Badge variant="secondary" className="gap-1">
                  <CalendarClock className="h-3 w-3" /> Follow-up {new Date(rx.follow_up_date).toLocaleDateString()}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {rx.medicines.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <Pill className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="text-sm">
                      <div className="font-medium">{m.name} {m.dose && <span className="text-muted-foreground">· {m.dose}</span>}</div>
                      <div className="text-xs text-muted-foreground">{[m.frequency, m.duration].filter(Boolean).join(" · ")}</div>
                    </div>
                  </div>
                ))}
              </div>
              {rx.advice && <p className="rounded-md bg-secondary/40 p-3 text-sm">{rx.advice}</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
