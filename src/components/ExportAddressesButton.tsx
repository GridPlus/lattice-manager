import { ExportOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useAddresses } from "../hooks/useAddresses";
import { addressesToCsvString } from "../util/csv";

export const ExportAddressesButton = () => {
  const { isLoadingAddresses, addresses } = useAddresses();

  const handleOnClick = () => {
    const csv = addressesToCsvString(addresses);
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
      disabled={isLoadingAddresses}
      onClick={handleOnClick}
    >
      Export
    </Button>
  );
};
