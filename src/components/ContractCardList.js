import { Input, Pagination, Space } from "antd";
import fuzzysort from "fuzzysort";
import chunk from "lodash/chunk";
import React, { useCallback, useEffect, useState } from "react";
import { constants } from "../util/helpers";
import { ContractCard } from "./ContractCard";

export function ContractCardList({ session }) {
  const [packs, setPacks] = useState([]);
  const [filteredPacks, setFilteredPacks] = useState([]);
  const [paginatedPacks, setPaginatedPacks] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = constants.CONTRACT_PAGE_SIZE;

  const loadPackIndex = useCallback(() => {
    fetch(`${constants.ABI_PACK_URL}/`)
      .then((response) => response.json())
      .then((resp) => {
        setPacks(resp);
      });
  }, []);

  useEffect(() => {
    loadPackIndex();
  }, [loadPackIndex]);

  useEffect(() => {
    setPage(1);
  }, [filteredPacks]);

  useEffect(() => {
    setFilteredPacks(packs);
  }, [packs]);

  useEffect(() => {
    const pageZeroIndexed = page - 1;
    const chunkedList = chunk(filteredPacks, pageSize)[pageZeroIndexed] ?? [];
    setPaginatedPacks(chunkedList);
  }, [page, filteredPacks, pageSize]);

  const fuzzyFilterPacksByName = (value) =>
    fuzzysort
      .go(value, packs, {
        key: "name",
      })
      .map((x) => x.obj);

  const onInput = ({ target: { value } }) => {
    setPage(1);
    const filteredPacks = value ? fuzzyFilterPacksByName(value) : packs;
    setFilteredPacks(filteredPacks);
  };

  return (
    <div>
      <p>
        Once loaded, please click View Contents to see the specific contracts
        being loaded.
      </p>
      <Space direction="vertical">
        <Space size={"large"} wrap align="center">
          <Input.Group compact>
            <Input placeholder="Filter" onInput={onInput} />
          </Input.Group>
          <Pagination
            current={page}
            defaultCurrent={1}
            pageSize={pageSize}
            defaultPageSize={pageSize}
            onChange={setPage}
            total={filteredPacks?.length}
          />
        </Space>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {paginatedPacks.map((pack) => (
            <ContractCard pack={pack} session={session} key={pack.name} />
          ))}
        </div>
      </Space>
    </div>
  );
}
