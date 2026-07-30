// Server-side singleton — persists for the lifetime of the Node process.
// Defaults to true (AI on by default for all new conversations).
declare global {
  // eslint-disable-next-line no-var
  var __nyp_ia_global: boolean | undefined;
}

export function getGlobalIA(): boolean {
  if (global.__nyp_ia_global === undefined) {
    global.__nyp_ia_global = true; // Default: IA activa
  }
  return global.__nyp_ia_global;
}

export function setGlobalIA(value: boolean) {
  global.__nyp_ia_global = value;
}
