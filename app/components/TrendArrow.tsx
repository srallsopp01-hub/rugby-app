"use client";

type TrendArrowProps = {
  delta: number;
  suffix?: string;
  invert?: boolean;
  className?: string;
};

export function TrendArrow({ delta, suffix = "", invert = false, className = "" }: TrendArrowProps) {
  if (delta === 0) return null;

  const isPositive = invert ? delta < 0 : delta > 0;
  const colorClass = isPositive ? "text-success" : "text-danger";
  const arrow = delta > 0 ? "↑" : "↓";
  const display = `${arrow} ${Math.abs(delta).toFixed(1)}${suffix}`;

  return (
    <span className={`text-[10px] font-semibold ${colorClass} ${className}`}>
      {display}
    </span>
  );
}
