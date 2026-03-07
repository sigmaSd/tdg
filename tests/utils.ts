// utils/test_runner_utils.ts
export interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

export type TestFn = () => Promise<void> | void;

const tests: { name: string; fn: TestFn }[] = [];

export function browserTest(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

export async function runBrowserTests(
  onResult?: (result: TestResult) => void,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const test of tests) {
    const start = performance.now();
    try {
      await test.fn();
      const result = {
        name: test.name,
        success: true,
        duration: performance.now() - start,
      };
      results.push(result);
      if (onResult) onResult(result);
    } catch (err) {
      const result = {
        name: test.name,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: performance.now() - start,
      };
      results.push(result);
      if (onResult) onResult(result);
    }
  }
  return results;
}
