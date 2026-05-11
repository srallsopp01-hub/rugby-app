import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  helpButton?: ReactNode;
  belowHeader?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  status,
  primaryAction,
  secondaryAction,
  helpButton,
  belowHeader,
  className,
}: PageHeaderProps) {
  return (
    <div className={className}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
              {title}
            </h1>
            {helpButton}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          )}
        </div>
        {(status || secondaryAction || primaryAction) && (
          <div className="flex shrink-0 items-center gap-3">
            {status}
            {secondaryAction}
            {primaryAction}
          </div>
        )}
      </div>
      {belowHeader}
    </div>
  );
}
