import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const FARE_BASE = { basic: 500, als: 1000, icu: 1800, neonatal: 2200 } as const;
const PER_KM = { basic: 35, als: 60, icu: 90, neonatal: 110 } as const;

const BookInput = z.object({
  ambulanceType: z.enum(["basic", "als", "icu", "neonatal"]),
  pickupLat: z.number(),
  pickupLng: z.number(),
  pickupAddress: z.string().max(500).optional(),
  dropLat: z.number().optional(),
  dropLng: z.number().optional(),
  dropAddress: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const createAmbulanceBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => BookInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let fareEstimate = FARE_BASE[data.ambulanceType];
    if (data.dropLat != null && data.dropLng != null) {
      const km = distanceKm({ lat: data.pickupLat, lng: data.pickupLng }, { lat: data.dropLat, lng: data.dropLng });
      fareEstimate += Math.round(km * PER_KM[data.ambulanceType]);
    }

    const { data: booking, error } = await supabase.from("ambulance_bookings").insert({
      patient_user_id: userId,
      ambulance_type: data.ambulanceType,
      pickup_lat: data.pickupLat,
      pickup_lng: data.pickupLng,
      pickup_address: data.pickupAddress ?? null,
      drop_lat: data.dropLat ?? null,
      drop_lng: data.dropLng ?? null,
      drop_address: data.dropAddress ?? null,
      notes: data.notes ?? null,
      status: "searching",
      fare_estimate: fareEstimate,
    }).select().single();

    if (error) throw new Error(error.message);
    return { booking };
  });

const AcceptInput = z.object({ bookingId: z.string().uuid(), ambulanceId: z.string().uuid(), etaMinutes: z.number().int().min(1).max(180) });
export const acceptAmbulanceBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AcceptInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: amb, error: e1 } = await supabase
      .from("ambulances").select("id, provider_id, active_driver_id").eq("id", data.ambulanceId).maybeSingle();
    if (e1 || !amb) throw new Error("Ambulance not found");

    const { data: drv } = await supabase
      .from("ambulance_drivers").select("id, user_id").eq("user_id", userId).maybeSingle();
    if (!drv) throw new Error("Not a registered driver");

    const { error } = await supabase.from("ambulance_bookings").update({
      ambulance_id: data.ambulanceId,
      driver_id: drv.id,
      provider_id: amb.provider_id,
      status: "assigned",
      eta_minutes: data.etaMinutes,
      updated_at: new Date().toISOString(),
    }).eq("id", data.bookingId);
    if (error) throw new Error(error.message);

    await supabase.from("ambulances").update({ status: "on_trip" }).eq("id", data.ambulanceId);
    return { ok: true };
  });

const StatusInput = z.object({ bookingId: z.string().uuid(), status: z.enum(["en_route", "arrived", "in_transit", "completed", "cancelled"]) });
export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => StatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("ambulance_bookings").update({
      status: data.status,
      updated_at: new Date().toISOString(),
    }).eq("id", data.bookingId);
    if (error) throw new Error(error.message);
    if (data.status === "completed" || data.status === "cancelled") {
      const { data: b } = await supabase.from("ambulance_bookings").select("ambulance_id").eq("id", data.bookingId).maybeSingle();
      if (b?.ambulance_id) {
        await supabase.from("ambulances").update({ status: "available" }).eq("id", b.ambulance_id);
      }
    }
    return { ok: true };
  });
