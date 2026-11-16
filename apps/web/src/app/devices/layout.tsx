export default function DevicesLayout({ children }: LayoutProps<"/devices">) {
  return (
    <main className="container-soma flex-1 py-12">
      <h1 className="reveal mb-8 text-headline">Devices</h1>
      {children}
    </main>
  );
}
