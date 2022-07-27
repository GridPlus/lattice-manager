import { LoadingOutlined } from "@ant-design/icons";
import { Button, Input, Table } from "antd";
import fuzzysort from "fuzzysort";
import intersectionBy from "lodash/intersectionBy";
import React, { useCallback, useEffect, useState } from "react";
import { useAddresses } from "../hooks/useAddresses";
import { constants } from "../util/helpers";
import { abbreviateHash } from "../util/addresses";
const { ADDRESSES_PER_PAGE } = constants;

/**
 * `AddressTable` is a table of key-value pairs of names and hashes with some management features to
 * make it easier to manage a large amount of addresses.
 */
export const AddressTable = () => {
  const { isLoadingAddresses, addresses, removeAddresses } = useAddresses();
  const [input, setInput] = useState("");
  const [filteredAddresses, setFilteredAddresses] = useState([]);
  const [selectedAddresses, setSelectedAddresses] = useState([]);

  useEffect(() => {
    setInput("");
    setFilteredAddresses(addresses);
  }, [addresses, isLoadingAddresses]);

  const filter = useCallback(
    (value) =>
      fuzzysort
        .go(value, addresses, { keys: ["key", "val"] })
        .map((x) => x.obj),
    [addresses]
  );

  const handleOnSelect = (_, __, _selectedAddresses) => {
    setSelectedAddresses(_selectedAddresses);
  };

  const handleOnSelectAll = (_, _selectedAddresses) => {
    setSelectedAddresses(_selectedAddresses);
  };

  const onChange = ({ target: { value } }) => {
    setInput(value);
    const _addresses = value ? filter(value) : addresses;
    setFilteredAddresses(_addresses);
    setSelectedAddresses(intersectionBy(selectedAddresses, _addresses, "key"));
  };

  return (
    <div>
      <div style={{ display: "flex" }}>
        <Input
          value={input}
          placeholder="Filter"
          disabled={isLoadingAddresses}
          onChange={onChange}
          style={{ marginBottom: "1em" }}
          allowClear
        />
        <Button
          danger
          type="text"
          disabled={selectedAddresses.length === 0}
          onClick={() =>
            removeAddresses(selectedAddresses).then(() => {
              setSelectedAddresses([]);
            })
          }
          style={{ marginLeft: "1em" }}
        >
          Remove Selected
        </Button>
      </div>
      <Table
        dataSource={filteredAddresses}
        tableLayout="fixed"
        loading={{
          spinning: isLoadingAddresses,
          tip: "Loading...",
          indicator: <LoadingOutlined />,
        }}
        pagination={{
          position: ["bottomCenter"],
          pageSize: ADDRESSES_PER_PAGE,
          defaultCurrent: 1,
          showSizeChanger: false,
        }}
        rowSelection={{
          type: "checkbox",
          onSelect: handleOnSelect,
          onSelectAll: handleOnSelectAll,
          selectedRowKeys: selectedAddresses.map((x) => x.key),
        }}
      >
        <Table.Column
          title="Name"
          dataIndex="val"
          key="val"
          defaultSortOrder="ascend"
          sorter={(a: any, b: any) => a.val.localeCompare(b.val)}
        />
        <Table.Column
          title="Address"
          dataIndex="key"
          key="key"
          render={(key) => abbreviateHash(key)}
          sorter={(a: any, b: any) => a.key.localeCompare(b.key)}
        />
      </Table>
    </div>
  );
};
