import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["doctor", "hospital", "ambulance", "admin", "super_admin"] as const;
type Role = (typeof ROLES)[number];

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles: string[] = (data ?? []).map((r: any) => r.role);
  const isSuper = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuper;
  if (!isAdmin) throw new Error("Admins only");
  return { isAdmin, isSuper };
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- Create ---------------- */
export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        role: z.enum(ROLES),
        message: z.string().trim().max(500).optional(),
        expires_in_days: z.number().int().min(1).max(60).default(14),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isSuper } = await assertAdmin(supabase, userId);
    if (data.role === "super_admin" && !isSuper) {
      throw new Error("Only super admins can invite other super admins");
    }

    // Prevent duplicate active invites for the same email/role
    const { data: existing } = await supabaseAdmin
      .from("admin_invites")
      .select("id")
      .eq("email", data.email)
      .eq("role", data.role)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) throw new Error("An active invite already exists for that email + role");

    const token = randomToken();
    const expires_at = new Date(Date.now() + data.expires_in_days * 86400_000).toISOString();

    const { data: row, error } = await supabaseAdmin
      .from("admin_invites")
      .insert({
        email: data.email,
        role: data.role,
        token,
        invited_by: userId,
        message: data.message ?? null,
        expires_at,
      })
      .select("id, email, role, token, expires_at, status, created_at, message")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ---------------- List ---------------- */
export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data, error } = await supabaseAdmin
      .from("admin_invites")
      .select("id, email, role, status, expires_at, accepted_at, created_at, invited_by, message, token")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    // Map expired pending → "expired" for display, without mutating storage
    const now = Date.now();
    return (data ?? []).map((r) => ({
      ...r,
      status: r.status === "pending" && new Date(r.expires_at).getTime() < now ? "expired" : r.status,
    }));
  });

/* ---------------- Revoke ---------------- */
export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { error } = await supabaseAdmin
      .from("admin_invites")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Resend (rotate token + extend) ---------------- */
export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const token = randomToken();
    const expires_at = new Date(Date.now() + 14 * 86400_000).toISOString();
    const { data: row, error } = await supabaseAdmin
      .from("admin_invites")
      .update({ token, expires_at, status: "pending" })
      .eq("id", data.id)
      .select("id, email, role, token, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ---------------- Lookup (for acceptance UI) ---------------- */
export const lookupInvite = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("admin_invites")
      .select("id, email, role, status, expires_at, message")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { found: false as const };
    const expired = new Date(row.expires_at).getTime() < Date.now();
    return { found: true as const, invite: { ...row, status: expired && row.status === "pending" ? "expired" : row.status } };
  });

/* ---------------- Accept ---------------- */
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const userEmail = (claims as any)?.email?.toLowerCase?.() ?? null;

    const { data: invite, error } = await supabaseAdmin
      .from("admin_invites")
      .select("id, email, role, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") throw new Error(`Invite is ${invite.status}`);
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Invite has expired");
    if (userEmail && userEmail !== invite.email.toLowerCase()) {
      throw new Error(`This invite is for ${invite.email}. Sign in with that email to accept.`);
    }

    // Grant role
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: invite.role }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    // Mark invite accepted
    await supabaseAdmin
      .from("admin_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq("id", invite.id);

    return { ok: true, role: invite.role };
  });
