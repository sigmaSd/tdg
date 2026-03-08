import { define } from "../utils.ts";

export default define.page(function App({ Component, state }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>tdg</title>
        {state.clientScript && (
          <script type="module" src={state.clientScript}></script>
        )}
        <link
          rel="stylesheet"
          crossorigin="anonymous"
          href="https://unpkg.com/react-day-picker@9.0.0/dist/style.css"
        />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
