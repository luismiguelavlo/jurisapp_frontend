const keyFor = (connectionId: string) => `salud.run.${connectionId}`;

export function saveRunId(connectionId: string, runId: string): void {
  try {
    sessionStorage.setItem(keyFor(connectionId), runId);
  } catch {
    // ignore
  }
}

export function loadRunId(connectionId: string): string | null {
  try {
    return sessionStorage.getItem(keyFor(connectionId));
  } catch {
    return null;
  }
}

export function clearRunId(connectionId: string): void {
  try {
    sessionStorage.removeItem(keyFor(connectionId));
  } catch {
    // ignore
  }
}
