"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function breakSeal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const bottleId = formData.get("bottleId") as string;

  const { error } = await supabase.rpc("break_seal", {
    p_bottle_id: bottleId,
  });

  if (error) {
    logger.warn("Break seal failed", { error: error.message });
    redirect(`/messages/${bottleId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${bottleId}`);
  revalidatePath("/");
  redirect(`/messages/${bottleId}`);
}

export async function reportBottle(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const bottleId = formData.get("bottleId") as string;
  const reason = formData.get("reason") as string;

  const { error } = await supabase.from("reports").insert({
    bottle_id: bottleId,
    reporter_id: user.id,
    reason: reason || "No reason given",
  });

  if (error) {
    logger.warn("Report failed", { error: error.message });
  }

  revalidatePath(`/messages/${bottleId}`);
}
