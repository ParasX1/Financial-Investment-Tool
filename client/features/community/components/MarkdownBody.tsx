import * as React from "react";
import communityStyles from "@/styles/community.module.css";
import { cn } from "../design";
import { DRAFT_IMAGE_MARKER } from "../markdownEditor";

type ImageToken = {
  index: number;
  end: number;
  alt: string;
  raw: string;
  src: string;
};

type InlineToken = {
  index: number;
  end: number;
  kind: "link" | "boldItalic" | "bold" | "strike" | "italic" | "superscript";
  raw: string;
  text: string;
  href?: string;
};

const inlineMarkers: Array<
  Pick<InlineToken, "kind"> & { marker: string }
> = [
  { kind: "boldItalic", marker: "***" },
  { kind: "strike", marker: "~~" },
  { kind: "bold", marker: "**" },
  { kind: "italic", marker: "*" },
  { kind: "superscript", marker: "^" },
];

function getSafeUrl(rawUrl: string, options: { image?: boolean } = {}) {
  try {
    const url = new URL(rawUrl);
    const allowedProtocols = options.image
      ? ["http:", "https:", "blob:"]
      : ["http:", "https:", "mailto:"];

    return allowedProtocols.includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function findMarkdownDestinationEnd(text: string, start: number) {
  let depth = 0;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")") {
      if (depth === 0) return index;
      depth -= 1;
    }
  }

  return -1;
}

function findLinkToken(text: string, index: number): InlineToken | null {
  if (text[index] !== "[" || text[index - 1] === "!") return null;

  const labelEnd = text.indexOf("](", index + 1);
  if (labelEnd <= index + 1) return null;

  const hrefStart = labelEnd + 2;
  const hrefEnd = findMarkdownDestinationEnd(text, hrefStart);
  if (hrefEnd <= hrefStart) return null;

  const end = hrefEnd + 1;
  return {
    index,
    end,
    kind: "link",
    raw: text.slice(index, end),
    text: text.slice(index + 1, labelEnd),
    href: text.slice(hrefStart, hrefEnd),
  };
}

function findImageToken(text: string, index: number): ImageToken | null {
  if (!text.startsWith("![", index)) return null;

  const altEnd = text.indexOf("](", index + 2);
  if (altEnd < index + 2) return null;

  const srcStart = altEnd + 2;
  const srcEnd = findMarkdownDestinationEnd(text, srcStart);
  if (srcEnd <= srcStart) return null;

  const end = srcEnd + 1;
  return {
    index,
    end,
    alt: text.slice(index + 2, altEnd),
    raw: text.slice(index, end),
    src: text.slice(srcStart, srcEnd),
  };
}

function findNextImageToken(text: string, start: number) {
  for (let index = start; index < text.length; index += 1) {
    const image = findImageToken(text, index);
    if (image) return image;
  }

  return null;
}

function findDelimitedToken(
  text: string,
  index: number,
  kind: InlineToken["kind"],
  marker: string,
): InlineToken | null {
  if (!text.startsWith(marker, index)) return null;

  const contentStart = index + marker.length;
  let contentEnd = text.indexOf(marker, contentStart);
  while (
    contentEnd !== -1 &&
    ((marker === "**" && text[contentEnd + marker.length] === "*") ||
      (marker === "*" &&
        (text[contentEnd - 1] === "*" ||
          text[contentEnd + marker.length] === "*")))
  ) {
    contentEnd = text.indexOf(marker, contentEnd + 1);
  }

  if (contentEnd <= contentStart) return null;

  const end = contentEnd + marker.length;
  return {
    index,
    end,
    kind,
    raw: text.slice(index, end),
    text: text.slice(contentStart, contentEnd),
  };
}

