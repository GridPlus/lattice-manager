import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Modal, Space } from "antd";
import _ from "lodash";
import React, { useEffect, useState } from "react";

const ADDRESS_RECORD_TYPE = 0;
const keyIsDuplicatedErrorMessage =
  "You already have a tag with this address on your device.";
const valIsDuplicatedErrorMessage =
  "You already have a tag with this name on your device.";
const getDefaultRecord = ()=>({ key: null, val: null, isKeyValid: false, isValValid: false });

/**
 * @typedef {{ key: string, val: string }} Record
 */

/**
 * @typedef {{ key: string, val: string, isKeyValid: boolean, isValValid: boolean }} RecordToAdd
 */

const ErrorAlert = ({ errorMessage }) => (
  <>{errorMessage ? <Alert description={errorMessage} type="error" style={{width:"100%"}} /> : null}</>
);

/**
 * @name AddAddressForm
 * @param {Object} props
 * @param {Record[]} props.records
 * @param {function} props.onChange
 */
const AddAddressForm = ({ records, onChange }) => {
  const [keyError, setKeyError] = useState(null);
  const [valError, setValError] = useState(null);

  const handleOnChangeKey = (key) => {
    const keyIsDuplicated = records.some((r) => r.key === key)
    setKeyError(keyIsDuplicated ? keyIsDuplicatedErrorMessage : null);
    onChange('key', key);
    onChange('isKeyValid', !keyIsDuplicated);
  };

  const handleOnBlurKey = (key) => {
    const validAddressRegex = /^0x[a-fA-F0-9]{40}$/
    const isValidAddress = validAddressRegex.test(key)
    setKeyError(isValidAddress ? null : "Must be a valid address");
    onChange('isKeyValid', isValidAddress);
  };

  const handleOnChangeVal = (val) => {
    const valIsDuplicated = records.some((r) => r.val === val)
    setValError(valIsDuplicated ? valIsDuplicatedErrorMessage : null);
    onChange('val', val);
    onChange('isValValid', !valIsDuplicated);
  };

  return (
    <div style={{ marginBottom: "1.5em" }}>
      <ErrorAlert errorMessage={keyError} />
      <Input
        addonBefore={"Address"}
        onChange={(evt) => handleOnChangeKey(evt.target.value)}
        onBlur={(evt)=> handleOnBlurKey(evt.target.value)}
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
  const [recordsToAdd, setRecordsToAdd] = useState([getDefaultRecord()]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const keysAreValid = recordsToAdd.every(r => r.isKeyValid)
    const valuesAreValid = recordsToAdd.every(r => r.isValValid)
    const formIsValid = keysAreValid && valuesAreValid
    setIsFormValid(formIsValid);
  }, [records, recordsToAdd]);

  const resetState = () => {
    setIsModalVisible(false);
    setRecordsToAdd([getDefaultRecord()]);
    setError("");
    setIsFormValid(false);
    setIsLoading(false);
  }

  const showModal = () => {
    setIsModalVisible(true);
  };

  const hideModal = () => {
    resetState()
  };

  const handleCancel = () => {
    hideModal();
  };

  const handleAdd = () => {
    addRecords();
  };

  const handleOnChangeToRecordToAdd = (index) => (property, value) => 
    setRecordsToAdd((recordsToAdd) => {
      const _recordsToAdd = [...recordsToAdd];
      _recordsToAdd[index][property] = value;
      return _recordsToAdd;
    })
  

  const addRecords = () => {
    setIsLoading(true);
    // Transform recordsToAdd data into { key: val } for SDK
    const records = _.chain(recordsToAdd).keyBy("key").mapValues("val").value();
    const opts = {
      caseSensitive: false,
      type: ADDRESS_RECORD_TYPE,
      records,
    };
    session.client.addKvRecords(opts, (err) => {
      setIsLoading(false);
      if (err) return setError(err);
      addToRecordsInState(recordsToAdd);
      resetState()
    });
  };

  const addAnotherAddress = () => {
    setRecordsToAdd((records) => [...records, getDefaultRecord()]);
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
          <Button type="link" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button type="primary" disabled={!isFormValid} loading={isLoading} onClick={handleAdd}>
            Add
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <ErrorAlert errorMessage={error} />
          {recordsToAdd.map((_, i) => (
            <AddAddressForm
              records={records}
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
