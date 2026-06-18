import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProviderInput = z.object({
  name: z.string().min(2).max(200),
  city: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  driver_full_name: z.string().min(2).max(150),
  driver_phone: z.string().max(30).optional(),
  license_number: z.string().max(80).optional(),
  vehicle_number: z.string().min(2).max(40),
  ambulance_type: z.enum(["basic", "als", "icu", "neonatal"]),
});

export const applyAsAmbulanceOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ProviderInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase.from("ambulance_providers").select("id").eq("owner_user_id", userId).maybeSingle();
    if (existing) throw new Error("You already have an operator application");

    const { data: provider, error } = await supabase.from("ambulance_providers").insert({
      owner_user_id: userId,
      name: data.name,
      city: data.city ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      application_status: "pending",
    }).select().single();
    if (error) throw new Error(error.message);

    const { data: driver, error: e2 } = await supabase.from("ambulance_drivers").insert({
      provider_id: provider.id,
      user_id: userId,
      full_name: data.driver_full_name,
      phone: data.driver_phone ?? null,
      license_number: data.license_number ?? null,
    }).select().single();
    if (e2) throw new Error(e2.message);

    const { data: ambulance, error: e3 } = await supabase.from("ambulances").insert({
      provider_id: provider.id,
      vehicle_number: data.vehicle_number,
      ambulance_type: data.ambulance_type,
      active_driver_id: driver.id,
      status: "offline",
    }).select().single();
    if (e3) throw new Error(e3.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "ambulance" }).select();

    return { provider, driver, ambulance };
  });
