import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Patient submits a manual UPI UTR. We record it but DO NOT mark the payment
 * as succeeded here — an admin must verify the UTR against the UPI account
 * and flip status to 'succeeded' from /admin/payments. The appointment moves
 * from 'pending_payment' -> 'pending_payment' until admin confirms.
 *
 * If you wire a real payment gateway (Razorpay/Stripe) later, replace the
 * body of this function with a server-side gateway verification call before
 * setting status to 'succeeded'.
 */
export const submitUpiUtr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      paymentId: z.string().uuid(),
      utr: z.string().trim().min(6).max(32).regex(/^[A-Za-z0-9_-]+$/),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Confirm the payment belongs to this user and is still pending.
    const { data: pay, error: selErr } = await supabaseAdmin
      .from("payments")
      .select("id, patient_id, status, appointment_id, amount")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!pay) throw new Error("Payment not found");
    if (pay.patient_id !== userId) throw new Error("Not your payment");
    if (pay.status !== "pending") throw new Error("Payment is not pending");

    // Reject duplicate UTR (basic fraud control)
    const { data: dup } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("utr", data.utr)
      .neq("id", data.paymentId)
      .maybeSingle();
    if (dup) throw new Error("This transaction ID has already been used");

    const { error: updErr } = await supabaseAdmin
      .from("payments")
      .update({ utr: data.utr, status: "processing" })
      .eq("id", data.paymentId);
    if (updErr) throw new Error(updErr.message);

    return {
      ok: true,
      verification: "pending_admin_review" as const,
      message: "Transaction submitted. Our team will verify within 15 minutes.",
    };
  });

/**
 * Admin marks a payment as succeeded after verifying the UTR matches their
 * UPI account. Also confirms the linked appointment.
 */
export const adminConfirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ paymentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Admin role required");

    const { data: pay } = await supabaseAdmin
      .from("payments")
      .select("id, appointment_id, status")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!pay) throw new Error("Payment not found");
    if (pay.status === "succeeded") return { ok: true, already: true };

    await supabaseAdmin
      .from("payments")
      .update({ status: "succeeded", paid_at: new Date().toISOString() })
      .eq("id", data.paymentId);

    if (pay.appointment_id) {
      await supabaseAdmin
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", pay.appointment_id);
    }
    return { ok: true };
  });
