import { Form, Input, Button } from "antd";
import { useRef, useEffect, useCallback, useState } from "react";
import { useLattice } from "../hooks/useLattice";
import { sendErrorNotification } from "../util/sendErrorNotification";

export const ConnectForm = () => {
  const [form] = Form.useForm();
  const { initializeClient, client, disconnect } = useLattice();
  const [isLoading, setIsLoading] = useState(false);

  const onFinish = (formData) => {

    setIsLoading(true);
    const deviceId = formData.deviceId;
    const password = formData.password;
    return initializeClient(deviceId, password)
      .catch((err) => {
        err.onClick = onFinish({ deviceId, password });
        sendErrorNotification(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const onCancel = useCallback(() => {
    // Cancel the pairing process if it was started (i.e. if the connection was started with
    // a device that could be discovered). Most of the time this will not be possible because
    // the cancel button that triggers this function will not be displayed once the device
    // responds back that it is ready to pair.
    if (client) {
      client.pair("");
    }
    // Reset all SDK-related state variables so the user can re-connect to something else.
    disconnect();
    setIsLoading(false);
  }, [disconnect, client]);

  const input = useRef(null);

  useEffect(() => {
    if (input && input.current) {
      input.current.focus();
    }
  }, [input]);

  return (
    <Form
      form={form}
      name="formData"
      layout="vertical"
      onFinish={onFinish}
      style={{ marginLeft: "7vw", marginRight: "7vw" }}
    >
      <Form.Item
        name="deviceId"
        validateTrigger={["onBlur"]}
        rules={[
          { required: true, message: "Device ID is required." },
          {
            len: 6,
            message: "Device ID must be 6 characters long.",
          },
        ]}
      >
        <Input
          placeholder="Device ID"
          data-testid="connect-deviceId"
          ref={input}
        />
      </Form.Item>
      <Form.Item
        name="password"
        validateTrigger={["onBlur"]}
        rules={[
          { required: true, message: "Password is required." },
          {
            min: 8,
            message: "Password must be at least 8 characters long.",
          },
        ]}
      >
        <Input.Password
          placeholder="Password (create for new logins)"
          data-testid="connect-password"
        />
      </Form.Item>
      <Form.Item style={{ marginTop: "10px" }}>
        <Button
          type="text"
          onClick={onCancel}
          disabled={!isLoading}
          data-testid="connect-cancel"
        >
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          disabled={isLoading}
          data-testid="connect-save"
        >
          Connect
        </Button>
      </Form.Item>
    </Form>
  );
};
