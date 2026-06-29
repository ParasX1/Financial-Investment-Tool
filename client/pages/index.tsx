import Head from "next/head";
import { HomeMain } from "@/features/home";
import { homeMetadata } from "@/features/home/data/homeContent";

export default function Home() {
  return (
    <>
      <Head>
        <title>{homeMetadata.title}</title>
        <meta
          name="description"
          content={homeMetadata.description}
        />
        <meta
          name="theme-color"
          content={homeMetadata.themeColor}
        />
      </Head>
      <HomeMain />
    </>
  );
}
