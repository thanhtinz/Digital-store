import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <h2>1. What we collect</h2>
      <p>
        Account data (name, email, password hash), order data (items purchased, checkout fields you
        enter, payment references — never card numbers), and security data (sign-in history with IP
        address and device, used for fraud prevention and the login history you can view yourself).
      </p>

      <h2>2. How we use it</h2>
      <ul>
        <li>To deliver your purchases and send transactional email (receipts, delivery, security alerts).</li>
        <li>To protect accounts — rate limiting, lockout after failed sign-ins, session management.</li>
        <li>To provide support and handle refunds.</li>
      </ul>
      <p>We do not sell your personal data, and we do not send marketing email without consent.</p>

      <h2>3. Payment data</h2>
      <p>
        Card and PayPal details are handled entirely by Stripe and PayPal on their own PCI-DSS
        compliant infrastructure. We store only a payment reference used to reconcile your order.
      </p>

      <h2>4. Cookies</h2>
      <p>
        We use a single essential session cookie to keep you signed in. No third-party advertising
        or tracking cookies are set.
      </p>

      <h2>5. Retention & deletion</h2>
      <p>
        Order records are retained for accounting purposes. You may request deletion of your
        account and associated personal data by contacting support; data we are legally required to
        keep (e.g. invoices) is retained for the statutory period.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on your jurisdiction (including GDPR and CCPA), you may have rights to access,
        correct, export or delete your personal data. Contact support to exercise them.
      </p>
    </LegalPage>
  );
}
