import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth, primaryRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { inr, formatDateTime } from "@/lib/format";
import {
  Calendar, CreditCard, Users, Activity, Stethoscope, ArrowRight,
  TrendingUp, Clock, IndianRupee,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, roles } = useAuth();
  const role = primaryRole(roles);

  const { data: appts = [] } = useQuery({
    queryKey: ["dash-appts", user?.id, role],
    queryFn: async () => {
      let q = supabase.from("appointments").select("*, doctors(full_name, specialty)").order("scheduled_at", { ascending: false }).limit(5);
      if (role === "patient") q = q.eq("patient_id", user!.id);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["dash-pay", user?.id, role],
    queryFn: async () => {
      let q = supabase.from("payments").select("amount,status,created_at").limit(50);
      if (role === "patient") q = q.eq("patient_id", user!.id);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalSpent = payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + Number(p.amount), 0);
  const upcomingCount = appts.filter((a) => a.status === "confirmed").length;

  const stats = role === "admin" ? [
    { label: "Total revenue", value: inr(totalSpent), icon: IndianRupee, trend: "+12%" },
    { label: "Appointments", value: appts.length, icon: Calendar, trend: "+8%" },
    { label: "Active doctors", value: "—", icon: Stethoscope, trend: "" },
    { label: "Live sessions", value: "0", icon: Activity, trend: "" },
  ] : role === "doctor" ? [
    { label: "Today", value: upcomingCount, icon: Calendar, trend: "" },
    { label: "Patients", value: appts.length, icon: Users, trend: "" },
    { label: "Earnings", value: inr(totalSpent), icon: IndianRupee, trend: "" },
    { label: "Rating", value: "4.9★", icon: TrendingUp, trend: "" },
  ] : [
    { label: "Upcoming", value: upcomingCount, icon: Calendar, trend: "" },
    { label: "Total visits", value: appts.length, icon: Clock, trend: "" },
    { label: "Spent", value: inr(totalSpent), icon: CreditCard, trend: "" },
    { label: "Prescriptions", value: "—", icon: Activity, trend: "" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight capitalize">{role} dashboard</h1>
        <p className="text-sm text-muted-foreground">A snapshot of your activity at MediCare+</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              {s.trend && <Badge variant="secondary" className="text-xs text-success">{s.trend}</Badge>}
            </div>
            <div className="mt-4 text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent appointments</h2>
            <Link to="/appointments"><Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
          </div>
          {appts.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              No appointments yet. <Link to="/doctors" className="font-medium text-primary hover:underline">Find a doctor</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {appts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                  <div>
                    <div className="font-medium">{a.doctors?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.doctors?.specialty} · {formatDateTime(a.scheduled_at)}</div>
                  </div>
                  <Badge variant={a.status === "confirmed" ? "default" : "secondary"}>{a.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Quick actions</h2>
          <div className="space-y-2">
            <Link to="/doctors"><Button variant="outline" className="w-full justify-start"><Users className="mr-2 h-4 w-4" />Book a doctor</Button></Link>
            <Link to="/appointments"><Button variant="outline" className="w-full justify-start"><Calendar className="mr-2 h-4 w-4" />My appointments</Button></Link>
            <Link to="/payments"><Button variant="outline" className="w-full justify-start"><CreditCard className="mr-2 h-4 w-4" />Payment history</Button></Link>
          </div>
          <div className="mt-6 rounded-xl bg-gradient-primary p-4 text-primary-foreground">
            <div className="text-xs uppercase opacity-80">Emergency</div>
            <div className="mt-1 font-semibold">Need urgent care?</div>
            <Button size="sm" variant="secondary" className="mt-3 w-full">Request now</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
