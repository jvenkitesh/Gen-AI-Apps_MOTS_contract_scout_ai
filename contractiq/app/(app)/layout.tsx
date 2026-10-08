// App shell for all authenticated routes. Session check is enforced in
// middleware.ts, not here -- this layout only renders shared chrome (nav).
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-grey-25">{children}</div>;
}
