// File purpose: Safely renders the shared Community CommonMark/GFM contract.
import * as React from "react";
import Markdown, { type MarkdownToJSX } from "markdown-to-jsx/react";
import communityStyles from "../styles/community.module.css";
import { cn, fitType } from "../design";

const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const IMAGE_PROTOCOLS = new Set(["http:", "https:", "blob:"]);

function normalizeAllowedUrl(
  rawUrl: string | undefined,
  protocols: ReadonlySet<string>,
) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    return protocols.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function markdownUrlSanitizer(value: string, tag: string, attribute: string) {
  if (tag === "a" && attribute === "href") {
    return normalizeAllowedUrl(value, LINK_PROTOCOLS);
  }
  if (tag === "img" && attribute === "src") {
    return normalizeAllowedUrl(value, IMAGE_PROTOCOLS);
  }
  return value;
}

function getMarkdownOptions(
  allowedImageUrl: string | null,
  optimizeForStreaming: boolean,
): MarkdownToJSX.Options {
  const normalizedAllowedImage = normalizeAllowedUrl(
    allowedImageUrl ?? undefined,
    IMAGE_PROTOCOLS,
  );

  return {
    disableAutoLink: optimizeForStreaming,
    disableParsingRawHTML: true,
    enforceAtxHeadings: true,
    optimizeForStreaming,
    sanitizer: markdownUrlSanitizer,
    wrapper: React.Fragment,
    overrides: {
      a: {
        component: ({
          children,
          href,
          ...props
        }: React.ComponentPropsWithoutRef<"a">) => {
          const safeHref = normalizeAllowedUrl(href, LINK_PROTOCOLS);
          if (!safeHref) return <>{children}</>;

          return (
            <a
              {...props}
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#9eb2ff] underline decoration-[#6f7cff]/50 underline-offset-4 hover:text-[#dce3ff]"
            >
              {children}
            </a>
          );
        },
      },
      blockquote: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"blockquote">) => (
          <blockquote
            {...props}
            className="my-3 border-l-2 border-[#7384ff]/60 bg-white/[0.025] py-1 pl-4 text-[#b8c2d6]"
          >
            {children}
          </blockquote>
        ),
      },
      code: {
        component: ({
          children,
          className,
          ...props
        }: React.ComponentPropsWithoutRef<"code">) => (
          <code
            {...props}
            className={cn(
              "rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.92em] text-[#dbe2ff]",
              className,
            )}
          >
            {children}
          </code>
        ),
      },
      del: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"del">) => (
          <del {...props}>{children}</del>
        ),
      },
      h1: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"h2">) => (
          <h2
            {...props}
            className={cn("mb-2 mt-5 text-[#f6f7ff]", fitType.sectionTitle)}
          >
            {children}
          </h2>
        ),
      },
      h2: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"h3">) => (
          <h3
            {...props}
            className={cn("mb-2 mt-4 text-[#f6f7ff]", fitType.panelTitle)}
          >
            {children}
          </h3>
        ),
      },
      h3: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"h4">) => (
          <h4 {...props} className="mb-1.5 mt-4 font-semibold text-[#f2f4ff]">
            {children}
          </h4>
        ),
      },
      h4: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"h5">) => (
          <h5 {...props} className="mb-1 mt-3 font-semibold text-[#eef1ff]">
            {children}
          </h5>
        ),
      },
      h5: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"h6">) => (
          <h6 {...props} className="mb-1 mt-3 font-semibold text-[#e8ecfb]">
            {children}
          </h6>
        ),
      },
      h6: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"p">) => (
          <p
            {...props}
            className="mb-1 mt-3 font-semibold uppercase tracking-wide text-[#dfe5f7]"
          >
            {children}
          </p>
        ),
      },
      hr: {
        component: (props: React.ComponentPropsWithoutRef<"hr">) => (
          <hr {...props} className="my-5 border-white/10" />
        ),
      },
      img: {
        component: ({
          alt,
          src,
          ...props
        }: React.ComponentPropsWithoutRef<"img">) => {
          const safeSrc = normalizeAllowedUrl(src, IMAGE_PROTOCOLS);
          if (!safeSrc || safeSrc !== normalizedAllowedImage) {
            return (
              <span className="my-2 inline-flex rounded-md border border-white/10 bg-white/[0.025] px-3 py-2 text-[#8f99ac]">
                Image unavailable{alt ? `: ${alt}` : "."}
              </span>
            );
          }

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...props}
              src={safeSrc}
              alt={alt || "Discussion image"}
              loading="lazy"
              className="my-3 max-h-[28rem] w-full rounded-lg bg-black/30 object-contain"
            />
          );
        },
      },
      input: {
        component: ({
          checked,
          ...props
        }: React.ComponentPropsWithoutRef<"input">) => (
          <input
            {...props}
            type="checkbox"
            checked={Boolean(checked)}
            readOnly
            disabled
            className="mr-2 accent-[#7384ff]"
          />
        ),
      },
      li: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"li">) => (
          <li {...props} className="pl-1 marker:text-[#7888ff]">
            {children}
          </li>
        ),
      },
      ol: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"ol">) => (
          <ol {...props} className="my-3 list-decimal space-y-1 pl-6">
            {children}
          </ol>
        ),
      },
      p: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"p">) => (
          <p {...props} className="my-2 first:mt-0 last:mb-0">
            {children}
          </p>
        ),
      },
      pre: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"pre">) => (
          <pre
            {...props}
            className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-[#06070a] p-3 text-sm text-[#dbe2ff]"
          >
            {children}
          </pre>
        ),
      },
      table: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"table">) => (
          <div
            className="my-3 overflow-x-auto rounded-lg border border-white/10"
            role="region"
            aria-label="Scrollable table"
            tabIndex={0}
          >
            <table {...props} className="w-full min-w-[28rem] border-collapse">
              {children}
            </table>
          </div>
        ),
      },
      td: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"td">) => (
          <td
            {...props}
            className="border-t border-white/10 px-3 py-2 align-top"
          >
            {children}
          </td>
        ),
      },
      th: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"th">) => (
          <th
            {...props}
            className="bg-white/[0.04] px-3 py-2 text-left font-semibold text-[#eef1ff]"
          >
            {children}
          </th>
        ),
      },
      ul: {
        component: ({
          children,
          ...props
        }: React.ComponentPropsWithoutRef<"ul">) => (
          <ul {...props} className="my-3 list-disc space-y-1 pl-6">
            {children}
          </ul>
        ),
      },
    },
  };
}

export function MarkdownBody({
  allowedImageUrl = null,
  className,
  id,
  optimizeForStreaming = false,
  text,
}: {
  allowedImageUrl?: string | null;
  className?: string;
  id?: string;
  optimizeForStreaming?: boolean;
  text: string;
}) {
  const options = React.useMemo(
    () => getMarkdownOptions(allowedImageUrl, optimizeForStreaming),
    [allowedImageUrl, optimizeForStreaming],
  );

  return (
    <div
      id={id}
      className={cn(
        "text-[#c4ccdc]",
        fitType.body,
        communityStyles.wrapAnywhere,
        className,
      )}
    >
      <Markdown options={options}>{text}</Markdown>
    </div>
  );
}
