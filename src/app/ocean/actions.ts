"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function releaseBottle(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const shoreZoneId = formData.get("shoreZoneId") as string;

  const { data: zone, error: zoneError } = await supabase
    .from("shore_zones")
    .select("id, lat, lng")
    .eq("id", shoreZoneId)
    .single();

  if (zoneError || !zone) {
    logger.warn("Release failed: unknown shore zone", { shoreZoneId, error: zoneError?.message });
    return;
  }

  const { error } = await supabase.from("bottles").insert({
    sender_id: user.id,
    origin_shore_id: zone.id,
    lat: zone.lat,
    lng: zone.lng,
  });

  if (error) {
    logger.warn("Release failed", { error: error.message });
    return;
  }

  revalidatePath("/ocean");
}
