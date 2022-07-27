import { Card } from "antd";
import "antd/dist/antd.dark.css";
import isEmpty from "lodash/isEmpty";
import { useEffect, useState } from "react";
import { AddAddressesButton } from "../components/AddAddressesButton";
import { AddAddressesModal } from "../components/AddAddressesModal";
import { AddressTable } from "../components/AddressTable";
import { ExportAddressesButton } from "../components/ExportAddressesButton";
import { ImportAddressesButton } from "../components/ImportAddressesButton";
import { ImportAddressesModal } from "../components/ImportAddressesModal";
import PageContent from "../components/PageContent";
import { SyncAddressesButton } from "../components/SyncAddressesButton";
import { useAddresses } from "../hooks/useAddresses";

const AddressTagsPage = () => {
  const { fetchAddresses, isLoadingAddresses, addresses } = useAddresses();
  const [isAddAddressesModalVisible, setIsAddAddressesModalVisible] =
    useState(false);
  const [isImportAddressesModalVisible, setIsImportAddressesModalVisible] =
    useState(false);

  const [initialAddresses, setInitialAddresses] = useState([
    { key: null, val: null },
  ]);

  useEffect(() => {
    if (isEmpty(addresses) && !isLoadingAddresses) {
      fetchAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extra = [
    <SyncAddressesButton key="sync-addresses-button" />,
    <AddAddressesButton
      key="add-addresses-button"
      showModal={() => setIsAddAddressesModalVisible(true)}
    />,
    <ImportAddressesButton
      showModal={() => setIsImportAddressesModalVisible(true)}
      key="import-addresses-button"
    />,
    <ExportAddressesButton key="export-addresses-button" />,
  ];

  return (
    <PageContent>
      <Card title={"Address Tags"} extra={extra} bordered>
        <AddressTable />
      </Card>
      <AddAddressesModal
        isModalVisible={isAddAddressesModalVisible}
        setIsModalVisible={setIsAddAddressesModalVisible}
        initialAddresses={initialAddresses}
      />
      <ImportAddressesModal
        isModalVisible={isImportAddressesModalVisible}
        setIsAddAddressesModalVisible={setIsAddAddressesModalVisible}
        setIsModalVisible={setIsImportAddressesModalVisible}
        setInitialAddresses={setInitialAddresses}
      />
    </PageContent>
  );
};

export default AddressTagsPage;
