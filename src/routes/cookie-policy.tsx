import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const Route = createFileRoute("/cookie-policy")({
  component: CookiePolicyPage,
});

function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="Information on how cookies and similar technologies are used on CineTask."
    >
      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">What Cookies Are</h2>
        <p>
          Cookies are small text files stored on your device to support website functionality, improve performance, and
          remember user preferences. We may also use similar technologies such as local storage or session tokens.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Types of Cookies We Use</h2>
        <p>
          Essential cookies support login and account security. Functional cookies retain language and interface
          settings. Analytics cookies help us understand usage patterns so we can improve feature quality and platform
          reliability.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Managing Cookie Preferences</h2>
        <p>
          You can control cookie behavior through browser settings, including deleting existing cookies and blocking new
          ones. Disabling essential cookies may limit access to secure areas and reduce platform functionality.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Policy Updates</h2>
        <p>
          We may update this policy to reflect legal, technical, or operational changes. Continued use of CineTask after
          updates indicates acceptance of the revised policy.
        </p>
      </section>
    </LegalPageLayout>
  );
}
