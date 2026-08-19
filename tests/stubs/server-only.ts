/**
 * `server-only` throws on import outside a React Server Component, which is
 * exactly what it is for — but it also means a plain Node unit test cannot
 * import a server module at all. Aliasing it to nothing under Vitest lets the
 * tests reach modules like lib/stripe.ts; the real guard still applies to
 * every application build.
 */
export {};
