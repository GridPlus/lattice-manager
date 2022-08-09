import { DesktopOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Card, Modal } from "antd";
import { useState } from "react";
import { ConnectForm } from "../components/ConnectForm";
import { NameEditor } from "../components/NameEditor";
import { NewUserModal } from "../components/NewUserModal";
import { useLattice } from "../hooks/useLattice";
import { useUrlParams } from "../hooks/useUrlParams";
import Settings from "./SettingsPage";

export const ConnectPage = () => {
  const { keyring } = useUrlParams();
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isNewUserModalVisible, setIsNewUserModalVisible] = useState(false);
  const { integrationName, setIntegrationName } = useLattice();
  const wasOpenedByKeyring = !!keyring; // Was the app opened with a keyring in the url parameters

  return (
    <>
      <Card
        bordered={true}
        style={{ maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}
        bodyStyle={{ textAlign: "center" }}
      >
        {wasOpenedByKeyring ? (
          <>
            <h2>
              Lattice Connector <LinkOutlined />
            </h2>
            <div style={{ margin: "2em" }}>
              <h3>
                <i>Connect to:</i>
              </h3>
              <NameEditor name={integrationName} setName={setIntegrationName} />
            </div>
          </>
        ) : (
          <h2>
            <DesktopOutlined /> Lattice Manager
          </h2>
        )}
        <ConnectForm />
      </Card>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Button
          type="link"
          onClick={() => setIsNewUserModalVisible(true)}
          style={{ marginTop: "20px" }}
        >
          New User Info
        </Button>
        <Button type="link" onClick={() => setIsSettingsModalVisible(true)}>
          Settings
        </Button>
        <Button
          type="link"
          href="https://gridplus.io/lattice"
          target={"_blank"}
          rel={"noopener noreferrer"}
        >
          About the Lattice
        </Button>
      </div>
      <Modal
        title="Settings"
        footer={null}
        visible={isSettingsModalVisible}
        onOk={() => {
          setIsSettingsModalVisible(false);
        }}
        onCancel={() => {
          setIsSettingsModalVisible(false);
        }}
      >
        <Settings inModal={true} />
      </Modal>
      <NewUserModal
        {...{
          isNewUserModalVisible,
          setIsNewUserModalVisible,
          name: integrationName,
        }}
      />
    </>
  );
};
