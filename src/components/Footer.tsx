import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Youtube, Music2 } from "lucide-react";

const socialLinks = [
  { name: "Facebook", href: "https://facebook.com", icon: Facebook },
  { name: "X", href: "https://x.com", icon: Twitter },
  { name: "Instagram", href: "https://instagram.com", icon: Instagram },
  { name: "TikTok", href: "https://tiktok.com", icon: Music2 },
  { name: "YouTube", href: "https://youtube.com", icon: Youtube },
];

const legalLinks = [
  { label: "Privacy and Legal", to: "/privacy-legal" as const },
  { label: "Cookie Policy", to: "/cookie-policy" as const },
  { label: "Terms of Service", to: "/terms-of-service" as const },
  { label: "About Us", to: "/about-us" as const },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-card/40 backdrop-blur-md">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.name}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground transition-colors hover:text-accent hover:border-accent/70"
              >
                <social.icon className="h-4 w-4" />
              </a>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {legalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            © Cinemas Limited 2019 CineTask. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
