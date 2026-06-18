import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, MapPin, CreditCard } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/appointments")({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["appts", user?.id],
    queryFn: async () => (await supabase.from("appointments").select("*, doctors(full_name, specialty)").eq("patient_id", user!.id).order("scheduled_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl font-bold">My appointments</h1>
      {data.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No appointments yet.</p>
          <Link to="/doctors"><Button className="mt-4 bg-gradient-primary">Find a doctor</Button></Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((a: any) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {a.mode === "video" ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                </div>
                <div>
                  <div className="font-semibold">{a.doctors?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{a.doctors?.specialty} · {formatDateTime(a.scheduled_at)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.status === "confirmed" ? "default" : a.status === "completed" ? "secondary" : "outline"}>
                  {a.status.replace("_", " ")}
                </Badge>
                {a.status === "pending_payment" && (
                  <Link to="/payments"><Button size="sm" variant="outline"><CreditCard className="mr-1 h-3 w-3" />Pay</Button></Link>
                )}
                {a.status === "confirmed" && a.mode === "video" && (
                  <Button size="sm" className="bg-gradient-primary"><Video className="mr-1 h-3 w-3" />Join call</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
