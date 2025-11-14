import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getPageContent } from "./lib.js";
import { responseCache } from "./cache.js";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const queryParams = c.req.query();
    const { url, ...options } = queryParams;

    if (!url) {
      return c.json({ error: "URL parameter is required" }, 400);
    }

    let result = responseCache.get(url, options);
    let fromCache = false;

    if (result) {
      fromCache = true;
    } else {
      result = await getPageContent({ url, ...options });
      responseCache.set(url, options, result);
    }

    return c.json({
      success: true,
      fromCache,
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
