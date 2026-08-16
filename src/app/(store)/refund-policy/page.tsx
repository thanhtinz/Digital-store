import LegalPage from '@/components/LegalPage';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: getT()('meta.refund') };
}

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy" updated="July 2026">
      <h2>Our promise</h2>
      <p>
        Every item we deliver should work exactly as described. If it doesn&apos;t, we make it right —
        with a replacement first, or a refund where a replacement isn&apos;t possible.
      </p>

      <h2>When you're covered</h2>
      <ul>
        <li>The delivered key/account is invalid, already used, or doesn&apos;t activate.</li>
        <li>The item is materially different from the product description.</li>
        <li>You paid but nothing was delivered within the promised time.</li>
      </ul>
      <p>Report the problem to support within <b>72 hours</b> of delivery, including your order code and a short description (screenshots help).</p>

      <h2>When refunds don't apply</h2>
      <ul>
        <li>The item was delivered, is valid, and works as described.</li>
        <li>Top-ups sent to details you entered incorrectly at checkout (e.g. wrong player ID).</li>
        <li>Change of mind after a working digital item has been revealed to you.</li>
      </ul>

      <h2>How refunds are paid</h2>
      <p>
        Approved refunds are issued to your original payment method via Stripe or PayPal, normally
        within 5–10 business days depending on your bank.
      </p>

      <h2>Chargebacks</h2>
      <p>
        Please contact support before opening a dispute with your bank — almost every issue is
        resolved faster this way. Fraudulent chargebacks lead to account suspension.
      </p>
    </LegalPage>
  );
}
