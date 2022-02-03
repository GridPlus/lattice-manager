import { MinusSquareFilled, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Modal, Space } from "antd";
import _ from "lodash";
import React, { useState } from "react";

const MAX_RECORD_LEN = 63; // 63 characters max for both key and vlaue
const ADDRESS_RECORD_TYPE = 0;
const keyIsDuplicatedErrorMessage =
  "You already have a tag with this address on your device.";
const valIsDuplicatedErrorMessage =
  "You already have a tag with this name on your device.";
const validAddressRegex = /^0x[a-fA-F0-9]{40}$/;

/** @typedef {{ key: string, val: string }} Record */

/**
 * @name AddAddressesButton
 * @param {Object} props
 * @param {Record[]} props.records
 * @param {Object} props.session
 * @param {() => void} props.onAddAddresses
 */
export const AddAddressesButton = ({
  records,
  session,
  onAddAddresses,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const resetState = () => {
    form.resetFields();
    setIsModalVisible(false);
    setError(null);
    setIsLoading(false);
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const hideModal = () => {
    resetState();
  };

  const handleCancel = () => {
    hideModal();
  };

  const onFinish = () => {
    form.validateFields().then(({ recordsToAdd }) => {
      setIsLoading(true);
      // Transform recordsToAdd data into { key: val } for SDK
      const records = _.chain(recordsToAdd)
        .keyBy("key")
        .mapValues("val")
        .value();
      const opts = {
        caseSensitive: false,
        type: ADDRESS_RECORD_TYPE,
        records,
      };
      session.client.addKvRecords(opts, (err) => {
        setIsLoading(false);
        if (err) return setError(err);
        onAddAddresses();
        resetState();
      });
    });
  };

  const onFinishFailed = () => {
    setError("Unable to submit. Fix errors in form and try again.");
  };

  const onFieldsChange = () => {
    setError(null);
  };

  return (
    <>
      <Button type="ghost" onClick={showModal} icon={<PlusOutlined />}>
        Add
      </Button>
      <Modal
        title="Add Address Tags"
        visible={isModalVisible}
        maskClosable={false}
        onOk={form.submit}
        onCancel={handleCancel}
        footer={[
          <Button type="link" onClick={handleCancel} key="cancel">
            Cancel
          </Button>,
          <Button
            type="primary"
            loading={isLoading}
            onClick={form.submit}
            key="add"
          >
            Add
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {error ? (
            <Alert description={error} type="error" style={{ width: "100%" }} />
          ) : null}
          <Form
            form={form}
            name="formData"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            onFieldsChange={onFieldsChange}
            autoComplete="off"
            preserve={false}
            layout="vertical"
          >
            <Form.List
              name="recordsToAdd"
              initialValue={[{ key: null, val: null }]}
            >
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div
                      key={`${name}-inputs`}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        marginBottom: "1em",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          flexGrow: 1,
                        }}
                      >
                        <Form.Item
                          {...restField}
                          name={[name, "key"]}
                          validateTrigger={["onChange", "onBlur"]}
                          rules={[
                            { required: true, message: "Address is required." },
                            {max: MAX_RECORD_LEN, type: "string", message: `Must be shorter than ${MAX_RECORD_LEN} characters.`},
                            {
                              pattern: validAddressRegex,
                              message: "Must be a valid address.",
                              validateTrigger: "onBlur",
                            },
                            {
                              validator: (rule, key) => {
                                return records?.some((r) => r.key === key)
                                  ? Promise.reject(
                                      new Error(keyIsDuplicatedErrorMessage)
                                    )
                                  : Promise.resolve();
                              },
                              validateTrigger: ["onChange", "onBlur"],
                            },
                          ]}
                        >
                          <Input
                            addonBefore={"Address"}
                            data-testid={`${name}-address-input`}
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, "val"]}
                          validateTrigger={["onChange", "onBlur"]}
                          rules={[
                            { required: true, message: "Name is required" },
                            {max: MAX_RECORD_LEN, type: "string", message: `Must be shorter than ${MAX_RECORD_LEN} characters.`},
                            {
                              validator: (rule, val) => {
                                return records?.some((r) => r.val === val)
                                  ? Promise.reject(
                                      new Error(valIsDuplicatedErrorMessage)
                                    )
                                  : Promise.resolve();
                              },
                              validateTrigger: ["onChange", "onBlur"],
                            },
                          ]}
                        >
                          <Input
                            addonBefore={"Name"}
                            data-testid={`${name}-name-input`}
                          />
                        </Form.Item>
                      </div>
                      {name > 0 ? (
                        <Button
                          type="text"
                          icon={<MinusSquareFilled />}
                          disabled={isLoading}
                          style={{
                            height: "auto",
                            marginLeft: "1em",
                            marginBottom: "1.2em",
                          }}
                          onClick={() => remove(name)}
                        />
                      ) : null}
                    </div>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      block
                      icon={<PlusOutlined />}
                      disabled={isLoading}
                      onClick={add}
                    >
                      Add Another Address Tag
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form>
        </Space>
      </Modal>
    </>
  );
};
