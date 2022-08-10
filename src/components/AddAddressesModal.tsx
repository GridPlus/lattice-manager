import { MinusSquareFilled, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Space } from "antd";
import { useAddresses } from "../hooks/useAddresses";
import { sendErrorNotification } from "../util/sendErrorNotification";

const MAX_RECORD_LEN = 63; // 63 characters max for both key and value
export const keyIsDuplicatedErrorMessage =
  "You already have a tag with this address on your device.";
export const addingKeyIsDuplicatedErrorMessage =
  "You are already trying to add a tag with this address.";
export const valIsDuplicatedErrorMessage =
  "You already have a tag with this name on your device.";
export const addingValIsDuplicatedErrorMessage =
  "You are already trying to add a tag with this name.";

export const AddAddressesModal = ({
  isModalVisible,
  setIsModalVisible,
  initialAddresses,
}) => {
  const { addresses, addAddresses, isLoadingAddresses } = useAddresses();
  const [form] = Form.useForm();

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    hideModal();
  };

  const onFinish = () => {
    form
      .validateFields()
      .then(({ addressesToAdd }) =>
        addAddresses(addressesToAdd).then(hideModal)
      );
  };

  const onFinishFailed = () => {
    sendErrorNotification({
      message: "Unable to submit",
      description: "Please fix errors in form and try again.",
    });
  };

  return (
    <>
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
          <Form
            form={form}
            name="formData"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            autoComplete="off"
            preserve={false}
            layout="vertical"
          >
            <Form.List name="addressesToAdd" initialValue={initialAddresses}>
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
                            {
                              validator: (rule, key) => {
                                const matchingKeys = form
                                  .getFieldsValue()
                                  .addressesToAdd?.filter((r) => r.key === key);
                                return matchingKeys.length > 1
                                  ? Promise.reject(
                                      new Error(
                                        addingKeyIsDuplicatedErrorMessage
                                      )
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
                            disabled={isLoadingAddresses}
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
                            {
                              validator: (rule, val) => {
                                const matchingVals = form
                                  .getFieldsValue()
                                  .addressesToAdd?.filter((r) => r.val === val);
                                return matchingVals.length > 1
                                  ? Promise.reject(
                                      new Error(
                                        addingValIsDuplicatedErrorMessage
                                      )
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
                            disabled={isLoadingAddresses}
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
                          onClick={() => {
                            remove(name);
                            form.validateFields();
                          }}
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
