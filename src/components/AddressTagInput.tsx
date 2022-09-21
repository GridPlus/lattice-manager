import { TagOutlined } from "@ant-design/icons";
import { Input, Button } from "antd";
import { useState } from "react";
import { useAddressTags } from "../hooks/useAddressTags";
import { sendErrorNotification } from "../util/sendErrorNotification";

export const AddressTagInput = ({ record, address, fetchAddresses }) => {
  const { isLoadingAddressTags, removeAddresses, addAddresses } =
    useAddressTags();
  const [isEditing, setIsEditing] = useState(false);
  const [newTagValue, setNewTagValue] = useState(record?.val ?? "");
  const hasTag = !!newTagValue;

  const onSave = async () => {
    if (record && record.id) {
      await removeAddresses([record]);
    }
    await addAddresses([{ key: address, val: newTagValue }]).then(
      async (newAddrs) => {
        if (newAddrs.length > 0) {
          setIsEditing(false);
          await fetchAddresses();
        }
      }
    );
  };

  const onCancel = async () => {
    setNewTagValue(record?.val ?? "");
    setIsEditing(false);
  };

  return isEditing ? (
    <Input.Group compact>
      <Input
        onChange={(e) => setNewTagValue(e.target.value)}
        disabled={isLoadingAddressTags}
        defaultValue={newTagValue}
        style={{ width: "50%" }}
        allowClear
      />
      <Button type="link" disabled={isLoadingAddressTags} onClick={onSave}>
        Save
      </Button>
      <Button type="text" disabled={isLoadingAddressTags} onClick={onCancel}>
        Cancel
      </Button>
    </Input.Group>
  ) : hasTag ? (
    <Button
      type="link"
      disabled={isLoadingAddressTags}
      onClick={() => setIsEditing(true)}
    >
      {newTagValue}
    </Button>
  ) : (
    <Button
      type="link"
      icon={<TagOutlined />}
      disabled={isLoadingAddressTags}
      onClick={() => setIsEditing(true)}
    >
      +
    </Button>
  );
};
