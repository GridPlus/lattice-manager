import { Button, Form, Input } from "antd";
import { useRef, useEffect } from "react";

const SUBMIT_LEN = 8;

export const PairForm = ({ handlePair, onCancel, isLoading }) => {
  const [form] = Form.useForm();

  const input = useRef(null);

  useEffect(() => {
    if (input && input.current) {
      input.current.focus();
    }
  }, [input]);

  const onFinish = (value) => {
    return handlePair(value.pairingCode);
  };

  return (
    <Form
      form={form}
      name="formData"
      onFinish={onFinish}
      style={{ justifyContent: "center" }}
      onValuesChange={(changedValues) => {
        form.setFieldsValue({
          pairingCode: changedValues.pairingCode.toUpperCase(),
        });
      }}
    >
      <Form.Item
        name="pairingCode"
        validateTrigger={["onBlur"]}
        rules={[
          { required: true, message: "Pairing code is required." },
          {
            len: SUBMIT_LEN,
            message: "Pairing code must be 8 characters long.",
          },
        ]}
      >
        <Input
          data-testid="pairing-code-input"
          style={{ fontSize: "5vw" }}
          disabled={isLoading}
          ref={input}
          type="text"
        />
      </Form.Item>
      <Form.Item style={{ marginTop: "10px" }}>
        <Button
          type="text"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="pairing-code-cancel"
        >
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          disabled={isLoading}
          loading={isLoading}
          data-testid="pairing-code-save"
        >
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};
