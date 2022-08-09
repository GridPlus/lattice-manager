import { Button } from "antd";
import { useAddresses } from "../hooks/useAddresses";
import { SyncOutlined } from "@ant-design/icons";

export const SyncAddressesButton = () => {
  const { fetchAddresses, isLoadingAddresses, resetAddressesInState } =
    useAddresses();

  return (
    <Button
      type="link"
      icon={<SyncOutlined />}
      disabled={isLoadingAddresses}
      onClick={() => {
        resetAddressesInState();
        fetchAddresses();
      }}
    >
      Sync
    </Button>
  );
};
