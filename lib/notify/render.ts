function resolveValue(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

const tokenPattern = /{{\s*([\w.]+)\s*}}/g;

export function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(tokenPattern, (_, rawKey: string) => {
    const value = resolveValue(context, rawKey);

    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  });
}
