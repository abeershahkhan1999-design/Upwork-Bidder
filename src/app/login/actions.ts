"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface SendLinkState {
  status: "idle" | "sent" | "error";
  message?: string;
}

export async function sendMagicLink(
  _prev: SendLinkState,
  formData: FormData
): Promise<SendLinkState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { status: "error", message: "Enter your email address." };
  }

  const supabase = await createClient();

  // Only the three seeded accounts may sign in — check before sending a
  // link so a stranger's address never gets an email, and to show the
  // exact copy the design calls for.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, active")
    .eq("email", email)
    .maybeSingle();

  if (!profile || !profile.active) {
    return { status: "error", message: "That address isn't on the Qualix team." };
  }

  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return { status: "error", message: "Couldn't send the link. Try again in a moment." };
  }

  return { status: "sent" };
}
