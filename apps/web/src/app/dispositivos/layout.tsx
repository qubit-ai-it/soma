export default function DevicesLayout({ children }: LayoutProps<"/dispositivos">) {
  return (
    <main className="container-soma flex-1 py-12">
      <h1 className="reveal mb-8 text-headline">Dispositivos</h1>
      {children}
    </main>
  );
}
