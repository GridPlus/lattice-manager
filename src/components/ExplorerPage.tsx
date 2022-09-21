import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { PublicKey } from "@solana/web3.js";
import { Button, Card, Checkbox, InputNumber, Select, Table } from "antd";
import { useContext, useEffect, useState } from "react";
import { useAddressTags } from "../hooks/useAddressTags";
import { AppContext } from "../store/AppContext";
import { abbreviateHash } from "../util/addresses";
import { constants } from "../util/helpers";
import { sendErrorNotification } from "../util/sendErrorNotification";
import { AddAddressesModal } from "./AddAddressesModal";
import { PageContent } from "./formatting";
import { AddressTagInput } from "./AddressTagInput";
import { UpdateAddressesModal } from "./UpdateAddressesModal";
const { ADDRESSES_PER_PAGE } = constants;
const { Option } = Select;
const CHAINS = {
  BITCOIN_LEGACY: "Bitcoin (Legacy)",
  BITCOIN_SEGWIT: "Bitcoin (Segwit)",
  BITCOIN_WRAPPED_SEGWIT: "Bitcoin (Wrapped Segwit)",
  ETHEREUM: "Ethereum",
  SOLANA: "Solana",
  CUSTOM: "Custom",
};

// m / purpose' / coin_type' / account' / change / index

