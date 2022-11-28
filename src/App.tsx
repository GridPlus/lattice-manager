import React from "react";
import "antd/dist/antd.dark.min.css";
import "./styles.css";
import { Main } from "./components";
import { AppContextProvider } from "./store/AppContext";

function App() {
  return (
    <div className="App">
      <AppContextProvider>
        <Main />
      </AppContextProvider>
    </div>
  );
}

export default App;
