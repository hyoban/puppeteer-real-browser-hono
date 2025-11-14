import { connect } from "puppeteer-real-browser";
import type { GoToOptions } from "rebrowser-puppeteer-core";
import type { Browser } from "rebrowser-puppeteer-core";
import { PuppeteerBlocker } from "@ghostery/adblocker-puppeteer";

class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
}

const pageSemaphore = new Semaphore(5);

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

export type Options = {
  url: string | string[];
  selector?: string;
} & GoToOptions;

async function fetchSingleUrl(
  browser: Browser,
  blocker: PuppeteerBlocker,
  url: string,
  selector: string | undefined,
  goToOptions: GoToOptions
): Promise<string> {
  await pageSemaphore.acquire();
  console.log(`Acquired lock for ${url}`);

  const page = await browser.newPage();
  await blocker.enableBlockingInPage(page as any);
  try {
    await page.goto(url, goToOptions);

    if (selector) {
      const startDate = Date.now();
      while (Date.now() - startDate < (goToOptions.timeout || 30000)) {
        const res = await page.$(selector);
        console.log(`Checking for selector "${selector}" on ${url}:`, !!res);
        if (res) {
          break;
        }

        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const content = await page.content();
    return content;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  } finally {
    await page
      .close()
      .catch((err) => {
        console.error(`Failed to close page for ${url}:`, err);
      })
      .finally(() => {
        pageSemaphore.release();
        console.log(`Released lock for ${url}`);
      });
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
