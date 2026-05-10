import { StatusPill } from "./StatusPill";
import type { ComponentProps } from "react";

type StatusPillVariant = ComponentProps<typeof StatusPill>["variant"];

const gradeVariant: Record<string, StatusPillVariant> = {
  Dominant: "success",
  Competitive: "warning",
  Below: "danger",
  Poor: "danger",
};

export function GradeBadge({ grade }: { grade: string }) {
  return (
    <StatusPill variant={gradeVariant[grade] ?? "neutral"} size="sm">
      {grade}
    </StatusPill>
  );
}
