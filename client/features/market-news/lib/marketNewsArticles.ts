import type { Article } from "@/lib/news/contracts";

const ARTICLE_TIME_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  hour: "2-digit",
  hour12: false,
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Australia/Sydney",
});

const ARTICLE_MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function getSafeArticleHref(url: string) {
  if (url.startsWith("#demo-market-news-")) return url;

  try {
    const parsed = new URL(url);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return "#market-news-main";
  }

  return "#market-news-main";
}

export function formatArticleTime(publishedAt: string) {
  const date = new Date(publishedAt);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const parts = ARTICLE_TIME_FORMATTER.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const monthNumber = Number(value("month"));
  const monthLabel = ARTICLE_MONTH_LABELS[monthNumber - 1] ?? value("month");

  return `${value("day")} ${monthLabel}, ${value("hour")}:${value("minute")}`;
}

export function getArticleImage(article: Article) {
  return article.image || null;
}
