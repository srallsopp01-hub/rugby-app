type StatusPillVariant = "success" | "warning" | "danger" | "neutral";
type StatusPillSize = "sm" | "md";

type StatusPillProps = {
  variant?: StatusPillVariant;
  size?: StatusPillSize;
  uppercase?: boolean;
  children: React.ReactNode;
  className?: string;
  title?: string;
};

const variantClasses: Record<StatusPillVariant, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  neutral: "border-border bg-panel-2 text-muted",
};

const sizeClasses: Record<StatusPillSize, string> = {
  sm: "px-2 py-0.5 text-[11px] font-medium",
  md: "px-2.5 py-1 text-xs font-medium",
};

export function StatusPill({
  variant = "neutral",
  size = "sm",
  uppercase = false,
  children,
  className,
  title,
}: StatusPillProps) {
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center rounded-full border",
        variantClasses[variant],
        sizeClasses[size],
        uppercase ? "uppercase tracking-wide" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
