import { Badge } from "@chakra-ui/react";

const tones = {
  neutral: { bg: "#eef1f5", color: "#334155" },
  info: { bg: "#eaf1fe", color: "#1d4ed8" },
  warning: { bg: "#fff4db", color: "#9a5b00" },
  success: { bg: "#e3f6ec", color: "#1e7a4c" },
  accent: { bg: "#f1eafe", color: "#6b3fcf" },
  danger: { bg: "#fdecec", color: "#b42318" },
} as const;

export type BadgeLabel = { label: string; tone: keyof typeof tones };

type BadgePillProps = BadgeLabel & { size?: "sm" | "md" };

export function BadgePill({ label, tone, size = "sm" }: BadgePillProps) {
  return (
    <Badge
      variant="plain"
      size={size}
      {...tones[tone]}
      minH="0"
      justifyContent="center"
      rounded="full"
      px="3"
      py="1"
      fontFamily='"Noto Sans JP", sans-serif'
      fontSize={size === "md" ? "14px" : "11px"}
      lineHeight={1.4}
      fontWeight="bold"
    >
      {label}
    </Badge>
  );
}
