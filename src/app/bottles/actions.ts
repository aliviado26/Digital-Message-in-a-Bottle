"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  const message = formData.get("message") as string;
  const returnTo = formData.get("returnTo") === "/" ? "/" : "/bottles";

  const { error } = await supabase.rpc("release_bottle", {
    p_message: message,
  });

  if (error) {
    logger.warn("Release failed", { error: error.message });
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}${returnTo === "/" ? "#release" : ""}`);
  }

  revalidatePath("/bottles");
  revalidatePath("/");
}
