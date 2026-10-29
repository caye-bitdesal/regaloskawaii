export function explainEmDashSyncError(err: unknown): string {
  const nested =
    err instanceof Error && err.cause instanceof Error
      ? err.cause
      : err instanceof Error
        ? err
        : null;
  const code =
    nested && 'code' in nested ? String((nested as NodeJS.ErrnoException).code) : undefined;
  const url = (process.env.EMDASH_URL ?? 'http://localhost:4321').replace(/\/$/, '');

  if (code === 'ECONNREFUSED') {
    return `EmDash no responde en ${url}. Arranca el admin (suele ser el puerto 4321) y vuelve a intentar.`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
