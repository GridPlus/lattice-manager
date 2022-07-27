import { PageHeader } from "antd";
import { Header } from "antd/lib/layout/layout";
import { LogoutButton } from "./LogoutButton";
import { WalletButton } from "./WalletButton";

export const AppHeader = () => {
  return (
    <Header style={{ paddingBottom: "20px", backgroundColor: "transparent" }}>
      <PageHeader
        extra={[
          <WalletButton key="wallet-button" />,
          <LogoutButton key="logout-button" />,
        ]}
      />
    </Header>
  );
};
