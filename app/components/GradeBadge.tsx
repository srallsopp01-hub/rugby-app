export function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    Dominant: "bg-[#7ea37e]/15 text-[#7ea37e] border-[#7ea37e]/25",
    Competitive: "bg-[#b79a63]/15 text-[#b79a63] border-[#b79a63]/25",
    Below: "bg-[#b16e6e]/15 text-[#b16e6e] border-[#b16e6e]/25",
    Poor: "bg-[#b16e6e]/20 text-[#b16e6e] border-[#b16e6e]/35",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[grade] ?? "border-border text-muted"}`}>
      {grade}
    </span>
  );
}
