import { Input, Pagination, Space } from "antd";
import fuzzysort from "fuzzysort";
import chunk from "lodash/chunk";
import React, { useCallback, useEffect, useState } from "react";
import { constants } from "../util/helpers";
import { ContractCard } from "./ContractCard";
import { SelectNetwork } from "./SelectNetwork";
const pageSize = constants.CONTRACT_PAGE_SIZE;

export function ContractCardList({ session }) {
  const [packs, setPacks] = useState([]);
  const [filteredPacks, setFilteredPacks] = useState([]);
  const [paginatedPacks, setPaginatedPacks] = useState([]);
  const [page, setPage] = useState(1);
  const [network, setNetwork] = useState(constants.DEFAULT_CONTRACT_NETWORK);

  const filterPacksByNetwork = useCallback(
    (packs) => packs.filter((pack) => pack?.network === network),
    [network]
  );

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
    setFilteredPacks(filterPacksByNetwork(packs));
  }, [packs, network, filterPacksByNetwork]);

  useEffect(() => {
    const pageZeroIndexed = page - 1;
    const chunkedList = chunk(filteredPacks, pageSize)[pageZeroIndexed] ?? [];
    setPaginatedPacks(chunkedList);
  }, [page, filteredPacks]);

  const fuzzyFilterPacksByName = (value) =>
    fuzzysort
      .go(value, packs, {
        key: "name",
      })
      .map((x) => x.obj);

  const onInput = ({ target: { value } }) => {
    setPage(1);
    const fuzzyFilteredPacks = value ? fuzzyFilterPacksByName(value) : packs;
    setFilteredPacks(filterPacksByNetwork(fuzzyFilteredPacks));
  };

  return (
    <div>
      <p>
        Once loaded, please click View Contents to see the specific contracts
        being loaded.
      </p>
      <p>
        Don't see what you're looking for?{" "}
        <a href="https://github.com/GridPlus/abi-pack-framework">
          Submit a pull request.
        </a>
      </p>
      <Space
        direction="vertical"
        style={{
          width: "100%",
        }}
      >
        <Input.Group compact>
          <SelectNetwork setNetwork={setNetwork} />
          <Input
            placeholder="Filter"
            onInput={onInput}
            style={{ maxWidth: "50%" }}
          />
          <Pagination
            style={{ marginLeft: "10px" }}
            current={page}
            defaultCurrent={1}
            pageSize={pageSize}
            defaultPageSize={pageSize}
            onChange={setPage}
            total={filteredPacks?.length}
          />
        </Input.Group>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            width: "100%",
          }}
        >
          {paginatedPacks.map((pack) => (
            <ContractCard pack={pack} session={session} key={pack.name} />
          ))}
        </div>
      </Space>
    </div>
  );
}
