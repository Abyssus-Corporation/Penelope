import { expect, test, type Page } from "@playwright/test";

// The sidebar's workspace header and the AppShell header must end on the same
// pixel row, with the same hairline colour, in both themes.
async function measure(page: Page) {
  return page.evaluate(() => {
    const sidebarHeader = document.querySelector("aside > div")!;
    const header = document.querySelector("main > header")!;
    const content = document.querySelector("main > header + div")!;
    const side = sidebarHeader.getBoundingClientRect();
    const after = getComputedStyle(header, "::after");
    return {
      sidebarBottom: side.bottom,
      sidebarLine: getComputedStyle(sidebarHeader).borderBottomColor,
      sidebarLineWidth: getComputedStyle(sidebarHeader).borderBottomWidth,
      headerBottom: header.getBoundingClientRect().bottom,
      headerLine: after.backgroundColor,
      headerLineHeight: after.height,
      headerLineBottom: after.bottom,
      contentTop: content.getBoundingClientRect().top,
      overflow: document.documentElement.scrollHeight - innerHeight,
    };
  });
}

for (const theme of ["light", "dark"] as const) {
  for (const { width, path } of [
    { width: 1280, path: "/dashboard" },
    { width: 1280, path: "/projects/acme-production" },
    // At 768 the sidebar is shown; the dashboard header wraps to two rows there by design.
    { width: 768, path: "/projects/acme-production" },
  ]) {
    test(`${theme} ${width}px ${path}: sidebar and header bottom borders align`, async ({
      page,
    }) => {
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await expect(page.locator("aside").first()).toBeVisible();
      const m = await measure(page);
      expect(m.headerBottom).toBe(m.sidebarBottom);
      expect(m.headerBottom).toBe(56);
      expect(m.contentTop).toBe(56);
      expect(m.headerLine).toBe(m.sidebarLine);
      expect(m.headerLineHeight).toBe(m.sidebarLineWidth);
      expect(m.headerLineBottom).toBe("0px");
      if (path.startsWith("/projects/")) expect(m.overflow).toBe(0);
    });
  }
}
