import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { runBrowserTests, TestResult } from "../tests/utils.ts";

// Import all tests so they register themselves with browserTest()
import "../tests/scheduler.ts";
import "../tests/scheduler_fairness.ts";
import "../tests/scheduler_new_features.ts";
import "../tests/scheduler_opportunity.ts";
import "../tests/scheduler_recency.ts";
import "../tests/scheduler_weekend_distinct.ts";

interface TestGlobal extends Window {
  TEST_RESULTS?: TestResult[];
  TESTS_FINISHED?: boolean;
}

export default function TestRunner() {
  const results = useSignal<TestResult[]>([]);
  const isRunning = useSignal(true);
  const fatalError = useSignal<string | null>(null);

  useEffect(() => {
    (async () => {
      console.log("Starting browser tests...");
      try {
        const finalResults = await runBrowserTests((result) => {
          results.value = [...results.value, result];
        });
        console.log("Finished browser tests!", finalResults);
        (globalThis as unknown as TestGlobal).TEST_RESULTS = finalResults;
      } catch (err) {
        console.error("Fatal test runner error:", err);
        fatalError.value = String(err);
      } finally {
        isRunning.value = false;
        // Expose to Playwright even on failure
        (globalThis as unknown as TestGlobal).TESTS_FINISHED = true;
      }
    })();
  }, []);

  const total = results.value.length;
  const passed = results.value.filter((r) => r.success).length;
  const failed = total - passed;

  if (fatalError.value) {
    return (
      <div class="p-4 font-mono text-red-700 bg-red-50 border border-red-200 rounded">
        <h1 class="text-2xl font-bold mb-4">Fatal Test Runner Error</h1>
        <pre>{fatalError.value}</pre>
      </div>
    );
  }

  return (
    <div class="p-4 font-mono">
      <h1 class="text-2xl font-bold mb-4">Browser Test Runner</h1>
      <div class="mb-4">
        <p>Status: {isRunning.value ? "Running..." : "Finished"}</p>
        <p>
          Passed: <span class="text-green-600">{passed}</span>
        </p>
        <p>
          Failed: <span class="text-red-600">{failed}</span>
        </p>
      </div>

      <div class="space-y-2">
        {results.value.map((res, i) => (
          <div
            key={i}
            class={`p-2 border rounded ${
              res.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div class="flex justify-between">
              <span class="font-bold">
                {res.success ? "✅" : "❌"} {res.name}
              </span>
              <span class="text-gray-500 text-sm">
                {res.duration.toFixed(0)}ms
              </span>
            </div>
            {!res.success && (
              <pre class="mt-2 text-xs text-red-700 overflow-auto whitespace-pre-wrap">
                {res.error}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
