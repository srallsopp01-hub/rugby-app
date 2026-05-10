"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Action = {
  label: string;
  onClick?: () => void;
  href?: string;
};

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: Action;
  secondaryAction?: Action;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeConfig = {
  sm: { py: "py-8", iconSize: 32, iconPadding: "p-2.5", titleClass: "text-base font-medium text-foreground-strong" },
  md: { py: "py-12", iconSize: 40, iconPadding: "p-3",   titleClass: "text-base font-medium text-foreground-strong" },
  lg: { py: "py-16", iconSize: 48, iconPadding: "p-3.5", titleClass: "text-lg font-semibold text-foreground-strong" },
};

function ActionButton({ action, primary }: { action: Action; primary: boolean }) {
  const base = primary
    ? "rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
    : "rounded-xl border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-panel";

  if (action.href) {
    return <Link href={action.href} className={base}>{action.label}</Link>;
  }
  return (
    <button type="button" onClick={action.onClick} className={base}>
      {action.label}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  className,
}: EmptyStateProps) {
  const { py, iconSize, iconPadding, titleClass } = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center text-center ${py} px-6 ${className ?? ""}`}>
      {Icon && (
        <div className={`mb-4 flex items-center justify-center rounded-full bg-panel-2 ${iconPadding}`}>
          <Icon size={iconSize} className="text-muted-2" />
        </div>
      )}
      <p className={titleClass}>{title}</p>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {action && <ActionButton action={action} primary />}
          {secondaryAction && <ActionButton action={secondaryAction} primary={false} />}
        </div>
      )}
    </div>
  );
}
