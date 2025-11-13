import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getPageContent } from "./lib.js";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const queryParams = c.req.query();
    const { url, ...options } = queryParams;

    if (!url) {
      return c.json({ error: "URL parameter is required" }, 400);
    }

    const result = await getPageContent({ url, ...options });

    return c.json({
      success: true,
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
