"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function chooseHomeShore(formData: FormData) {
  const supabase = await createClient();
  const shoreZoneId = formData.get("shoreZoneId") as string;

  const { error } = await supabase.rpc("set_home_shore", {
    p_shore_zone_id: shoreZoneId,
  });

  if (error) {
    logger.warn("Home Shore selection failed", { error: error.message });
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
