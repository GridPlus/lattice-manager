import { Button, Modal, Space } from "antd";
import { useState } from "react";
import { useAddressTags } from "../hooks/useAddressTags";
import { csvStringToAddresses } from "../util/csv";

export const ImportAddressesModal = ({
  isModalVisible,
  setIsModalVisible,
  setIsAddAddressesModalVisible,
  setInitialAddresses,
}) => {
  const { isLoadingAddressTags } = useAddressTags();
  const [file, setFile] = useState();
  const fileReader = new FileReader();

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    hideModal();
  };

  const handleOnChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleOnSubmit = (e) => {
    e.preventDefault();

    if (file) {
      fileReader.onload = function (event) {
        const text = event.target.result as string;
        const addresses = csvStringToAddresses(text);
        setInitialAddresses(addresses);
        hideModal();
        setIsAddAddressesModalVisible(true);
      };

      fileReader.readAsText(file);
    }
  };

  return (
    <Modal
      title="Add Address Tags"
      visible={isModalVisible}
      maskClosable={false}
      onOk={handleOnSubmit}
      onCancel={handleCancel}
      destroyOnClose={true}
      footer={[
        <Button type="link" onClick={handleCancel} key="cancel">
          Cancel
        </Button>,
        <Button
          type="primary"
          loading={isLoadingAddressTags}
          onClick={handleOnSubmit}
          key="add"
        >
          Import
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <input
          type={"file"}
          id={"csvFileInput"}
          accept={".csv"}
          onChange={handleOnChange}
        />
      </Space>
    </Modal>
  );
};
