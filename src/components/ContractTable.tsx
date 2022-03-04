import { LoadingOutlined, SyncOutlined } from "@ant-design/icons";
import { Button, Input, Table } from "antd";
import fuzzysort from "fuzzysort";
import intersectionBy from "lodash/intersectionBy";
import React, { useCallback, useEffect, useState } from "react";
import { useRecords } from "../hooks/useRecords";
import SDKSession from "../sdk/sdkSession";
// import { Record } from "../types/records";
import { constants } from "../util/helpers";
const { CONTRACTS_PER_PAGE } = constants;

/**
 * `ContractTable` is a table of key-value pairs of names and hashes with some management features to
 * make it easier to manage a large amount of contracts.
 *
 * @param `session` - the list of key-value records to display
 */
export const ContractTable = ({ session }: { session: SDKSession }) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contracts, addContracts, removeContracts] = useRecords([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [selectedContracts, setSelectedContracts] = useState([]);

  const fetchRecords = useCallback(async (fetched = 0, retries = 1) => {
    setIsLoading(true);
    const res: any = await session
      .client
      .getAbiRecords({
      n: CONTRACTS_PER_PAGE,
      startIdx: fetched,
      category: ""
    }).catch(err => {
      setIsLoading(false);
      return console.error(err);
    })

    const _contracts = res.records.map(r => ({ id: r.header.name, ...r }))
    addContracts(_contracts);
    const totalFetched = res.numFetched + fetched;
    const remainingToFetch = res.numRemaining;
    if (remainingToFetch > 0) {
      fetchRecords(totalFetched);
    } else {
      setIsLoading(false);
    }
  }, [session, addContracts]);

  useEffect(() => {
    fetchRecords();
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

  const removeSelected = () => {
    setIsLoading(true);
    const sigs = selectedContracts.map((contract) => contract.header.sig);
    session.client.removeAbiRecords({ sigs }, (err, val) => {
      setIsLoading(false);
      if (err) return console.error(err)
      removeContracts(selectedContracts)
  });
  };

  const onChange = ({ target: { value } }) => {
    setInput(value);
    const _contracts = value ? filter(value) : contracts;
    setFilteredContracts(_contracts);
    setSelectedContracts(intersectionBy(selectedContracts, _contracts, "key"));
  };

  const NestedTable = (record) => {
    const columns = [
      { title: "Name", dataIndex: "name", key: "name" },
      { title: "Type", dataIndex: "typeName", key: "typeName" },
    ];

    return (
      <Table
        columns={columns}
        dataSource={record.params}
        pagination={false}
        rowKey={(r) => r.name}
      />
    );
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
          onClick={removeSelected}
          style={{ marginLeft: "1em" }}
        >
          Remove Selected
        </Button>
        <Button
          key="sync-button"
          type="link"
          icon={<SyncOutlined />}
          disabled={isLoading}
          onClick={fetchRecords}
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
          selectedRowKeys: selectedContracts.map((contract) => contract?.header?.name),
        }}
        expandable={{
          expandedRowRender: (record) => NestedTable(record),
          rowExpandable: (record) => record.params.length > 0,
        }}
      >
        <Table.Column
          title="Name"
          dataIndex={["header", "name"]}
          defaultSortOrder="ascend"
          sorter={(a: any, b: any) => a.header.name.localeCompare(b.val)}
        />
        <Table.Column
          title="Sig"
          dataIndex={["header", "sig"]}
          defaultSortOrder="ascend"
          sorter={(a: any, b: any) => a.header.sig.localeCompare(b.val)}
        />
      </Table>
    </div>
  );
};
