/** How long the mock DNS check "takes". */
export const CHECK_MS = 700;

/**
 * Clipboard API first; if it's missing or refused (insecure context, permissions),
 * select the text in a throwaway <textarea> inside `container` (so a dialog's focus
 * trap keeps focus) and use execCommand. False when both fail.
 */
export async function copyText(text: string, container: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the selection fallback.
  }
  const active = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.className = "sr-only";
  container.append(area);
  try {
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    active?.focus();
  }
}
