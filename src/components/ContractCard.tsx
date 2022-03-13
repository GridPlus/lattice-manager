import {
  CheckCircleOutlined,
  LinkOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { Button, Card, Modal, Table, Tag } from "antd";
import React, { useState } from "react";
import { useContracts } from "../hooks/useContracts";
import { abbreviateHash } from "../util/addresses";
import { constants } from "../util/helpers";

export function ContractCard({ pack }) {
  const { addContracts, isLoading } = useContracts();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const { url } = constants.CONTRACT_NETWORKS[pack.metadata.network];
  const { metadata, defs } = pack

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
    addContracts(defs).then(() => setIsAdded(true));
  };

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
      loading={isLoading}
    >
      {isLoading ? "Adding" : "Add to Lattice"}
    </Button>
  );

  return (
    <Card
      bordered={true}
      title={metadata.name}
      style={{
        flex: "1 1 30%",
        maxWidth: "33%",
      }}
      key={`card-${metadata.name}`}
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
      bodyStyle={{ height: "7em" }}
    >
      <p className="lattice-h3">{metadata.desc}</p>

      <Modal
        title={metadata.name}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={1000}
      >
        <Table dataSource={metadata.addresses} rowKey={(row) => row.address}>
          <Table.Column
            title="Address"
            dataIndex="address"
            key="address"
            render={(address) => (
              <Tag color="blue" key={`tag-${address}`}>
                <a
                  className="lattice-a"
                  href={`${url}/address/${address}`}
                  target={"_blank"}
                  rel={"noopener noreferrer"}
                  key={`a-${address}`}
                >
                  {abbreviateHash(address)}
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
