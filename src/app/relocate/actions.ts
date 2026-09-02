"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function relocateHomeShore(formData: FormData) {
  const supabase = await createClient();
  const shoreZoneId = formData.get("shoreZoneId") as string;

  const { error } = await supabase.rpc("relocate_home_shore", {
    p_new_shore_id: shoreZoneId,
  });

  if (error) {
    logger.warn("Relocation failed", { error: error.message });
    redirect(`/relocate?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/profile?relocated=1");
}
