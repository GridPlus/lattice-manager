import "antd/dist/antd.dark.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import AddressTagsPage from "./pages/AddressTagsPage";
import { ConnectPage } from "./pages/ConnectPage";
import Landing from "./pages/LandingPage";
import { PairPage } from "./pages/PairPage";
import ReceivePage from "./pages/ReceivePage";
import SendPage from "./pages/SendPage";
import SettingsPage from "./pages/SettingsPage";
import { ValidatePage } from "./pages/ValidatePage";
import WalletPage from "./pages/WalletPage";
import { AppContextProvider } from "./store/AppContext";
import { BitcoinContextProvider } from "./store/BitcoinContext";
import "./styles.css";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppContextProvider>
          <BitcoinContextProvider>
            <Routes>
              <Route path="/" element={<AuthLayout />}>
                <Route index element={<ConnectPage />} />
                <Route path="pair" element={<PairPage />} />
                <Route path="validate" element={<ValidatePage />} />
              </Route>
              <Route path="/manage" element={<AppLayout />}>
                <Route index element={<Landing />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="send" element={<SendPage />} />
                <Route path="receive" element={<ReceivePage />} />
                <Route path="records" element={<AddressTagsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BitcoinContextProvider>
        </AppContextProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
