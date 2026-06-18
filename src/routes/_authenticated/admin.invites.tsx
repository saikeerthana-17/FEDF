import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail, Send, Copy, Check, RotateCcw, Ban, Clock, ShieldCheck, Search, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, primaryRole, type AppRole } from "@/hooks/use-auth";
import {
  createInvite, listInvites, revokeInvite, resendInvite,
} from "@/lib/admin-invites.functions";

export const Route = createFileRoute("/_authenticated/admin/invites")({
  head: () => ({ meta: [{ title: "Invitations — MediCare+" }] }),
  component: InvitesPage,
});

const ROLE_OPTIONS: { value: AppRole; label: string; tint: string; desc: string }[] = [
  { value: "doctor", label: "Doctor", tint: "from-emerald-500 to-teal-500", desc: "Clinical workspace + prescribing" },
  { value: "hospital", label: "Hospital admin", tint: "from-sky-500 to-cyan-500", desc: "Branches, departments, beds" },
  { value: "ambulance", label: "Ambulance ops", tint: "from-rose-500 to-pink-500", desc: "Fleet + driver dispatch" },
  { value: "admin", label: "Platform admin", tint: "from-violet-500 to-fuchsia-500", desc: "Verification + finance + ops" },
  { value: "super_admin", label: "Super admin", tint: "from-amber-400 to-orange-500", desc: "Full mission control" },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  revoked: { label: "Revoked", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  expired: { label: "Expired", cls: "bg-rose-100 text-rose-800 border-rose-300" },
};

function inviteLink(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

function InvitesPage() {
  const { roles } = useAuth();
  const isSuper = primaryRole(roles) === "super_admin";

  const listFn = useServerFn(listInvites);
  const createFn = useServerFn(createInvite);
  const revokeFn = useServerFn(revokeInvite);
  const resendFn = useServerFn(resendInvite);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("doctor");
  const [message, setMessage] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFn();
      setItems(data ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (!q) return true;
      return i.email.toLowerCase().includes(q) || i.role.includes(q);
    });
  }, [items, query, filterStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, pending: 0, accepted: 0, revoked: 0, expired: 0 };
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items]);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const inv = await createFn({ data: { email: email.trim(), role, message: message.trim() || undefined } });
      toast.success(`Invitation ready for ${inv.email}`);
      setShareToken(inv.token);
      setEmail(""); setMessage("");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not create invite");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (token: string, id: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      setCopiedId(id);
      toast.success("Invite link copied");
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this invitation? The link will stop working.")) return;
    try {
      await revokeFn({ data: { id } });
      toast.success("Invitation revoked");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const resend = async (id: string) => {
    try {
      const inv = await resendFn({ data: { id } });
      toast.success("New link generated");
      setShareToken(inv.token);
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-[var(--gradient-primary)] p-8 text-primary-foreground shadow-elevated">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <ShieldCheck className="h-3 w-3" /> Secure onboarding
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Invitations</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Invite professionals by email and pre-assign their role. The recipient just signs in with that email to claim access — no exposed APIs, no manual role wiring.
            </p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShareToken(null); }}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary" className="gap-2 shadow-lg">
                <UserPlus className="h-4 w-4" /> New invitation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Invite a professional</DialogTitle>
                <DialogDescription>
                  They'll receive access to the matching portal as soon as they sign in with this email.
                </DialogDescription>
              </DialogHeader>

              {shareToken ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900">
                    <div className="flex items-center gap-2 font-medium"><Check className="h-4 w-4" /> Invitation ready</div>
                    <p className="mt-1 text-xs">Share this secure link with the recipient.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={inviteLink(shareToken)} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                    <Button size="icon" variant="outline" onClick={() => copy(shareToken, "share")}>
                      {copiedId === "share" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setShareToken(null)}>Send another</Button>
                    <Button onClick={() => setOpen(false)}>Done</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Recipient email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="person@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign role</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.filter((r) => r.value !== "super_admin" || isSuper).map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{r.label}</span>
                              <span className="text-xs text-muted-foreground">{r.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {role === "super_admin" && !isSuper && (
                      <p className="text-xs text-amber-700">Only super admins can invite other super admins.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-msg">Personal note (optional)</Label>
                    <Textarea
                      id="invite-msg"
                      maxLength={500}
                      rows={3}
                      placeholder="Looking forward to having you on the team."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={submit} disabled={busy || !email.trim()} className="gap-2">
                      <Send className="h-4 w-4" />
                      {busy ? "Creating…" : "Create invitation"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email or role…" className="pl-9" />
        </div>
        {(["all", "pending", "accepted", "revoked", "expired"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filterStatus === s ? "default" : "outline"}
            onClick={() => setFilterStatus(s)}
            className="gap-1.5 capitalize"
          >
            {s} <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{counts[s] ?? 0}</Badge>
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Loading invitations…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-7 w-7" />
            </div>
            <div className="font-semibold">No invitations {filterStatus !== "all" ? `in "${filterStatus}"` : "yet"}</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Click <span className="font-medium text-foreground">New invitation</span> to onboard your first professional.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((i) => {
            const meta = ROLE_OPTIONS.find((r) => r.value === i.role);
            const statusMeta = STATUS_META[i.status] ?? STATUS_META.pending;
            const expiresIn = Math.ceil((new Date(i.expires_at).getTime() - Date.now()) / 86400_000);
            return (
              <Card key={i.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta?.tint ?? "from-slate-400 to-slate-500"} text-white shadow`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.email}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{meta?.label ?? i.role}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {i.status === "pending"
                          ? expiresIn > 0 ? `expires in ${expiresIn}d` : "expired"
                          : i.status === "accepted"
                            ? `accepted ${new Date(i.accepted_at).toLocaleDateString()}`
                            : new Date(i.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusMeta.cls}`}>{statusMeta.label}</Badge>
                  {i.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => copy(i.token, i.id)} className="gap-1">
                        {copiedId === i.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        Link
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resend(i.id)} className="gap-1">
                        <RotateCcw className="h-3.5 w-3.5" /> Rotate
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive" onClick={() => revoke(i.id)}>
                        <Ban className="h-3.5 w-3.5" /> Revoke
                      </Button>
                    </>
                  )}
                  {i.status === "expired" && (
                    <Button size="sm" variant="outline" onClick={() => resend(i.id)} className="gap-1">
                      <RotateCcw className="h-3.5 w-3.5" /> Reissue
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
