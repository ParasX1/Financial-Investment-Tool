import * as React from "react";
import { useRouter } from "next/router";

function getQuerySection(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export function resolveLearningSection(
  querySection: string | null,
  sectionIds: readonly string[],
  defaultSectionId: string,
) {
  const validSections = new Set(sectionIds);

  return {
    activeId:
      querySection && validSections.has(querySection)
        ? querySection
        : defaultSectionId,
    shouldClearQuery: Boolean(querySection && !validSections.has(querySection)),
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

    const querySection = getQuerySection(router.query.section);
    const nextSection = resolveLearningSection(
      querySection,
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
