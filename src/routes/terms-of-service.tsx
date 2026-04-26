import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const Route = createFileRoute("/terms-of-service")({
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      subtitle="Rules and responsibilities for using CineTask and participating in movie task activities."
    >
      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Eligibility and Account Responsibility</h2>
        <p>
          By using CineTask, you confirm that you are legally allowed to enter a binding agreement in your region. You
          are responsible for keeping account credentials secure and for all actions performed under your account.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Task Rules and Fair Use</h2>
        <p>
          Users must complete trailer tasks manually and in good faith. Automated scripts, bots, emulators, false task
          interactions, or coordinated abuse of reward systems are prohibited. CineTask may invalidate tasks that violate
          platform integrity checks.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">User Conduct</h2>
        <p>
          You agree not to misuse the platform, interfere with service availability, attempt unauthorized access, or use
          CineTask for unlawful activity. Harassment, fraud, identity misrepresentation, and payment manipulation are
          strictly forbidden and may result in immediate account suspension.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Rewards, Balances, and Withdrawals</h2>
        <p>
          Earnings are based on eligible completed tasks and applicable VIP conditions. Withdrawal requests are subject
          to verification, anti-fraud checks, and minimum threshold requirements. CineTask may hold or reverse balances
          linked to suspicious or invalid activity.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Enforcement and Termination</h2>
        <p>
          We may suspend, limit, or terminate accounts that breach these terms or present legal, security, or compliance
          risks. Users may discontinue use at any time. Provisions related to liability, disputes, and legal obligations
          remain effective after termination where applicable.
        </p>
      </section>
    </LegalPageLayout>
  );
}
