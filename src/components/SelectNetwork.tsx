import { Select } from "antd";
import React from "react";
import { constants } from "../util/helpers";
const { Option } = Select;

export const SelectNetwork = ({ setNetwork }) => {
  return (
    <Select
      style={{ minWidth: "150px", marginRight: "10px" }}
      showSearch
      defaultValue={constants.DEFAULT_CONTRACT_NETWORK}
      optionFilterProp="children"
      onChange={setNetwork}
      filterOption={(input, option) =>
        //@ts-expect-error
        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
    >
      {Object.entries(constants.CONTRACT_NETWORKS).map(([key, value]) => (
        <Option key={key} value={key}>
          {value.label}
        </Option>
      ))}
    </Select>
  );
};
