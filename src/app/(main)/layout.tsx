import { Navigation } from "@/components/Navigation";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
