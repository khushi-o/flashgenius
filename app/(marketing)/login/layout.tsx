import { AppLogoMark } from "@/components/app-logo";
import Link from "next/link";

export default function LoginRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-p-navy-deep text-p-cream">
      <header className="border-b border-p-sand/15 bg-p-navy/85 backdrop-blur-md">
        <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="tap-scale flex shrink-0 items-center gap-2.5 rounded-lg [-webkit-tap-highlight-color:transparent]"
          >
            <AppLogoMark />
            <span className="text-sm font-semibold tracking-tight text-p-cream sm:text-base">
              FlashGenius
            </span>
          </Link>
          <Link
            href="/"
            className="tap-scale inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-p-sand-dim transition-colors duration-150 hover:bg-p-sage/10 hover:text-p-cream active:bg-p-sage/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p-sage/45 [-webkit-tap-highlight-color:transparent]"
          >
            Home
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
