import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { LangProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">Go home</Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CineTask — Earn by watching movie trailers" },
      { name: "description", content: "Earn daily commissions by watching movie trailers. Complete 25 tasks per day across VIP levels." },
      { property: "og:title", content: "CineTask — Earn by watching movie trailers" },
      { name: "twitter:title", content: "CineTask — Earn by watching movie trailers" },
      { property: "og:description", content: "Earn daily commissions by watching movie trailers. Complete 25 tasks per day across VIP levels." },
      { name: "twitter:description", content: "Earn daily commissions by watching movie trailers. Complete 25 tasks per day across VIP levels." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2b53eeca-973f-491f-8325-12cc673cc424/id-preview-8a0500e2--64466b86-bcdf-4ea3-b2af-9fb19fe7303f.lovable.app-1776714669741.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2b53eeca-973f-491f-8325-12cc673cc424/id-preview-8a0500e2--64466b86-bcdf-4ea3-b2af-9fb19fe7303f.lovable.app-1776714669741.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#1d0f1f" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "CineTask" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/icon-192.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: () => (
    <AuthProvider>
      <LangProvider>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
        <Toaster richColors theme="dark" />
      </LangProvider>
    </AuthProvider>
  ),
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {
                    // Ignore registration failures for unsupported environments.
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
