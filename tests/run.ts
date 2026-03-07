// tests/run.ts
import { chromium } from "npm:playwright@^1.58.2";
import { TestResult } from "./utils.ts";

// Extend Window interface for type safety without 'any'
interface TestWindow extends Window {
  TESTS_FINISHED?: boolean;
  TEST_RESULTS?: TestResult[];
}

async function runTests() {
  // Check if playwright is installed by trying to launch
  try {
    const b = await chromium.launch();
    await b.close();
  } catch (_err) {
    console.error(
      "Error: Playwright is not installed or browsers are missing.",
    );
    console.error(
      "Please run: dx playwright install OR deno run -A npm:playwright install chromium",
    );
    Deno.exit(1);
  }

  console.log("Starting Fresh server...");
  const server = new Deno.Command("deno", {
    args: ["task", "dev"],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const decoder = new TextDecoder();
  let serverReady = false;
  let serverErrorOutput = "";

  // Silently read stdout/stderr until ready
  const stdoutReader = server.stdout.getReader();
  const stderrReader = server.stderr.getReader();

  async function processStdout() {
    while (true) {
      const { value, done } = await stdoutReader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      if (chunk.includes("Ready in") || chunk.includes("Local:")) {
        serverReady = true;
      }
    }
  }

  async function processStderr() {
    while (true) {
      const { value, done } = await stderrReader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      serverErrorOutput += chunk;
    }
  }

  processStdout();
  processStderr();

  const start = Date.now();
  while (!serverReady) {
    if (Date.now() - start > 20000) {
      console.log("Server taking longer than expected to start...");
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  let browser;
  try {
    console.log("Launching browser and running tests...");
    browser = await chromium.launch();
    const context = await browser.newContext();
    context.setDefaultTimeout(120000);
    const page = await context.newPage();

    // Log browser console messages
    page.on("console", (msg) => console.log(`[browser] ${msg.text()}`));

    // Navigate to the test page
    await page.goto("http://localhost:5173/test", { timeout: 60000 });

    // Wait for tests to finish (increased timeout to 2 minutes as Z3 can be slow)
    await page.waitForFunction(
      () => (window as unknown as TestWindow).TESTS_FINISHED === true,
      {
        timeout: 120000,
      },
    );

    const results = await page.evaluate(() =>
      (window as unknown as TestWindow).TEST_RESULTS
    );
    console.log("\n--- BROWSER TEST RESULTS ---");
    let failed = 0;
    if (results) {
      for (const res of results) {
        if (res.success) {
          console.log(`✅ ${res.name} (${res.duration.toFixed(0)}ms)`);
        } else {
          console.log(`❌ ${res.name} (${res.duration.toFixed(0)}ms)`);
          console.log(`   Error: ${res.error}`);
          failed++;
        }
      }
    }
    console.log("----------------------------");
    console.log(
      `Total: ${results?.length || 0}, Passed: ${
        (results?.length || 0) - failed
      }, Failed: ${failed}`,
    );

    if (failed > 0) {
      Deno.exit(1);
    }
  } catch (err) {
    console.error("\nTest execution failed:");
    console.error(err);
    if (serverErrorOutput) {
      console.error("\n--- Server Error Output ---");
      console.error(serverErrorOutput);
    }
    Deno.exit(1);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

runTests();
