import { EditOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import React, { useState } from "react";

/**
 * Allows the user to edit text inline by rendering
 * the string as a button that converts the string
 * into a text field when clicked by the user.
 */
export const NameEditor = ({
  name,
  setName,
}: {
  name: string;
  setName: (name: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [form] = Form.useForm();

  const onCancel = () => {
    form.resetFields();
    setIsEditing(false);
  };

  const onFinish = (value) => {
    setIsEditing(false);
    setName(value.name);
  };

  return isEditing ? (
    <Form
      form={form}
      name="formData"
      layout="inline"
      onFinish={onFinish}
      style={{ justifyContent: "center" }}
    >
      <Form.Item
        name="name"
        initialValue={name}
        rules={[
          { required: true, message: "Name is required." },
          { min: 4, message: "Name must be at least 4 characters long." },
        ]}
      >
        <Input data-testid={`${name}-input`} />
      </Form.Item>
      <Form.Item>
        <Button type="text" onClick={onCancel} data-testid={`${name}-cancel`}>
          Cancel
        </Button>
        <Button type="ghost" htmlType="submit" data-testid={`${name}-save`}>
          Save
        </Button>
      </Form.Item>
    </Form>
  ) : (
    <Button
      type="text"
      size="large"
      icon={isHovered ? <EditOutlined /> : null}
      style={{ fontSize: "24px" }}
      data-testid={`${name}-edit`}
      onClick={() => setIsEditing(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {name}
    </Button>
  );
};
