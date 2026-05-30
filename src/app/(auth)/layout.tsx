export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-[calc(100vh-0px)] items-center justify-center px-4 py-12">
      {children}
    </div>
  );
}
