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
    isLoadingAddresses,
    addresses,
    resetAddressesInState,
    error,
    retryFunction,
  } = useAddresses();

  // Fetch and Cache Addresses
  useEffect(() => {
    if (isEmpty(addresses) && !isLoadingAddresses) {
      fetchAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extra = [
    <Button
      key="sync-button"
      type="link"
      icon={<SyncOutlined />}
      disabled={isLoadingAddresses}
      onClick={() => {
        resetAddressesInState();
        fetchAddresses();
      }}
    >
      Sync
    </Button>,
    <AddAddressesButton key="add-addresses-button" />,
  ];

  return (
    <PageContent>
      <ErrorAlert error={error} retryFunction={retryFunction} />
      <Card title={"Saved Addresses"} extra={extra} bordered={true}>
        <AddressTable />
      </Card>
    </PageContent>
  );
};

export default AddressTagsPage;
