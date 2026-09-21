import type { UserRole } from "@/lib/database.types";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super admin",
  team_lead: "Team lead",
  bidder: "Bidder",
};
