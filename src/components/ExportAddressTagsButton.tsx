import { ExportOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useAddressTags } from "../hooks/useAddressTags";
import { addressTagsToCsvString } from "../util/csv";

export const ExportAddressTagsButton = () => {
  const { isLoadingAddressTags, addressTags } = useAddressTags();

  const handleOnClick = () => {
    const csv = addressTagsToCsvString(addressTags);
    const csvData = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    let csvURL = null;
    csvURL = window.URL.createObjectURL(csvData);
    const tempLink = document.createElement("a");
    tempLink.href = csvURL;
    tempLink.setAttribute("download", "SavedAddressTags.csv");
    tempLink.click();
  };

  return (
    <Button
      type="default"
      icon={<ExportOutlined />}
      disabled={isLoadingAddressTags}
      onClick={handleOnClick}
    >
      Export
    </Button>
  );
};
