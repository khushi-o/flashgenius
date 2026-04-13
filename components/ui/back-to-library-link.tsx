import { BackLink } from "@/components/ui/back-link";
import Link from "next/link";

const subtleClass =
  "text-p-sand-dim transition-colors duration-150 hover:bg-p-sage/10 hover:text-p-sage-bright active:bg-p-sage/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p-sage/45";

const primaryClass =
  "rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted px-5 py-2.5 font-semibold text-p-navy shadow-sm shadow-black/25 transition-[filter,transform] duration-150 hover:brightness-105 active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p-sage-bright/70";

type Props = {
  className?: string;
  /** Outline + chevron (default), or filled mint CTA for prominent actions. */
  variant?: "subtle" | "primary";
};

/**
 * Consistent return-to-library control (not shown on the library list itself).
 */
export function BackToLibraryLink({ className = "", variant = "subtle" }: Props) {
  if (variant === "primary") {
    return (
      <Link
        href="/decks"
        className={`tap-scale inline-flex min-h-11 items-center justify-center [-webkit-tap-highlight-color:transparent] ${primaryClass} ${className}`.trim()}
      >
        Back to library
      </Link>
    );
  }
  return (
    <BackLink href="/decks" className={`${subtleClass} ${className}`.trim()}>
      Back to library
    </BackLink>
  );
}
