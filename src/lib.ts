import {
  connect,
  type Options as RealBrowserOption,
} from "puppeteer-real-browser";
import type { GoToOptions, HTTPResponse } from "rebrowser-puppeteer-core";
import type { Browser, Page } from "rebrowser-puppeteer-core";
import { PuppeteerBlocker } from "@ghostery/adblocker-puppeteer";
import { load } from "cheerio";
import { pageSemaphore } from "./semaphore.js";

const realBrowserOption: RealBrowserOption = {
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
  // read proxy settings from environment variables if available
  proxy: parseProxy(process.env.PROXY_URI),
};

function parseProxy(proxyString: string | undefined) {
  if (!proxyString) {
    return;
  }

  try {
    const url = new URL(proxyString);
    return {
      host: url.hostname,
      port: Number(url.port),
      username: url.username,
      password: url.password,
    };
  } catch (error) {
    console.error("Failed to parse proxy string:", error);
    return;
  }
}

let browserInstance: Browser | null = null;
let blocker: PuppeteerBlocker | null = null;

async function getBrowser(): Promise<{
  browser: Browser;
  blocker: PuppeteerBlocker;
}> {
  if (!browserInstance || !blocker) {
    const { browser } = await connect(realBrowserOption);
    browserInstance = browser;
    blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);
  }
  return {
    browser: browserInstance,
    blocker: blocker,
  };
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
      browserInstance = null;
      blocker = null;
    } catch (error) {
      console.error("Error closing browser:", error);
    }
  }
}

export type Options = {
  url: string | string[];
  selector?: string;
} & GoToOptions;

async function tryGetHtmlFromResponse(
  page: Page,
  url: string,
  selector: string | undefined,
  timeout: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const responseHandler = async (response: HTTPResponse) => {
      try {
        const responseUrl = response.url();
        const contentType = response.headers()["content-type"] || "";

        if (responseUrl === url && contentType.includes("text/html")) {
          const text = await response.text();

          if (selector) {
            const $ = load(text);
            if ($(selector).length > 0) {
              page.off("response", responseHandler);
              resolve(text);
            }
          } else {
            page.off("response", responseHandler);
            resolve(text);
          }
        }
      } catch (error) {
        console.error(`Error processing response for ${url}:`, error);
      }
    };

    page.on("response", responseHandler);

    setTimeout(() => {
      page.off("response", responseHandler);
      reject(new Error(`Timeout waiting for response from ${url}`));
    }, timeout);
  });
}

async function getHtmlFromPageContent(
  page: Page,
  url: string,
  selector: string | undefined,
  timeout: number
): Promise<string> {
  if (selector) {
    const startDate = Date.now();
    while (Date.now() - startDate < timeout) {
      if (page.isClosed()) {
        throw new Error(`Page closed unexpectedly while waiting for selector`);
      }

      const res = await page.$(selector);
      if (res) {
        break;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    const res = await page.$(selector);
    if (!res) {
      throw new Error(
        `Selector "${selector}" not found on ${url} within timeout`
      );
    }
  }

  const content = await page.content();
  return content;
}

async function fetchSingleUrl(
  browser: Browser,
  blocker: PuppeteerBlocker,
  url: string,
  selector: string | undefined,
  goToOptions: GoToOptions
): Promise<string> {
  console.log(`Fetching URL: ${url}`);
  await pageSemaphore.acquire();

  let page: Page | undefined;
  try {
    page = await browser.newPage();
    await blocker.enableBlockingInPage(page as any);

    const timeout = goToOptions.timeout || 30000;
    const currentPage = page;

    const responsePromise = tryGetHtmlFromResponse(
      currentPage,
      url,
      selector,
      timeout
    );

    const gotoPromise = currentPage.goto(url, goToOptions).then(async () => {
      return await getHtmlFromPageContent(currentPage, url, selector, timeout);
    });

    const content = await Promise.race([responsePromise, gotoPromise]);

    return content;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  } finally {
    if (page) {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (err) {
        console.error(`Failed to close page for ${url}:`, err);
      }
    }

    pageSemaphore.release();
  }
}

export async function getPageContent(options: Options) {
  const { url, selector, ...goToOptions } = options;
  const { browser, blocker } = await getBrowser();

  const urls = Array.isArray(url) ? url : [url];

  const results = await Promise.all(
    urls.map((currentUrl) =>
      fetchSingleUrl(browser, blocker, currentUrl, selector, goToOptions)
    )
  );

  return results;
}
