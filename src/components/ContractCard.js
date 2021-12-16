import {
  CheckCircleOutlined,
  LinkOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { Button, Card, Modal, Table, Tag } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { constants } from "../util/helpers";

export function ContractCard({ pack, session }) {
  const [metadata, setMetadata] = useState({});
  const [contract, setContract] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

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
    setIsAdding(true);
    session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT;
    session.addAbiDefs(contract, (err) => {
      // Reset timeout to default
      session.client.timeout = constants.ASYNC_SDK_TIMEOUT;
      if (err) {
        setIsAdded(false);
      } else {
        setIsAdded(true);
      }
      setIsAdding(false);
    });
  };

  const loadContractData = useCallback(() => {
    fetch(`${constants.ABI_PACK_URL}/${pack.fname}`)
      .then((response) => response.json())
      .then((resp) => {
        setMetadata(resp.metadata);
        setContract(resp.defs);
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
      type="primary"
      ghost
      onClick={handleAddClick}
      icon={<PlusCircleOutlined />}
      loading={isAdding}
    >
      {isAdding ? "Adding" : "Add to Lattice"}
    </Button>
  );

  return (
    <Card
      bordered={true}
      title={pack.name}
      style={{
        flex: "1 1 30%",
        margin: "10px",
      }}
      key={`card-${pack.name}`}
      extra={AddDefsButton}
      actions={[
        <Button type="default" onClick={showModal}>
          View Contents
        </Button>,
        <Button
          type="text"
          href={metadata.website}
          target="_blank"
          icon={<LinkOutlined />}
        >
          Website
        </Button>,
      ]}
    >
      <p className="lattice-h3">{pack.desc}</p>

      <Modal
        title={pack.name}
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
