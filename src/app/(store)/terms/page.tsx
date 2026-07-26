import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <h2>1. Agreement</h2>
      <p>
        By creating an account or purchasing from this store you agree to these Terms of Service.
        If you do not agree, please do not use the site.
      </p>

      <h2>2. Digital products</h2>
      <p>
        We sell digital goods — subscriptions, license keys, in-game credits and similar items.
        Delivery is electronic: items appear on your order page and are emailed to the address on
        your account. No physical shipment takes place.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You are responsible for keeping your credentials safe. We strongly recommend enabling
        two-factor authentication. You must provide accurate information at checkout — in
        particular any product-specific fields (such as a player ID); deliveries made to details
        you entered incorrectly may not be recoverable.
      </p>

      <h2>4. Payments</h2>
      <p>
        Payments are processed by Stripe and PayPal on their secure hosted pages. We never see or
        store card numbers. Prices are shown in the store currency at checkout; your bank may apply
        conversion fees.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        You may not use the store for fraud, resale in violation of a product&apos;s license, or any
        unlawful purpose. We may suspend accounts involved in chargeback abuse, payment fraud or
        attempts to compromise the platform.
      </p>

      <h2>6. Refunds</h2>
      <p>
        Digital goods that have been delivered and are valid as described are generally not
        refundable. Invalid or misdescribed items are replaced or refunded per our Refund Policy.
      </p>

      <h2>7. Liability</h2>
      <p>
        The store is provided &quot;as is&quot;. To the maximum extent permitted by law, our total
        liability for any claim is limited to the amount you paid for the order concerned.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms from time to time. Material changes will be announced on the
        site; continued use after a change constitutes acceptance.
      </p>
    </LegalPage>
  );
}
