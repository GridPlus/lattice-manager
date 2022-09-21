import { ImportOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useAddressTags } from "../hooks/useAddressTags";

export const ImportAddressesButton = ({ showModal }) => {
  const { isLoadingAddressTags } = useAddressTags();

  return (
    <Button
      type="default"
      icon={<ImportOutlined />}
      disabled={isLoadingAddressTags}
      onClick={showModal}
    >
      Import
    </Button>
  );
};
