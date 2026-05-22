import { cn, fitText } from "./uiPrimitives";

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
      <h1 className="text-balance text-[28px] font-extrabold leading-tight tracking-normal text-white sm:text-[30px]">
        {title}
      </h1>
      <p
        className={cn(
          "mt-2 text-pretty text-[15px] leading-6",
          fitText.body,
          subtitleClassName ?? "max-w-[42rem]",
        )}
      >
        {subtitle}
      </p>
    </header>
  );
}
