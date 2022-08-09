import { Layout } from "antd";
import "antd/dist/antd.dark.css";
import { useContext, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppFooter } from "../components/AppFooter";
import { AppHeader } from "../components/AppHeader";
import { AppSidebar } from "../components/AppSidebar";
import { LoadingCard } from "../components/LoadingCard";
import { useLattice } from "../hooks/useLattice";
import { BitcoinContext } from "../store/BitcoinContext";
const { Content } = Layout;

const AppLayout = () => {
  const navigate = useNavigate();
  const {
    initializeClient,
    isLoadingClient,
    isConnected,
    isAuthenticated,
    handleLogout,
  } = useLattice();
  const { isLoadingBtcData } = useContext(BitcoinContext);

  useEffect(() => {
    if (!isConnected()) {
      initializeClient();
    }
  }, [initializeClient, isConnected]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  return (
    <>
      {isLoadingClient && (
        <LoadingCard
          spin={true}
          msg="Locating your Lattice..."
          onCancel={() => {
            handleLogout();
          }}
        />
      )}
      {isLoadingBtcData && (
        <LoadingCard spin={true} msg="Syncing chain data..." />
      )}
      {!isLoadingClient && !isLoadingBtcData && (
        <Layout style={{ minHeight: "100vh" }} hasSider>
          <AppSidebar />
          <Layout>
            <AppHeader />
            <Content style={{ margin: "0 0 0 0" }}>
              <Outlet />
            </Content>
            <AppFooter />
          </Layout>
        </Layout>
      )}
    </>
  );
};

export default AppLayout;
