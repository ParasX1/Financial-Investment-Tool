import { fitNav } from "@/components/shared/fitStyles";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type {
  MarketNewsNavGroup,
  MarketNewsTopicId,
} from "../types";
import { getMarketNewsGroupIdForTopic } from "../lib/marketNewsNavigation";

export function MarketNewsCategoryNav({
  activeTopicId,
  groups,
  onTopicChange,
}: {
  activeTopicId: MarketNewsTopicId;
  groups: readonly MarketNewsNavGroup[];
  onTopicChange: (topicId: MarketNewsTopicId) => void;
}) {
  const activeGroupId = getMarketNewsGroupIdForTopic(activeTopicId);
  const activeGroup =
    groups.find((group) => group.id === activeGroupId) ?? groups[0]!;

  return (
    <nav aria-label="Market news sections" className="min-w-0">
      <div className="flex min-w-0 gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => {
          const active = group.id === activeGroupId;
          const targetTopic = group.topics[0]!.id;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onTopicChange(targetTopic)}
              aria-pressed={active}
              className={cn(
                "min-h-[40px] shrink-0 rounded-lg px-3 text-sm font-extrabold transition-colors",
                active ? fitNav.itemActiveQuiet : fitNav.itemIdle,
                FIT_FOCUS_VISIBLE,
              )}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      {activeGroup.topics.length > 1 ? (
        <div
          className="mt-2 flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={`${activeGroup.label} topics`}
        >
          {activeGroup.topics.map((topic) => {
            const active = topic.id === activeTopicId;

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onTopicChange(topic.id)}
                aria-pressed={active}
                className={cn(
                  "min-h-[34px] shrink-0 rounded-md border px-3 text-xs font-bold transition-colors",
                  active
                    ? "border-[var(--fit-nav-active-border)] bg-[var(--fit-nav-active-bg)] text-[var(--fit-color-accent-strong)]"
                    : "border-[var(--fit-color-border-subtle)] bg-[var(--fit-color-surface-soft)] text-[#a5adbf] hover:border-[#5367ff]/40 hover:text-white",
                  FIT_FOCUS_VISIBLE,
                )}
              >
                {topic.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}
