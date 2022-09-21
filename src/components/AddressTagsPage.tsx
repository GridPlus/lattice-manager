import { Card } from "antd";
import isEmpty from "lodash/isEmpty";
import { useEffect, useState } from "react";
import { AddAddressesButton } from "../components/AddAddressesButton";
import { AddAddressesModal } from "../components/AddAddressesModal";
import { AddressTable } from "../components/AddressTable";
import { ExportAddressesButton } from "../components/ExportAddressesButton";
import { ImportAddressesButton } from "../components/ImportAddressesButton";
import { ImportAddressesModal } from "../components/ImportAddressesModal";
import { useAddressTags } from "../hooks/useAddressTags";
import { useFeatureFlag } from "../hooks/useFeatureFlag";
import { PageContent } from "./formatting";
import { SyncAddressesButton } from "./SyncAddressesButton";

const AddressTagsPage = () => {
  const { fetchAddresses, isLoadingAddressTags, addressTags } = useAddressTags();
  const [isAddAddressesModalVisible, setIsAddAddressesModalVisible] =
    useState(false);
  const [isImportAddressesModalVisible, setIsImportAddressesModalVisible] =
    useState(false);

  const [initialAddresses, setInitialAddresses] = useState([
    { key: null, val: null },
  ]);

  useEffect(() => {
    if (isEmpty(addressTags) && !isLoadingAddressTags) {
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
  ];

  const { CAN_IMPORT_EXPORT_TAGS } = useFeatureFlag();

  if (CAN_IMPORT_EXPORT_TAGS) {
    extra.push(
      <ImportAddressesButton
        showModal={() => setIsImportAddressesModalVisible(true)}
        key="import-addresses-button"
      />
    );
    extra.push(<ExportAddressesButton key="export-addresses-button" />);
  }

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
