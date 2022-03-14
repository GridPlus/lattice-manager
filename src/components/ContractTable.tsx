import { LoadingOutlined, SyncOutlined } from "@ant-design/icons";
import { Button, Input, Table } from "antd";
import fuzzysort from "fuzzysort";
import intersectionBy from "lodash/intersectionBy";
import React, { useCallback, useEffect, useState } from "react";
import { useContracts } from "../hooks/useContracts";
import { constants } from "../util/helpers";
const { CONTRACTS_PER_PAGE } = constants;

/**
 * `ContractTable` is a table of ABI contract data with some management features to
 * make it easier to manage a large amount of contracts.
 *
 * @param `session` - the active SDK session
 */
export const ContractTable = () => {
  const [input, setInput] = useState("");
  const { isLoading, contracts, fetchContracts, removeContracts } =
    useContracts();
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [selectedContracts, setSelectedContracts] = useState([]);

  useEffect(() => {
    if (contracts.length === 0) {
      fetchContracts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setInput("");
    setFilteredContracts(contracts);
  }, [contracts, isLoading]);

  const filter = useCallback(
    (value) =>
      fuzzysort
        .go(value, contracts, { keys: ["header.name", "header.sig"] })
        .map((x) => x.obj),
    [contracts]
  );

  const handleOnSelect = (_, __, _selectedContracts) => {
    setSelectedContracts(_selectedContracts);
  };

  const handleOnSelectAll = (_, _selectedContracts) => {
    setSelectedContracts(_selectedContracts);
  };

  const onChange = ({ target: { value } }) => {
    setInput(value);
    const _contracts = value ? filter(value) : contracts;
    setFilteredContracts(_contracts);
    setSelectedContracts(intersectionBy(selectedContracts, _contracts, "key"));
  };

  return (
    <div>
      <div style={{ display: "flex" }}>
        <Input
          value={input}
          placeholder="Filter"
          disabled={isLoading}
          onChange={onChange}
          style={{ marginBottom: "1em" }}
          allowClear
        />
        <Button
          danger
          type="text"
          disabled={selectedContracts.length === 0}
          onClick={() => removeContracts(selectedContracts)}
          style={{ marginLeft: "1em" }}
        >
          Remove Selected
        </Button>
        <Button
          key="sync-button"
          type="link"
          icon={<SyncOutlined />}
          disabled={isLoading}
          onClick={fetchContracts}
        >
          Sync
        </Button>
      </div>
      <Table
        dataSource={filteredContracts}
        tableLayout="fixed"
        rowKey={(r) => r.header.name}
        loading={{
          spinning: isLoading,
          tip: "Loading...",
          indicator: <LoadingOutlined />,
        }}
        pagination={{
          position: ["bottomCenter"],
          pageSize: CONTRACTS_PER_PAGE,
          defaultCurrent: 1,
          showSizeChanger: false,
        }}
        rowSelection={{
          type: "checkbox",
          onSelect: handleOnSelect,
          onSelectAll: handleOnSelectAll,
          selectedRowKeys: selectedContracts.map(
            (contract) => contract?.header?.name
          ),
        }}
        expandable={{
          expandedRowRender: (record) => (
            <Table
              columns={[
                { title: "Parameter Name", dataIndex: "name", key: "name" },
                { title: "Type", dataIndex: "typeName", key: "typeName" },
              ]}
              dataSource={record.params}
              pagination={false}
              rowKey={(r) => r.name}
            />
          ),
          rowExpandable: (record) => record.params.length > 0,
        }}
      >
        <Table.Column
          title="Function Name"
          dataIndex={["header", "name"]}
          defaultSortOrder="ascend"
          sorter={(a: any, b: any) => a.header.name.localeCompare(b.val)}
        />
        <Table.Column
          title="Identifier"
          dataIndex={["header", "sig"]}
          defaultSortOrder="ascend"
          sorter={(a: any, b: any) => a.header.sig.localeCompare(b.val)}
        />
      </Table>
    </div>
  );
};
