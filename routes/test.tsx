import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import TestRunner from "../islands/TestRunner.tsx";

export default define.page(function TestPage() {
  return (
    <>
      <Head>
        <title>Browser Tests</title>
      </Head>
      <TestRunner />
    </>
  );
});
