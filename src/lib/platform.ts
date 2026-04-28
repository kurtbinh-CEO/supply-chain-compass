/**
 * Platform detection helpers for OS-aware keyboard shortcut display.
 * SSR-safe: defaults to non-Mac when `navigator` is unavailable.
 */

export const isMac = (): boolean => {
  if (typeof navigator === "undefined") return false;
  // userAgentData is more reliable when available (Chromium); fallback to platform/UA string.
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData;
  const platform = uaData?.platform || navigator.platform || navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(platform);
};

/** Modifier symbol: ⌘ on Mac, "Ctrl" elsewhere. */
export const modKey = (): string => (isMac() ? "⌘" : "Ctrl");

/** Shift symbol: ⇧ on Mac, "Shift" elsewhere. */
export const shiftKey = (): string => (isMac() ? "⇧" : "Shift");

/**
 * Build an OS-aware shortcut label from a Mac-style template.
 * Examples: "⌘K" → "Ctrl+K" on Windows, "⌘⇧F" → "Ctrl+Shift+F".
 */
export const formatShortcut = (macTemplate: string): string => {
  if (isMac()) return macTemplate;
  return macTemplate
    .replace(/⌘/g, "Ctrl+")
    .replace(/⇧/g, "Shift+")
    .replace(/\+\+/g, "+")
    .replace(/\+$/, "");
};
