/**
 * Brand mark: lightning through “mind” curves — reads at small sizes (nav, favourites).
 */

export function LightningMindGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4.5 15.5c2.2-4.2 5.5-6.8 10-6.3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.38"
      />
      <path
        d="M5.5 19c2.8-2.6 6.5-3.5 10-2"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.28"
      />
      <path
        d="M13.25 1.25 6.5 13.75H11L7.75 22.75 17.5 11.25h-4.25L16.25 1.25h-3z"
        fill="currentColor"
      />
    </svg>
  );
}

type AppLogoMarkProps = {
  className?: string;
  /** Slightly larger tile (e.g. login header). */
  size?: "md" | "sm";
};

export function AppLogoMark({ className = "", size = "sm" }: AppLogoMarkProps) {
  const box = size === "md" ? "h-10 w-10 rounded-xl" : "h-9 w-9 rounded-lg";
  const glyph = size === "md" ? "h-6 w-6" : "h-[1.35rem] w-[1.35rem]";
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-p-sage via-p-sand to-p-sage-bright shadow-lg shadow-black/35 ring-1 ring-inset ring-p-cream/25 ${box} ${className}`}
    >
      <LightningMindGlyph className={`${glyph} text-p-navy drop-shadow-[0_1px_1px_rgba(241,237,224,0.35)]`} />
    </span>
  );
}
