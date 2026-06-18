import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, ShieldCheck, Sparkles, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { acceptInvite, lookupInvite } from "@/lib/admin-invites.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/invite/$token")({
  head: () => ({ meta: [{ title: "Accept invitation — MediCare+" }] }),
  component: AcceptInvitePage,
});

const ROLE_LABEL: Record<string, string> = {
  doctor: "Doctor", hospital: "Hospital admin", ambulance: "Ambulance ops",
  admin: "Platform admin", super_admin: "Super admin",
};

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const { user, refreshRoles } = useAuth();
  const lookupFn = useServerFn(lookupInvite);
  const acceptFn = useServerFn(acceptInvite);
  const navigate = useNavigate();

  const [state, setState] = useState<"loading" | "ready" | "missing" | "expired" | "wrong_email" | "done" | "error">("loading");
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await lookupFn({ data: { token } });
        if (cancelled) return;
        if (!res.found) return setState("missing");
        setInvite(res.invite);
        if (res.invite.status === "expired") return setState("expired");
        if (res.invite.status !== "pending") return setState("error"), setError(`This invitation was ${res.invite.status}.`);
        if (user?.email && user.email.toLowerCase() !== res.invite.email.toLowerCase()) return setState("wrong_email");
        setState("ready");
      } catch (e: any) {
        if (!cancelled) { setState("error"); setError(e.message ?? "Could not load invitation"); }
      }
    })();
    return () => { cancelled = true; };
  }, [token, lookupFn, user?.email]);

  const accept = async () => {
    setAccepting(true);
    try {
      const res = await acceptFn({ data: { token } });
      await refreshRoles();
      toast.success(`Welcome aboard as ${ROLE_LABEL[res.role] ?? res.role}`);
      setState("done");
      setTimeout(() => navigate({ to: "/dashboard" }), 1200);
    } catch (e: any) {
      toast.error(e.message ?? "Could not accept");
      setError(e.message ?? "Could not accept");
      setState("error");
    } finally { setAccepting(false); }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-12">
      <Card className="w-full overflow-hidden">
        <div className="bg-[var(--gradient-primary)] p-6 text-primary-foreground">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
            <Sparkles className="h-3 w-3" /> Invitation
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">Join MediCare+</h1>
          <p className="mt-1 text-sm text-white/80">Claim the role assigned to you by an administrator.</p>
        </div>

        <CardContent className="p-6">
          {state === "loading" && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking invitation…
            </div>
          )}

          {state === "missing" && (
            <Status icon={<AlertTriangle className="h-6 w-6" />} tone="rose" title="Invitation not found"
              description="This link is invalid or has been removed. Ask the admin to send a fresh one." />
          )}

          {state === "expired" && (
            <Status icon={<AlertTriangle className="h-6 w-6" />} tone="amber" title="Invitation expired"
              description="Ask the admin to rotate the link from the Invitations dashboard." />
          )}

          {state === "wrong_email" && invite && (
            <Status icon={<Mail className="h-6 w-6" />} tone="amber"
              title="Sign in with the invited email"
              description={`This invitation is for ${invite.email}. You're currently signed in as ${user?.email}.`}
            />
          )}

          {state === "error" && (
            <Status icon={<AlertTriangle className="h-6 w-6" />} tone="rose" title="Something went wrong"
              description={error ?? "Please try again."} />
          )}

          {state === "ready" && invite && (
            <div className="space-y-5">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{invite.email}</div>
                    <div className="text-xs text-muted-foreground">Invited as</div>
                  </div>
                  <Badge className="ml-auto">{ROLE_LABEL[invite.role] ?? invite.role}</Badge>
                </div>
                {invite.message && (
                  <p className="mt-3 border-t pt-3 text-sm italic text-muted-foreground">"{invite.message}"</p>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Accepting will unlock the matching portal on your next page load. You can revoke this at any time.
              </div>

              <Button onClick={accept} disabled={accepting} className="w-full gap-2" size="lg">
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {accepting ? "Activating…" : "Accept & continue"}
              </Button>
            </div>
          )}

          {state === "done" && (
            <Status icon={<ShieldCheck className="h-6 w-6" />} tone="emerald" title="You're in"
              description="Redirecting to your new dashboard…" />
          )}

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground hover:underline">Back to dashboard</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Status({
  icon, title, description, tone,
}: { icon: React.ReactNode; title: string; description: string; tone: "rose" | "amber" | "emerald" }) {
  const cls =
    tone === "rose" ? "bg-rose-50 text-rose-700 ring-rose-200" :
    tone === "amber" ? "bg-amber-50 text-amber-700 ring-amber-200" :
    "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${cls}`}>{icon}</div>
      <div className="font-semibold">{title}</div>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
