import Head from "next/head";
import { FIT_THEME_CSS, fitColors } from "./themeTokens";

export function ThemeFoundation() {
  return (
    <>
      <Head>
        <meta name="theme-color" content={fitColors.page} />
        <link
          key="fit-favicon-ico"
          rel="icon"
          href="/favicon.ico"
          sizes="16x16 32x32"
          type="image/x-icon"
        />
        <link
          key="fit-favicon-svg"
          rel="icon"
          href="/brand/fit-favicon.svg"
          sizes="any"
          type="image/svg+xml"
        />
      </Head>
      <style
        data-fit-theme="dark-purple"
        dangerouslySetInnerHTML={{ __html: FIT_THEME_CSS }}
      />
    </>
  );
}
