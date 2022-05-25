import React from 'react';
import 'antd/dist/antd.dark.css'
import { Main } from './components'
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
