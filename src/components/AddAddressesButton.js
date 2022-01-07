import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Modal, Space } from "antd";
import _ from "lodash";
import React, { useEffect, useState } from "react";
const ADDRESS_RECORD_TYPE = 0;
const keyIsDuplicatedErrorMessage =
  "You already have a tag with this address on your device.";
const valIsDuplicatedErrorMessage =
  "You already have a tag with this name on your device.";
const defaultRecordToAdd = { key: null, val: null, isValid: false };
/**
 * @typedef {{ key: string, val: string }} Record
 */

/**
 * @typedef {{ key: string, val: string, isValid: boolean }} RecordToAdd
 */

const ErrorAlert = ({ errorMessage }) => (
  <>{errorMessage ? <Alert description={errorMessage} type="error" /> : null}</>
);

/**
 * @name AddAddressForm
 * @param {Object} props
 * @param {Record[]} props.records
 * @param {RecordToAdd} props.recordToAdd
 * @param {function} props.onChange
 */
const AddAddressForm = ({ records, recordToAdd, onChange }) => {
  const [key, setKey] = useState(null);
  const [keyError, setKeyError] = useState(null);
  const [val, setVal] = useState(null);
  const [valError, setValError] = useState(null);

  useEffect(() => {
    const changedValues = {};

    const keyIsDuplicated = records.some((r) => r.key === key);
    setKeyError(keyIsDuplicated ? keyIsDuplicatedErrorMessage : null);

    const valIsDuplicated = records.some((r) => r.val === val);
    setValError(valIsDuplicated ? valIsDuplicatedErrorMessage : null);

    const isValid = !keyIsDuplicated && !valIsDuplicated && key && val;

    if (key !== recordToAdd.key) changedValues.key = key;
    if (val !== recordToAdd.val) changedValues.val = val;
    if (isValid !== recordToAdd.isValid) changedValues.isValid = isValid;
    if (changedValues) onChange(changedValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, val, records, onChange]);

  const handleOnChangeKey = (inputVal) => setKey(inputVal);
  const handleOnChangeVal = (inputVal) => setVal(inputVal);

  return (
    <div style={{ marginBottom: "1.5em" }}>
      <ErrorAlert errorMessage={keyError} />
      <Input
        addonBefore={"Address"}
        onChange={(evt) => handleOnChangeKey(evt.target.value)}
      />

      <ErrorAlert errorMessage={valError} />
      <Input
        addonBefore={"Name"}
        onChange={(evt) => handleOnChangeVal(evt.target.value)}
      />
    </div>
  );
};

/**
 * @name AddAddressesButton
 * @param {Object} props
 * @param {Record[]} props.records
 * @param {Object} props.session
 * @param {(records: Record[]) => void} props.addToRecordsInState
 */
export const AddAddressesButton = ({
  records,
  session,
  addToRecordsInState,
}) => {
  const [recordsToAdd, setRecordsToAdd] = useState([defaultRecordToAdd]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);

  // useEffect(() => {
  //   console.log("checking form");
  //   setIsFormValid(recordsToAdd.every((r) => r.isValid));
  // }, [recordsToAdd, ...recordsToAdd.map((rta) => rta.isValid)]);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const hideModal = () => {
    setIsModalVisible(false);
    setRecordsToAdd([defaultRecordToAdd]);
    setError("");
    setIsFormValid(false);
    setIsLoading(false);
  };

  const handleCancel = () => {
    hideModal();
  };

  const handleAdd = () => {
    addRecords();
  };

  const handleOnChangeToRecordToAdd = (index) => (value) => {
    setRecordsToAdd((recordsToAdd) => {
      const _recordsToAdd = [...recordsToAdd];
      _recordsToAdd[index] = value;
      return _recordsToAdd;
    });
  };

  const addRecords = () => {
    setIsLoading(true);
    // Transform record data into { key: val } for SDK
    const records = _.chain(recordsToAdd).keyBy("key").mapValues("val").value();
    console.log({ records });
    const opts = {
      caseSensitive: false,
      type: ADDRESS_RECORD_TYPE,
      records,
    };
    session.client.addKvRecords(opts, (err) => {
      setIsLoading(false);
      if (err) return setError(err);
      addToRecordsInState(recordsToAdd);
      setIsModalVisible(false);
    });
  };

  const addAnotherAddress = () => {
    setRecordsToAdd((records) => [...records, defaultRecordToAdd]);
  };

  return (
    <>
      <Button type="ghost" onClick={showModal} icon={<PlusOutlined />}>
        Add
      </Button>
      <Modal
        title="Add Address Tags"
        visible={isModalVisible}
        onOk={handleAdd}
        onCancel={handleCancel}
        footer={[
          <Button type="link" disabled={isLoading} onClick={handleCancel}>
            Cancel
          </Button>,
          <Button type="primary" disabled={!isFormValid} onClick={handleAdd}>
            Add
          </Button>,
        ]}
      >
        <Space direction="vertical">
          <ErrorAlert errorMessage={error} />
          {recordsToAdd.map((recordToAdd, i) => (
            <AddAddressForm
              records={records}
              recordToAdd={recordToAdd}
              key={i}
              onChange={handleOnChangeToRecordToAdd(i)}
            />
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            disabled={isLoading}
            onClick={addAnotherAddress}
          >
            Add Another Address Tag
          </Button>
        </Space>
      </Modal>
    </>
  );
};
