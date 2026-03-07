import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import App from "../islands/App.tsx";

export default define.page(function Home() {
  return (
    <>
      <Head>
        <title>Tableau de Garde</title>
      </Head>
      <App />
    </>
  );
});
