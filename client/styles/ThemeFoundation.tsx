import Head from "next/head";
import { FIT_THEME_CSS, fitColors } from "./themeTokens";

export function ThemeFoundation() {
  return (
    <>
      <Head>
        <meta name="theme-color" content={fitColors.page} />
      </Head>
      <style
        data-fit-theme="dark-purple"
        dangerouslySetInnerHTML={{ __html: FIT_THEME_CSS }}
      />
    </>
  );
}
