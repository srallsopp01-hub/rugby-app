'use client';

import { useEffect } from 'react';

export default function PlaybookError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-foreground">
      <p className="text-sm text-muted">Something went wrong loading this play.</p>
      <button
        onClick={unstable_retry}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/80"
      >
        Try again
      </button>
    </div>
  );
}
