// Server boot hook. The conditional import below is eliminated from the edge
// bundle at build time (NEXT_RUNTIME is inlined), so node-only deps like
// nodemailer never reach the edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
