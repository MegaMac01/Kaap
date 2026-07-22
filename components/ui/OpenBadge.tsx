/**
 * Open/Closed status text. `open === null` (time not yet resolved on the
 * client) renders a neutral placeholder to stay hydration-safe.
 */
export function OpenBadge({ open, className = "" }: { open: boolean | null; className?: string }) {
  if (open === null) {
    return <span className={`text-[12.5px] font-semibold text-muted2 ${className}`}>—</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-[5px] text-[12.5px] font-semibold ${
        open ? "text-open" : "text-closed"
      } ${className}`}
    >
      {open ? "Open now" : "Closed"}
    </span>
  );
}
