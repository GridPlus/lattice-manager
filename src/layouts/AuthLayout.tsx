import { Layout } from "antd";
import { Content } from "antd/lib/layout/layout";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppFooter } from "../components/AppFooter";
import { LoadingCard } from "../components/LoadingCard";
import { useLattice } from "../hooks/useLattice";


export const AuthLayout = () => {
  const {
    isLoadingClient,
    handleLogout,
    initializeClient,
    isConnected,
  } = useLattice();


  useEffect(() => {
    if (!isConnected()) {
      initializeClient();
    }
  }, [initializeClient, isConnected]);

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
      {!isLoadingClient && (
        <Layout style={{ minHeight: "100vh" }}>
          <Content style={{ margin: "25px 0 0 0" }}>
            <Outlet />
          </Content>
          <AppFooter />
        </Layout>
      )}
    </>
  );
};
