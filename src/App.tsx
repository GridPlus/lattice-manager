import React from "react";
import * as Sentry from "@sentry/react";
import "antd/dist/antd.dark.min.css";
import "./styles.css";
import { Main } from "./components";
import { AppContextProvider } from "./store/AppContext";

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p>{error instanceof Error ? error.message : "An unexpected error occurred"}</p>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
    >
      <div className="App">
        <AppContextProvider>
          <Main />
        </AppContextProvider>
      </div>
    </Sentry.ErrorBoundary>
  );
}

export default App;
