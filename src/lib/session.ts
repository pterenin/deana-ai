export const pageSessionUniqueId = (() => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  const array = new Uint32Array(2);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(array);
  } else {
    array[0] = Math.floor(Math.random() * 0xffffffff);
    array[1] = Math.floor(Math.random() * 0xffffffff);
  }
  return `r${Date.now().toString(36)}-${array[0].toString(
    36
  )}${array[1].toString(36)}`;
})();

export function buildSessionId(googleUserId: string): string {
  return `${googleUserId}-${pageSessionUniqueId}`;
}
