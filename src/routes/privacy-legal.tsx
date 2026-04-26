import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const Route = createFileRoute("/privacy-legal")({
  component: PrivacyAndLegalPage,
});

function PrivacyAndLegalPage() {
  return (
    <LegalPageLayout
      title="Privacy and Legal"
      subtitle="How CineTask handles user data, legal rights, and regulatory commitments."
    >
      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Data We Collect</h2>
        <p>
          We collect account details, profile preferences, transaction records, and platform activity needed to operate
          the CineTask service. We only request data that supports account access, task tracking, payout processing,
          fraud prevention, and customer support.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">How We Use Information</h2>
        <p>
          Data is used to authenticate users, assign and verify trailer tasks, process withdrawals, maintain account
          security, improve service quality, and comply with legal obligations. We may also use aggregated analytics to
          monitor platform performance and improve user experience.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Legal Basis and Protection</h2>
        <p>
          We process data under legitimate business interests, contractual necessity, and legal compliance requirements.
          We apply technical and organizational safeguards designed to protect confidentiality, integrity, and
          availability of personal information.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may request access, correction, deletion, restriction, or portability of
          your personal data. You may also object to certain processing activities where legally permitted. Contact
          support through your account for privacy requests.
        </p>
      </section>
    </LegalPageLayout>
  );
}
