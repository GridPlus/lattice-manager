import { SyncOutlined } from "@ant-design/icons";
import { Button, Input, Pagination, Space } from "antd";
import fuzzysort from "fuzzysort";
import chunk from "lodash/chunk";
import React, { useCallback, useEffect, useState } from "react";
import { useContracts } from "../hooks/useContracts";
import { constants } from "../util/helpers";
import { ContractCard } from "./ContractCard";
import { SelectNetwork } from "./SelectNetwork";
const pageSize = constants.CONTRACT_PAGE_SIZE;

export function ContractCardList() {
  const {
    contractPacks,
    isLoading,
    fetchContractPacks,
    resetContractPacksInState,
  } = useContracts();
  const [filteredPacks, setFilteredPacks] = useState([]);
  const [paginatedPacks, setPaginatedPacks] = useState([]);
  const [page, setPage] = useState(1);
  const [network, setNetwork] = useState(constants.DEFAULT_CONTRACT_NETWORK);

  const filterPacksByNetwork = useCallback(
    (packs) => packs.filter((pack) => pack?.metadata.network === network),
    [network]
  );

  useEffect(() => {
    setPage(1);
  }, [filteredPacks]);

  useEffect(() => {
    setFilteredPacks(filterPacksByNetwork(contractPacks));
  }, [network, filterPacksByNetwork, contractPacks]);

  useEffect(() => {
    const pageZeroIndexed = page - 1;
    const chunkedList = chunk(filteredPacks, pageSize)[pageZeroIndexed] ?? [];
    setPaginatedPacks(chunkedList);
  }, [page, filteredPacks]);

  const fuzzyFilterPacksByName = (value) =>
    fuzzysort
      .go(value, contractPacks, {
        key: ["metadata", "name"],
      })
      .map((x) => x.obj);

  const onChange = ({ target: { value } }) => {
    setPage(1);
    const fuzzyFilteredPacks = value
      ? fuzzyFilterPacksByName(value)
      : contractPacks;
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
        <Input.Group
          compact
          style={{
            display: "flex",
            justifyContent: "flex-start",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          <SelectNetwork setNetwork={setNetwork} />
          <Input
            placeholder="Filter"
            onChange={onChange}
            style={{ maxWidth: "80%" }}
          />
          <Button
            key="sync-button"
            type="link"
            icon={<SyncOutlined />}
            disabled={isLoading}
            onClick={() => {
              resetContractPacksInState();
              fetchContractPacks();
            }}
          >
            Sync
          </Button>
        </Input.Group>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            width: "100%",
          }}
        >
          {paginatedPacks.length ? (
            paginatedPacks.map((pack) => (
              <ContractCard pack={pack} key={pack.metadata.name} />
            ))
          ) : (
            <div style={{ marginTop: "20px" }}>
              <p>
                There are not any packs for this network yet.{" "}
                <a href="https://github.com/GridPlus/abi-pack-framework">
                  Submit a pull request.
                </a>
              </p>
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            width: "100%",
          }}
        >
          <Pagination
            style={{ margin: "20px auto 0 auto" }}
            current={page}
            defaultCurrent={1}
            pageSize={pageSize}
            defaultPageSize={pageSize}
            onChange={setPage}
            total={filteredPacks?.length}
          />
        </div>
      </Space>
    </div>
  );
}
