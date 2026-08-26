function messageFromUnknown(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (value instanceof Error && value.message) {
    return value.message;
  }

  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = (value as { message: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return null;
}

function causeFromUnknown(value: unknown): unknown {
  if (value instanceof Error) {
    return value.cause;
  }

  if (typeof value === 'object' && value !== null && 'cause' in value) {
    return (value as { cause: unknown }).cause;
  }

  return undefined;
}

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current != null && !seen.has(current)) {
    seen.add(current);
    const message = messageFromUnknown(current);
    if (message && parts[parts.length - 1] !== message) {
      parts.push(message);
    }

    current = causeFromUnknown(current);
  }

  return parts.join(' — ') || fallback;
};
