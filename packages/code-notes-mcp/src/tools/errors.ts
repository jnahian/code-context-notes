export function errorResult(error: string, extra?: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error, ...extra }) }] };
}

export function isLockTimeout(e: unknown): boolean {
  return e instanceof Error && e.message.includes('lock_timeout');
}
