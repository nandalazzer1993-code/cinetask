import { Navbar } from "@/components/Navbar";

type LegalPageLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function LegalPageLayout({ title, subtitle, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-full">
      <Navbar />
      <section className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-border/70 bg-card/50 p-6 md:p-8 backdrop-blur">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground">{subtitle}</p>
            <div className="mt-8 space-y-6 text-sm md:text-base leading-7 text-muted-foreground">
              {children}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
