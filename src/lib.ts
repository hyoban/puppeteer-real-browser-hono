import { connect } from "puppeteer-real-browser";
import type { GoToOptions } from "rebrowser-puppeteer-core";

const realBrowserOption = {
  args: ["--start-maximized"],
  turnstile: true,
  headless: false,
  // disableXvfb: true,
  // ignoreAllFlags:true,
  customConfig: {},
  connectOption: {
    defaultViewport: null,
  },
  plugins: [],
};

export type Options = {
  url: string | string[];
  selector?: string;
} & GoToOptions;

export async function getPageContent(options: Options) {
  const { url, selector, ...goToOptions } = options;
  const { browser } = await connect(realBrowserOption);

  const urls = Array.isArray(url) ? url : [url];

  const results = await Promise.all(
    urls.map(async (currentUrl) => {
      const page = await browser.newPage();
      await page.goto(currentUrl, goToOptions);

      if (selector) {
        let verify: boolean | null = null;
        const startDate = Date.now();
        while (
          !verify &&
          Date.now() - startDate < (goToOptions.timeout || 30000)
        ) {
          verify = await page
            .evaluate(() => (document.querySelector(selector) ? true : null))
            .catch(() => null);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      const content = await page.content();
      await page.close();
      return content;
    })
  );

  await browser.close();
  return results;
}
