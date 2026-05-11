// Helpers for the editable-site-copy feature.
//
// The static defaults in `src/lib/i18n.ts` are deeply nested and mix in
// arrays (e.g. `about.howSteps[]`). The override storage in Supabase is a
// flat key/lang/value table where the key uses dot notation: "about.howSteps.0".
//
// flatten/unflatten round-trip cleanly for the shapes we use (objects whose
// values are strings, nested objects, or string arrays). Any unexpected
// shape is treated conservatively to avoid corrupting unrelated copy.

export type FlatMap = Record<string, string>;

// Accepts unknown shape (the imported TRANSLATIONS object is read-only/const-typed,
// which doesn't match a recursive Nested type easily). We do the type checks at
// runtime instead — safer than trying to coerce the const tree.
export function flattenTranslations(node: unknown, prefix = ""): FlatMap {
  const out: FlatMap = {};
  if (typeof node === "string") {
    if (prefix) out[prefix] = node;
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      const key = prefix ? `${prefix}.${i}` : String(i);
      Object.assign(out, flattenTranslations(v, key));
    });
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      const key = prefix ? `${prefix}.${k}` : k;
      Object.assign(out, flattenTranslations(v, key));
    }
  }
  return out;
}

// Apply a flat override map onto a deeply-cloned defaults tree.
// Mutates and returns the cloned tree.
export function applyOverrides<T extends Record<string, unknown>>(defaults: T, overrides: FlatMap): T {
  // Deep-clone via JSON to avoid mutating the imported constant.
  const clone = JSON.parse(JSON.stringify(defaults)) as T;
  for (const [key, value] of Object.entries(overrides)) {
    setByPath(clone as unknown as Record<string, unknown>, key.split("."), value);
  }
  return clone;
}

function setByPath(target: Record<string, unknown> | unknown[], parts: string[], value: string): void {
  if (parts.length === 0) return;
  const [head, ...rest] = parts;
  if (rest.length === 0) {
    if (Array.isArray(target)) {
      const idx = Number(head);
      if (Number.isInteger(idx) && idx >= 0) target[idx] = value;
    } else {
      target[head] = value;
    }
    return;
  }
  // Walk one level. If the existing slot is missing or the wrong shape we
  // skip silently — the override is referencing a key that no longer exists
  // in the defaults, so there's nothing to override.
  const next = Array.isArray(target) ? target[Number(head)] : (target as Record<string, unknown>)[head];
  if (next && typeof next === "object") {
    setByPath(next as Record<string, unknown> | unknown[], rest, value);
  }
}
