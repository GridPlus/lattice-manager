import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Modal } from "antd";
import React, { useEffect, useState } from "react";
const ADDRESS_RECORD_TYPE = 0;
const keyIsDuplicatedErrorMessage =
  "You already have a tag with this address on your device.";
const valueIsDuplicatedErrorMessage =
  "You already have a tag with this name on your device.";

/**
 * @typedef {{ key: string, val: string }} Record
 */

/**
 * @typedef {{ key: string, value: string }} RecordToAdd
 */

const ErrorAlert = ({ errorMessage }) => (
  <>{errorMessage ? <Alert description={errorMessage} type="error" /> : null}</>
);

/**
 * @name AddAddressForm
 * @param {Object} props
 * @param {Record[]} props.records
 * @param {RecordToAdd} props.recordToAdd
 */
const AddAddressForm = ({ records, recordToAdd }) => {
  const [key, setKey] = useState(null);
  const [keyError, setKeyError] = useState(null);
  const [value, setValue] = useState(null);
  const [valueError, setValueError] = useState(null);

  useEffect(() => {
    const keyIsDuplicated = records.some((r) => r.key === key);
    setKeyError(keyIsDuplicated ? keyIsDuplicatedErrorMessage : null);

    const valueIsDuplicated = records.some((r) => r.val === value);
    setValueError(valueIsDuplicated ? valueIsDuplicatedErrorMessage : null);

    recordToAdd.key = key;
    recordToAdd.value = value;
  }, [key, value, records, recordToAdd.key, recordToAdd.value]);

  const handleOnChangeKey = (inputValue) => setKey(inputValue);
  const handleOnChangeValue = (inputValue) => setValue(inputValue);

  return (
    <>
      <ErrorAlert errorMessage={keyError} />
      <Input
        placeholder={"Address"}
        onChange={(evt) => handleOnChangeKey(evt.target.value)}
      />

      <ErrorAlert errorMessage={valueError} />
      <Input
        placeholder={"Display Name"}
        onChange={(evt) => handleOnChangeValue(evt.target.value)}
      />
    </>
  );
};

/**
 * @name AddAddressesButton
 * @param {Object} props
 * @param {Record[]} props.records
 * @param {Object} props.session
 * @param {(records: RecordToAdd[]) => void} props.addToRecordsInState
 */
export const AddAddressesButton = ({
  records,
  session,
  addToRecordsInState,
}) => {
  const [recordsToAdd, setRecordsToAdd] = useState([
    { key: null, value: null },
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const isFormValid = () => {
    return true;
  };

  const handleSave = () => {
    // TODO
  };

  const addRecords = () => {
    setIsLoading(true);
    const opts = {
      caseSensitive: false,
      type: ADDRESS_RECORD_TYPE,
      records: recordsToAdd,
    };
    session.client.addKvRecords(opts, (err) => {
      setIsLoading(false);
      if (err) return setError(err);
      addToRecordsInState(recordsToAdd);
    });
  };

  return (
    <>
      <Button type="ghost" onClick={showModal} icon={<PlusOutlined />}>
        Add
      </Button>
      <Modal
        title="Save Address Tag"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button type="link" disabled={isFormValid()} onClick={handleCancel}>
            Cancel
          </Button>,
          <Button type="primary" disabled={isFormValid()} onClick={handleSave}>
            Save
          </Button>,
        ]}
      >
        {recordsToAdd.map((recordToAdd) => (
          <AddAddressForm records={records} recordToAdd={recordToAdd} />
        ))}
      </Modal>
    </>
  );
};
