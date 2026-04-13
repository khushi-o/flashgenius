import { SiteHeader } from "@/components/site-header";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-gradient-to-b from-p-navy-mid via-p-navy-deep to-[#0a0e16] text-p-cream">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
