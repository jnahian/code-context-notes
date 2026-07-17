export function errorResult(error: string, extra?: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error, ...extra }) }] };
}

export function isLockTimeout(e: unknown): boolean {
  return e instanceof Error && e.message.includes('lock_timeout');
}

/**
 * Queue mode's success shape. Deliberately not an `error`: an agent that saw
 * an error code here would retry-loop against a human approval step.
 */
export function pendingResult(proposalId: string) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ status: 'pending', proposalId, message: 'Awaiting human approval.' }),
    }],
  };
}
