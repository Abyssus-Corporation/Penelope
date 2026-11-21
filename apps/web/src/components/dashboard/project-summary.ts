import { plural, type PluralForms } from "@/i18n/format";
import type { Project } from "@/types/project";

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** First grapheme of the first two words, so "Đặng Thị" gives "ĐT", not "NT". */
export function projectInitials(name: string): string {
  return name
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...graphemes.segment(word)][0].segment)
    .join("")
    .toLocaleUpperCase();
}

type SummaryStrings = {
  allRunning: PluralForms;
  allSleeping: PluralForms;
  empty: string;
  failed: string;
  building: string;
};

export function statusSummary(project: Project, summary: SummaryStrings, locale: string): string {
  const failed = project.services.filter((s) => s.status === "failed");
  const building = project.services.filter((s) => s.status === "building");
  const total = project.services.length;

  if (total === 0) return summary.empty;
  if (failed.length > 0) {
    return summary.failed
      .replace("{n}", String(failed.length))
      .replace("{total}", String(total))
      .replace("{names}", failed.map((s) => s.name).join(", "));
  }
  if (building.length > 0) {
    return summary.building.replace("{names}", building.map((s) => s.name).join(", "));
  }
  if (project.services.every((s) => s.status === "sleeping")) {
    return plural(locale, summary.allSleeping, total);
  }
  return plural(locale, summary.allRunning, total);
}
