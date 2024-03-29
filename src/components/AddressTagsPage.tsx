import { Card } from "antd";
import isEmpty from "lodash/isEmpty";
import { useEffect, useState } from "react";
import { useAddressTags } from "../hooks/useAddressTags";
import { AddAddressTagsButton } from "./AddAddressTagsButton";
import { AddAddressTagsModal } from "./AddAddressTagsModal";
import { AddressTagsTable } from "./AddressTagTable";
import { ExportAddressTagsButton } from "./ExportAddressTagsButton";
import { PageContent } from "./formatting";
import { ImportAddressTagsButton } from "./ImportAddressTagsButton";
import { ImportAddressTagsModal } from "./ImportAddressTagsModal";
import { SyncAddressTagsButton } from "./SyncAddressTagsButton";

const AddressTagsPage = () => {
  const { fetchAddressTags, isLoadingAddressTags, addressTags } =
    useAddressTags();
  const [isAddAddressTagsModalVisible, setIsAddAddressTagsModalVisible] =
    useState(false);
  const [isImportAddressTagsModalVisible, setIsImportAddressTagsModalVisible] =
    useState(false);

  const [initialAddressTags, setInitialAddressTags] = useState([
    { key: null, val: null },
  ]);

  useEffect(() => {
    if (isEmpty(addressTags) && !isLoadingAddressTags) {
      fetchAddressTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extra = [
    <SyncAddressTagsButton key="sync-addressTags-button" />,
    <AddAddressTagsButton
      key="add-addressTags-button"
      showModal={() => setIsAddAddressTagsModalVisible(true)}
    />,
    <ImportAddressTagsButton
      showModal={() => setIsImportAddressTagsModalVisible(true)}
      key="import-addressTags-button"
    />,
    <ExportAddressTagsButton key="export-addressTags-button" />,
  ];

  return (
    <PageContent>
      <Card title={"Address Tags"} extra={extra} bordered>
        <AddressTagsTable />
      </Card>
      <AddAddressTagsModal
        isModalVisible={isAddAddressTagsModalVisible}
        setIsModalVisible={setIsAddAddressTagsModalVisible}
        initialAddressTags={initialAddressTags}
      />
      <ImportAddressTagsModal
        isModalVisible={isImportAddressTagsModalVisible}
        setIsAddAddressTagsModalVisible={setIsAddAddressTagsModalVisible}
        setIsModalVisible={setIsImportAddressTagsModalVisible}
        setInitialAddressTags={setInitialAddressTags}
      />
    </PageContent>
  );
};

export default AddressTagsPage;
