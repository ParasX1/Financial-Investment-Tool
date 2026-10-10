import { cn, fitText, fitType } from "./uiPrimitives";

export function FitPageHeader({
  className,
  subtitle,
  subtitleClassName,
  title,
}: {
  className?: string;
  subtitle: string;
  subtitleClassName?: string;
  title: string;
}) {
  return (
    <header className={cn("mb-6 sm:mb-7", className)}>
      <h1 className={cn("text-balance text-white", fitType.pageTitle)}>
        {title}
      </h1>
      <p
        className={cn(
          "mt-2 text-pretty",
          fitType.body,
          fitText.body,
          subtitleClassName ?? "max-w-[42rem]",
        )}
      >
        {subtitle}
      </p>
    </header>
  );
}
