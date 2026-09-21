import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/database.types";

export interface CurrentProfile {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  role: UserRole;
  active: boolean;
}

// The proxy already redirects unauthenticated / deactivated users, so a
// missing profile here means something raced it — bounce to /login rather
// than rendering a half-authenticated page.
export async function requireProfile(): Promise<CurrentProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, initials, role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.active) redirect("/login");

  return profile;
}

export async function requireAdminOrLead(): Promise<CurrentProfile> {
  const profile = await requireProfile();
  if (profile.role === "bidder") redirect("/bidder");
  return profile;
}