function findNextInlineToken(text: string, start: number) {
  for (let index = start; index < text.length; index += 1) {
    const link = findLinkToken(text, index);
    if (link) return link;

    for (const marker of inlineMarkers) {
      const token = findDelimitedToken(
        text,
        index,
        marker.kind,
        marker.marker,
      );
      if (token) return token;
    }
  }

  return null;
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  let token = findNextInlineToken(text, lastIndex);
  while (token) {
    if (token.index > lastIndex) {
      nodes.push(text.slice(lastIndex, token.index));
    }

    const key = `${keyPrefix}-${token.kind}-${token.index}`;

    if (token.kind === "link" && token.href) {
      const safeHref = getSafeUrl(token.href);
      nodes.push(
        safeHref ? (
          <a
            key={key}
            href={safeHref}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#9eb2ff] underline decoration-[#6f7cff]/50 underline-offset-4 hover:text-[#dce3ff]"
          >
            {renderInlineMarkdown(token.text, `${key}-label`)}
          </a>
        ) : (
          token.raw
        ),
      );
    } else if (token.kind === "boldItalic") {
      nodes.push(
        <strong key={key}>
          <em>{renderInlineMarkdown(token.text, `${key}-inner`)}</em>
        </strong>,
      );
    } else if (token.kind === "bold") {
      nodes.push(
        <strong key={key}>
          {renderInlineMarkdown(token.text, `${key}-inner`)}
        </strong>,
      );
    } else if (token.kind === "strike") {
      nodes.push(
        <s key={key}>{renderInlineMarkdown(token.text, `${key}-inner`)}</s>,
      );
    } else if (token.kind === "italic") {
      nodes.push(
        <em key={key}>{renderInlineMarkdown(token.text, `${key}-inner`)}</em>,
      );
    } else if (token.kind === "superscript") {
      nodes.push(
        <sup key={key}>{renderInlineMarkdown(token.text, `${key}-inner`)}</sup>,
      );
    }

    lastIndex = token.end;
    token = findNextInlineToken(text, lastIndex);
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

function renderTextBlock(text: string, key: string) {
  const lines = text.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const bulletItems: string[] = [];
    while (index < lines.length) {
      const bullet = lines[index].match(/^\s*[-*]\s+(.+)$/);
      if (!bullet) break;
      bulletItems.push(bullet[1]);
      index += 1;
    }

    if (bulletItems.length) {
      nodes.push(
        <ul key={`${key}-ul-${index}`} className="my-2 list-disc space-y-1 pl-5">
          {bulletItems.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item, `${key}-ul-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const numberedItems: string[] = [];
    while (index < lines.length) {
      const numbered = lines[index].match(/^\s*\d+\.\s+(.+)$/);
      if (!numbered) break;
      numberedItems.push(numbered[1]);
      index += 1;
    }

    if (numberedItems.length) {
      nodes.push(
        <ol key={`${key}-ol-${index}`} className="my-2 list-decimal space-y-1 pl-5">
          {numberedItems.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item, `${key}-ol-${itemIndex}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
    if (heading) {
      nodes.push(
        <h3
          key={`${key}-h-${index}`}
          className="mt-3 text-[17px] font-extrabold leading-snug text-[#f6f7ff]"
        >
          {renderInlineMarkdown(heading[1], `${key}-h-${index}`)}
        </h3>,
      );
      index += 1;
      continue;
    }

    nodes.push(
      <p key={`${key}-p-${index}`} className="my-2 first:mt-0 last:mb-0">
        {renderInlineMarkdown(line, `${key}-p-${index}`)}
      </p>,
    );
    index += 1;
  }

  return nodes;
}

export function MarkdownBody({
  className,
  id,
  text,
}: {
  className?: string;
  id?: string;
  text: string;
}) {
  const nodes = React.useMemo(() => {
    const rendered: React.ReactNode[] = [];
    let lastIndex = 0;
    let imageIndex = 0;

    let image = findNextImageToken(text, lastIndex);
    while (image) {
      const before = text.slice(lastIndex, image.index);
      if (before) {
        rendered.push(...renderTextBlock(before, `text-${lastIndex}`));
      }

      const safeSrc =
        image.src === DRAFT_IMAGE_MARKER
          ? null
          : getSafeUrl(image.src, { image: true });
      if (safeSrc) {
        rendered.push(
          <figure
            key={`image-${imageIndex}`}
            className={cn(
              "my-3 overflow-hidden rounded-lg bg-black/30",
              communityStyles.softBorder,
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeSrc}
              alt={image.alt || "Discussion image"}
              loading="lazy"
              className="max-h-[28rem] w-full object-contain"
            />
          </figure>,
        );
      } else {
        rendered.push(image.raw);
      }

      imageIndex += 1;
      lastIndex = image.end;
      image = findNextImageToken(text, lastIndex);
    }

    const after = text.slice(lastIndex);
    if (after) rendered.push(...renderTextBlock(after, `text-${lastIndex}`));
    return rendered;
  }, [text]);

  return (
    <div
      id={id}
      className={cn(
        "text-[15px] leading-[1.65] text-[#c4ccdc]",
        communityStyles.wrapAnywhere,
        className,
      )}
    >
      {nodes.length ? nodes : null}
    </div>
  );
}
