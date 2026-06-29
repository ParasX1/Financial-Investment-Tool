import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HeadManagerContext } from "next/dist/shared/lib/head-manager-context.shared-runtime";
import { homeMetadata } from "@/features/home/data/homeContent";
import Home from "../../../pages";

jest.mock("@/features/home", () => ({
  HomeMain: () => <main>Home page</main>,
}));

describe("Home page metadata", () => {
  it("sets the front page title, description, and mobile theme color", () => {
    let head: React.ReactElement[] = [];

    renderToStaticMarkup(
      <HeadManagerContext.Provider
        value={{
          mountedInstances: new Set(),
          updateHead: (nextHead) => {
            head = nextHead as React.ReactElement[];
          },
        }}
      >
        <Home />
      </HeadManagerContext.Provider>,
    );

    expect(
      head.find((entry) => entry.type === "title")?.props.children,
    ).toBe(homeMetadata.title);
    expect(
      head.find(
        (entry) =>
          entry.type === "meta" && entry.props.name === "description",
      )?.props.content,
    ).toBe(homeMetadata.description);
    expect(
      head.find(
        (entry) =>
          entry.type === "meta" && entry.props.name === "theme-color",
      )?.props.content,
    ).toBe(homeMetadata.themeColor);
  });
});
