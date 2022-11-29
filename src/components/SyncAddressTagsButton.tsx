import { Button } from "antd";
import { useAddressTags } from "../hooks/useAddressTags";
import { SyncOutlined } from "@ant-design/icons";

export const SyncAddressTagsButton = () => {
  const { fetchAddressTags, isLoadingAddressTags, resetAddressTagsInState } =
    useAddressTags();

  return (
    <Button
      type="link"
      icon={<SyncOutlined />}
      disabled={isLoadingAddressTags}
      onClick={() => {
        resetAddressTagsInState();
        fetchAddressTags();
      }}
    >
      Sync
    </Button>
  );
};
