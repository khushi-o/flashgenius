import "./landing.css";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-full bg-black">{children}</div>;
}
