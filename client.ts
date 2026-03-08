// Import CSS files here for hot module reloading to work.
// deno-lint-ignore-file no-window-prefix no-window
import "./assets/styles.css";

// Register PWA service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" });
  });
}
