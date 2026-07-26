'use client';

import Link from 'next/link';
import { useStore } from '@/components/Providers';
import Icon from '@/components/icons';

// Action row on the order page: copy code, print invoice, get help.
export default function OrderActions({ code }: { code: string }) {
  const { toast } = useStore();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast('Order code copied');
    } catch {
      toast('Could not copy — select it manually', 'error');
    }
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2 print:hidden">
      <button className="btn-secondary px-3 py-2 text-xs" onClick={copy}>
        <Icon name="ticket" size={14} /> Copy order code
      </button>
      <button className="btn-secondary px-3 py-2 text-xs" onClick={() => window.print()}>
        <Icon name="box" size={14} /> Print invoice
      </button>
      <Link href={`/support?order=${code}`} className="btn-secondary px-3 py-2 text-xs">
        <Icon name="chat" size={14} /> Get help with this order
      </Link>
    </div>
  );
}
