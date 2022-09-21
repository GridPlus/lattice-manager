import { Button } from "antd";
import { useAddressTags } from "../hooks/useAddressTags";
import { SyncOutlined } from "@ant-design/icons";

export const SyncAddressesButton = () => {
  const { fetchAddresses, isLoadingAddressTags, resetAddressTagsInState } =
    useAddressTags();

  return (
    <Button
      type="link"
      icon={<SyncOutlined />}
      disabled={isLoadingAddressTags}
      onClick={() => {
        resetAddressTagsInState();
        fetchAddresses();
      }}
    >
      Sync
    </Button>
  );
};
