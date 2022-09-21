import { ExportOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useAddressTags } from "../hooks/useAddressTags";
import { addressesToCsvString } from "../util/csv";

export const ExportAddressesButton = () => {
  const { isLoadingAddressTags, addressTags } = useAddressTags();

  const handleOnClick = () => {
    const csv = addressesToCsvString(addressTags);
    const csvData = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    let csvURL = null;
    csvURL = window.URL.createObjectURL(csvData);
    const tempLink = document.createElement("a");
    tempLink.href = csvURL;
    tempLink.setAttribute("download", "SavedAddresses.csv");
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
