import { ImportOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useAddresses } from "../hooks/useAddresses";

export const ImportAddressesButton = ({ showModal }) => {
  const { isLoadingAddresses } = useAddresses();

  return (
    <Button
      type="default"
      icon={<ImportOutlined />}
      disabled={isLoadingAddresses}
      onClick={showModal}
    >
      Import
    </Button>
  );
};
