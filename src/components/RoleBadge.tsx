import type { Me } from "@/lib/schemas/me";
import { BadgePill, type BadgeLabel } from "./BadgePill";

type Role = Me["role"];

const ROLE_META = {
  admin: { label: "admin", tone: "info" },
  member: { label: "member", tone: "accent" },
  guest: { label: "guest", tone: "neutral" },
} satisfies Record<Role, BadgeLabel>;

export function RoleBadge({ role }: { role: Role }) {
  return <BadgePill {...ROLE_META[role]} />;
}
