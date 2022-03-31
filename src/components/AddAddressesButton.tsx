import { MinusSquareFilled, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Space } from "antd";
import _ from "lodash";
import React, { useState } from "react";
import { useAddresses } from "../hooks/useAddresses";
import { ErrorAlert } from "./ErrorAlert";

const MAX_RECORD_LEN = 63; // 63 characters max for both key and vlaue
export const keyIsDuplicatedErrorMessage =
  "You already have a tag with this address on your device.";
export const valIsDuplicatedErrorMessage =
  "You already have a tag with this name on your device.";

export const AddAddressesButton = () => {
  const {
    addresses,
    addAddresses,
    isLoadingAddresses,
    error,
    setError,
    retryFunction,
  } = useAddresses();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    hideModal();
  };

  const onFinish = () => {
    form.validateFields().then(({ recordsToAdd }) => {
      // Transform recordsToAdd data into { key: val } for SDK
      const addresses = _.chain(recordsToAdd)
        .keyBy("key")
        .mapValues("val")
        .value();

      addAddresses(addresses)
        .then(hideModal)
        .catch(console.error);
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
        destroyOnClose={true}
        footer={[
          <Button type="link" onClick={handleCancel} key="cancel">
            Cancel
          </Button>,
          <Button
            type="primary"
            loading={isLoadingAddresses}
            onClick={form.submit}
            key="add"
          >
            Add
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <ErrorAlert error={error} retryFunction={retryFunction} />
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
                            {
                              max: MAX_RECORD_LEN,
                              type: "string",
                              message: `Must be shorter than ${MAX_RECORD_LEN} characters.`,
                            },
                            {
                              validator: (rule, key) => {
                                return addresses?.some((r) => r.key === key)
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
                            {
                              max: MAX_RECORD_LEN,
                              type: "string",
                              message: `Must be shorter than ${MAX_RECORD_LEN} characters.`,
                            },
                            {
                              validator: (rule, val) => {
                                return addresses?.some((r) => r.val === val)
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
                          disabled={isLoadingAddresses}
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
                      disabled={isLoadingAddresses}
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
