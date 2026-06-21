/**
 * Pure translation lookup — no JSON imports, no DOM, no React. Shared by the
 * server (the [lang] layout's metadata) and the client (useTranslation), so it
 * must stay dependency-free and must NOT statically import the dictionaries
 * (that would pull every locale into the client bundle).
 */
export type Dictionary = Record<string, unknown>;

export type TranslateVars = Record<string, string | number>;

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

function lookup(dict: Dictionary, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) =>
      node && typeof node === 'object'
        ? (node as Record<string, unknown>)[part]
        : undefined,
    dict,
  );
}

function warnMissing(key: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[i18n] missing or non-string message key: ${key}`);
  }
}

/** Resolve a dot-path key to a string, interpolating {vars}. Missing → key. */
export function translate(dict: Dictionary, key: string, vars?: TranslateVars): string {
  const value = lookup(dict, key);
  if (typeof value !== 'string') {
    warnMissing(key);
    return key;
  }
  return interpolate(value, vars);
}

/**
 * Plural form: the key must resolve to an object with `one`/`other` strings.
 * `n` is injected into vars automatically. English uses one for count === 1;
 * Hebrew likewise treats 1 as singular and 2+ as the plural form used here.
 */
export function translatePlural(
  dict: Dictionary,
  key: string,
  count: number,
  vars?: TranslateVars,
): string {
  const node = lookup(dict, key);
  if (node && typeof node === 'object') {
    const forms = node as Record<string, unknown>;
    const chosen = count === 1 ? forms.one : forms.other;
    const template = typeof chosen === 'string' ? chosen : forms.other;
    if (typeof template === 'string') return interpolate(template, { ...vars, n: count });
  }
  warnMissing(key);
  return key;
}
