import { App, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";

export const app = new App<State>();

// Serve PWA files (sw.js, manifest.webmanifest, workbox-*.js) from _fresh/client/
const PWA_FILES: Record<string, string> = {
  "/sw.js": "application/javascript",
  "/manifest.webmanifest": "application/manifest+json",
};

app.use(async (ctx) => {
  const url = new URL(ctx.req.url);
  const pathname = url.pathname;

  // Serve known PWA files
  if (PWA_FILES[pathname]) {
    try {
      const content = await Deno.readFile(`_fresh/client${pathname}`);
      return new Response(content, {
        headers: {
          "Content-Type": PWA_FILES[pathname],
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
      });
    } catch {
      // Fall through if file doesn't exist (dev mode)
    }
  }

  // Serve workbox runtime (filename has a hash)
  if (pathname.startsWith("/workbox-") && pathname.endsWith(".js")) {
    try {
      const content = await Deno.readFile(`_fresh/client${pathname}`);
      return new Response(content, {
        headers: {
          "Content-Type": "application/javascript",
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
      });
    } catch {
      // Fall through
    }
  }

  const resp = await ctx.next();
  try {
    resp.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    resp.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    return resp;
  } catch {
    // If response is immutable (e.g. from staticFiles), create a clone
    const newResp = new Response(resp.body, resp);
    newResp.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    newResp.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    return newResp;
  }
});

app.use(staticFiles());

// Pass a shared value from a middleware
app.use(async (ctx) => {
  ctx.state.shared = "hello";
  return await ctx.next();
});

// this is the same as the /api/:name route defined via a file. feel free to delete this!
app.get("/api2/:name", (ctx) => {
  const name = ctx.params.name;
  return new Response(
    `Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
  );
});

// this can also be defined via a file. feel free to delete this!
const exampleLoggerMiddleware = define.middleware((ctx) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  return ctx.next();
});
app.use(exampleLoggerMiddleware);

// Include file-system based routes here
app.fsRoutes();
