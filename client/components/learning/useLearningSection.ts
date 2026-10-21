import * as React from "react";
import { useRouter } from "next/router";

type LearningSectionQuery = string | readonly string[] | null | undefined;

function normalizeQuerySection(value: LearningSectionQuery) {
  return {
    value: typeof value === "string" ? value : null,
    hasInvalidShape: Array.isArray(value),
  };
}

export function resolveLearningSection(
  querySection: LearningSectionQuery,
  sectionIds: readonly string[],
  defaultSectionId: string,
) {
  const validSections = new Set(sectionIds);
  const normalizedQuery = normalizeQuerySection(querySection);

  return {
    activeId:
      normalizedQuery.value && validSections.has(normalizedQuery.value)
        ? normalizedQuery.value
        : defaultSectionId,
    shouldClearQuery:
      normalizedQuery.hasInvalidShape ||
      Boolean(
        normalizedQuery.value && !validSections.has(normalizedQuery.value),
      ),
  };
}

export function useLearningSection(
  sectionIds: readonly string[],
  defaultSectionId: string,
) {
  const router = useRouter();
  const validSections = React.useMemo(() => new Set(sectionIds), [sectionIds]);
  const [activeId, setActiveId] = React.useState(defaultSectionId);

  React.useEffect(() => {
    if (!router.isReady) return;

    const nextSection = resolveLearningSection(
      router.query.section,
      sectionIds,
      defaultSectionId,
    );

    setActiveId(nextSection.activeId);

    if (nextSection.shouldClearQuery) {
      const nextQuery = { ...router.query };
      delete nextQuery.section;

      void router.replace(
        {
          pathname: router.pathname,
          query: nextQuery,
        },
        undefined,
        { shallow: true, scroll: false },
      );
    }
  }, [
    defaultSectionId,
    router,
    router.isReady,
    router.pathname,
    router.query,
    router.query.section,
    sectionIds,
  ]);

  const selectSection = React.useCallback(
    (sectionId: string) => {
      if (!validSections.has(sectionId)) return;

      setActiveId(sectionId);
      void router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, section: sectionId },
        },
        undefined,
        { shallow: true, scroll: false },
      );
    },
    [router, validSections],
  );

  return {
    activeId,
    selectSection,
  };
}
