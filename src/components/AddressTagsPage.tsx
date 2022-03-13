import { SyncOutlined } from "@ant-design/icons";
import { Button, Card } from "antd";
import "antd/dist/antd.dark.css";
import React, { useEffect } from "react";
import { useAddresses } from "../hooks/useAddresses";
import { AddAddressesButton } from "./AddAddressesButton";
import { AddressTable } from "./AddressTable";
import { PageContent } from "./index";
import isEmpty from "lodash/isEmpty";
import { ErrorAlert } from "./ErrorAlert";

const AddressTagsPage = () => {
  const {
    fetchAddresses,
    isLoading,
    addresses,
    removeAddresses,
    error,
    retryFunction,
  } = useAddresses();

  // Fetch and Cache Addresses
  useEffect(() => {
    if (isEmpty(addresses)) {
      fetchAddresses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAddresses]);

  const extra = [
    <Button
      key="sync-button"
      type="link"
      icon={<SyncOutlined />}
      disabled={isLoading}
      onClick={fetchAddresses}
    >
      Sync
    </Button>,
    <AddAddressesButton key="add-addresses-button" />,
  ];

  return (
    <PageContent>
      <ErrorAlert error={error} retryFunction={retryFunction} />
      <Card title={"Saved Addresses"} extra={extra} bordered={true}>
        <AddressTable {...{ addresses, isLoading, removeAddresses }} />
      </Card>
    </PageContent>
  );
};

export default AddressTagsPage;
