import { PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useAddressTags } from "../hooks/useAddressTags";

export const AddAddressTagsButton = ({ showModal }) => {
  const { isLoadingAddressTags } = useAddressTags();

  return (
    <Button
      type="ghost"
      onClick={showModal}
      disabled={isLoadingAddressTags}
      icon={<PlusOutlined />}
    >
      Add
    </Button>
  );
};