const ExplorerPage = () => {
  const { addressTags, isLoadingAddressTags } = useAddressTags();
  const { session } = useContext(AppContext);
  const [addresses, setAddresses] = useState([]);
  const [purpose, setPurpose] = useState(44);
  const [isPurposeHardened, setIsPurposeHardened] = useState(true);
  const [coinType, setCoinType] = useState(60);
  const [isCoinTypeHardened, setIsCoinTypeHardened] = useState(true);
  const [account, setAccount] = useState(0);
  const [isAccountHardened, setIsAccountHardened] = useState(true);
  const [change, setChange] = useState(0);
  const [isChangeHardened, setIsChangeHardened] = useState(false);
  const [index, setIndex] = useState(0);
  const [isIndexHardened, setIsIndexHardened] = useState(false);
  const [selectedChain, setSelectedChain] = useState(CHAINS.ETHEREUM);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddAddressesModalVisible, setIsAddAddressesModalVisible] =
    useState(false);

  const getInitialAddresses = () => {
    return addresses.map((addr) => {
      if (addr.record && addr.record.id) {
        return { key: addr.record.key, val: addr.record.val };
      }
      return { key: addr.address, val: "" };
    });
  };
  const showAddAddressesModal = () => {
    setIsAddAddressesModalVisible(true);
  };

  const getPath = () => {
    const HARDENED_OFFSET = 0x80000000;
    const purposePath = isPurposeHardened ? HARDENED_OFFSET + purpose : purpose;
    const coinTypePath = isCoinTypeHardened
      ? HARDENED_OFFSET + coinType
      : coinType;
    const accountPath = isAccountHardened ? HARDENED_OFFSET + account : account;
    const changePath = isChangeHardened ? HARDENED_OFFSET + change : change;
    const indexPath = isIndexHardened ? HARDENED_OFFSET + index : index;
    const path = [
      purposePath,
      coinTypePath,
      accountPath,
      changePath,
      indexPath,
    ].filter((x) => x !== null);
    return path;
  };

  const getAddrs = () => {
    setIsLoading(true);
    const flag = selectedChain === CHAINS.SOLANA ? 4 : undefined;
    session.client
      .getAddresses({
        startPath: getPath(),
        n: ADDRESSES_PER_PAGE,
        flag,
      })
      .then((addrs) => {
        setAddresses(
          addrs.map((addr) => ({
            address:
              selectedChain === CHAINS.SOLANA
                ? new PublicKey(addr).toString()
                : addr,
            record: addressTags.find((t) => t.key === addr),
          }))
        );
      })
      .catch(sendErrorNotification)
      .finally(() => setIsLoading(false));
  };

  const addrsColumns = [
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      render: (text) => <p>{abbreviateHash(text)}</p>,
    },
    {
      title: "Tag",
      dataIndex: "record",
      key: "tag",
      render: (record, { address }) => (
        <AddressTagInput
          record={record}
          address={address}
          fetchAddresses={getAddrs}
        />
      ),
    },
  ];

  const onCheck = (e, checkedSetter) => {
    checkedSetter(e.target.checked);
  };

  useEffect(() => {
    getAddrs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain]);
  // m / purpose' / coin_type' / account' / change / index

  const onSelect = (option) => {
    if (option === CHAINS.ETHEREUM) {
      setPurpose(44);
      setIsPurposeHardened(true);
      setCoinType(60);
      setIsCoinTypeHardened(true);
      setAccount(0);
      setIsAccountHardened(true);
      setChange(0);
      setIsChangeHardened(false);
      setIndex(0);
      setIsIndexHardened(false);
      setSelectedChain(option);
    }
    if (option === CHAINS.BITCOIN_LEGACY) {
      setPurpose(44);
      setIsPurposeHardened(true);
      setCoinType(0);
      setIsCoinTypeHardened(true);
      setAccount(0);
      setIsAccountHardened(true);
      setChange(0);
      setIsChangeHardened(false);
      setIndex(0);
      setIsIndexHardened(false);
      setSelectedChain(option);
    }
    if (option === CHAINS.BITCOIN_SEGWIT) {
      setPurpose(84);
      setIsPurposeHardened(true);
      setCoinType(0);
      setIsCoinTypeHardened(true);
      setAccount(0);
      setIsAccountHardened(true);
      setChange(0);
      setIsChangeHardened(false);
      setIndex(0);
      setIsIndexHardened(false);
      setSelectedChain(option);
    }
    if (option === CHAINS.BITCOIN_WRAPPED_SEGWIT) {
      setPurpose(49);
      setIsPurposeHardened(true);
      setCoinType(0);
      setIsCoinTypeHardened(true);
      setAccount(0);
      setIsAccountHardened(true);
      setChange(0);
      setIsChangeHardened(false);
      setIndex(0);
      setIsIndexHardened(false);
      setSelectedChain(option);
    }
    if (option === CHAINS.SOLANA) {
      setPurpose(44);
      setIsPurposeHardened(true);
      setCoinType(501);
      setIsCoinTypeHardened(true);
      setAccount(0);
      setIsAccountHardened(true);
      setChange(null);
      setIsChangeHardened(false);
      setIndex(null);
      setIsIndexHardened(false);
      setSelectedChain(option);
    }
    if (option === CHAINS.CUSTOM) {
      setPurpose(0);
      setIsPurposeHardened(false);
      setCoinType(0);
      setIsCoinTypeHardened(false);
      setAccount(0);
      setIsAccountHardened(false);
      setChange(0);
      setIsChangeHardened(false);
      setIndex(0);
      setIsIndexHardened(false);
      setAddresses([]);
    }
  };

  return (
    <PageContent>
      <Card title={"Wallet Explorer"} bordered>
        <div>
          <h3>Standard Derivation Paths</h3>
          <div style={{ paddingBottom: "25px" }}>
            <Select
              defaultValue={CHAINS.ETHEREUM}
              onChange={onSelect}
              style={{ width: "100%" }}
              disabled={isLoading}
            >
              <Option value={CHAINS.ETHEREUM}>Ethereum</Option>
              <Option value={CHAINS.BITCOIN_LEGACY}>Bitcoin (Legacy)</Option>
              <Option value={CHAINS.BITCOIN_SEGWIT}>Bitcoin (Segwit)</Option>
              <Option value={CHAINS.BITCOIN_WRAPPED_SEGWIT}>
                Bitcoin (Wrapped Segwit)
              </Option>
              <Option value={CHAINS.SOLANA}>Solana</Option>
              <Option value={CHAINS.CUSTOM}>Custom</Option>
            </Select>
          </div>
          <h3>Starting Derivation Path</h3>
          <div
            style={{
              paddingBottom: "25px",
              display: "flex",
              gap: "10px",
              justifyContent: "stretch",
              flexWrap: "wrap",
            }}
          >
            <InputNumber
              disabled={isLoading}
              controls={true}
              addonBefore={
                <Checkbox
                  disabled={isLoading}
                  defaultChecked={true}
                  onChange={(e) => onCheck(e, setIsPurposeHardened)}
                />
              }
              addonAfter={`${isPurposeHardened ? "'" : ""}`}
              onChange={(e) => setPurpose(e)}
              defaultValue={purpose}
              value={purpose}
              style={{ width: "125px" }}
            />
            <InputNumber
              disabled={isLoading}
              controls={true}
              addonBefore={
                <Checkbox
                  disabled={isLoading}
                  defaultChecked={true}
                  onChange={(e) => onCheck(e, setIsCoinTypeHardened)}
                />
              }
              onChange={(e) => setCoinType(e)}
              addonAfter={`${isCoinTypeHardened ? "'" : ""}`}
              defaultValue={coinType}
              value={coinType}
              style={{ width: "125px" }}
            />
            <InputNumber
              disabled={isLoading}
              controls={true}
              addonBefore={
                <Checkbox
                  disabled={isLoading}
                  defaultChecked={true}
                  onChange={(e) => onCheck(e, setIsAccountHardened)}
                />
              }
              onChange={(e) => setAccount(e)}
              addonAfter={`${isAccountHardened ? "'" : ""}`}
              defaultValue={account}
              value={account}
              style={{ width: "125px" }}
            />
            <InputNumber
              disabled={isLoading}
              controls={true}
              addonBefore={
                <Checkbox
                  disabled={isLoading}
                  onChange={(e) => onCheck(e, setIsChangeHardened)}
                />
              }
              onChange={(e) => setChange(e)}
              addonAfter={`${isChangeHardened ? "'" : ""}`}
              defaultValue={change}
              value={change}
              style={{ width: "125px" }}
            />
            <InputNumber
              disabled={isLoading}
              controls={true}
              addonBefore={
                <Checkbox
                  disabled={isLoading}
                  onChange={(e) => onCheck(e, setIsIndexHardened)}
                />
              }
              onChange={(e) => setIndex(e)}
              addonAfter={`${isIndexHardened ? "'" : ""}`}
              defaultValue={index}
              value={index}
              style={{ width: "125px" }}
            />
            <Button
              onClick={() => getAddrs()}
              disabled={isLoading}
              type="primary"
            >
              Sync
            </Button>
            {/*  TODO: Handle modifying all addresses 
            <Button
              type="ghost"
              onClick={showAddAddressesModal}
              disabled={isLoading || isLoadingAddressTags}
            >
              Edit All
            </Button> 
            */}
          </div>
          <Table
            dataSource={addresses}
            columns={addrsColumns}
            tableLayout="fixed"
            rowKey={(record) => record.address}
            loading={{
              spinning: isLoading,
              tip: "Loading...",
              indicator: <LoadingOutlined />,
            }}
            pagination={false}
            // pagination={{
            //   position: ["bottomCenter"],
            //   pageSize: ADDRESSES_PER_PAGE,
            //   defaultCurrent: 1,
            //   showSizeChanger: false,
            // }}
          />
        </div>
        <UpdateAddressesModal
          isModalVisible={isAddAddressesModalVisible}
          setIsModalVisible={setIsAddAddressesModalVisible}
          initialAddresses={getInitialAddresses()}
        />
      </Card>
    </PageContent>
  );
};

export default ExplorerPage;
