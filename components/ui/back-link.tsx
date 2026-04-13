import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/ui/nav-icons";

type Props = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode;
};

/**
 * Back-style navigation with a chevron icon aligned to text (no raw ← character).
 */
export function BackLink({ children, className = "", ...rest }: Props) {
  return (
    <Link
      {...rest}
      className={`tap-scale inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 py-2 text-sm leading-none [-webkit-tap-highlight-color:transparent] ${className}`}
    >
      <ChevronLeftIcon className="size-3.5 shrink-0 opacity-90" />
      <span>{children}</span>
    </Link>
  );
}
