import {
  CheckCircleOutlined,
  CheckOutlined,
  DownloadOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { Button, Card, Modal, Table, Tag } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { constants } from "../util/helpers";

export function ContractCard({ pack, session }) {
  const [metadata, setMetadata] = useState({});
  const [contract, setContract] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isLatestLoaded, setIsLatestLoaded] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleAddClick = () => {
    session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT;
    session.addAbiDefs(contract, (err) => {
      // Reset timeout to default
      session.client.timeout = constants.ASYNC_SDK_TIMEOUT;
      if (err) {
        setIsAdded(false);
        setIsLoading(false);
      } else {
        setIsAdded(true);
        setIsLoading(false);
      }
    });
  };

  const handleLoadLatest = () => {
    loadContractData();
    setIsAdded(false);
    setIsLatestLoaded(true);
  };

  const loadContractData = useCallback(() => {
    setIsLoading(true);
    fetch(`${constants.ABI_PACK_URL}/${pack.fname}`)
      .then((response) => response.json())
      .then((resp) => {
        setMetadata(resp.metadata);
        setContract(resp.defs);
        setIsLoading(false);
      });
  }, [pack]);

  useEffect(() => {
    loadContractData();
  }, [pack, loadContractData]);

  const AddDefsButton = isAdded ? (
    <Button type="default" icon={<CheckCircleOutlined />} disabled={isAdded}>
      Added
    </Button>
  ) : (
    <Button
      type="default"
      onClick={handleAddClick}
      icon={<PlusCircleOutlined />}
    >
      Add to Lattice
    </Button>
  );

  const LoadLatestButton = isLatestLoaded ? (
    <Button type="default" icon={<CheckOutlined />} disabled={isLatestLoaded}>
      Loaded
    </Button>
  ) : (
    <Button
      type="default"
      onClick={handleLoadLatest}
      icon={<DownloadOutlined />}
    >
      Load Latest
    </Button>
  );

  return (
    <Card
      bordered={true}
      title={metadata.name}
      style={{ minWidth: 350, margin: 12 }}
      hoverable={true}
      key={`card-${pack.name}`}
      extra={AddDefsButton}
      actions={[
        <Button type="default" onClick={showModal}>
          View Contents
        </Button>,
        LoadLatestButton,
      ]}
    >
      <p className="lattice-h3">{metadata.desc}</p>

      <Modal
        title={metadata.name}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={1000}
      >
        <Table dataSource={metadata.addresses}>
          <Table.Column
            title="Address"
            dataIndex="address"
            key="address"
            render={(address) => (
              <Tag color="blue" key={`tag-${address}`}>
                <a
                  className="lattice-a"
                  href={`https://etherscan.io/address/${address}`}
                  target={"_blank"}
                  rel={"noopener noreferrer"}
                  key={`a-${address}`}
                >
                  {`${address.slice(0, 10)}...${address.slice(
                    address.length - 8,
                    address.length
                  )}`}
                </a>
              </Tag>
            )}
          />
          <Table.Column title="Tag" dataIndex="tag" key="tag" />
        </Table>
      </Modal>
    </Card>
  );
}
