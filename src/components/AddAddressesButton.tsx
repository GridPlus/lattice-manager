import { PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useAddresses } from "../hooks/useAddresses";

export const AddAddressesButton = ({ showModal }) => {
  const { isLoadingAddresses } = useAddresses();

  return (
    <Button
      type="ghost"
      onClick={showModal}
      disabled={isLoadingAddresses}
      icon={<PlusOutlined />}
    >
      Add
    </Button>
  );
};
