import { QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Card, Input, Result, Tabs } from "antd";
import "antd/dist/antd.dark.css";
import React, { useContext, useState } from "react";
import { AppContext } from "../store/AppContext";
import { useFeature } from "../hooks/useFeature";
import { constants } from "../util/helpers";
import { ContractCardList } from "./ContractCardList";
import { ContractTable } from "./ContractTable";
import { PageContent } from "./index";
import { SearchCard } from "./SearchCard";
import "./styles.css";
import { ErrorAlert } from "./ErrorAlert";
import { useContracts } from "../hooks/useContracts";

const TAB_KEYS = {
  PACK: "1",
  SINGLE_ADDR: "2",
  CUSTOM: "3",
  ADDED: "4",
};
const manualPlaceholder =
  '[{"inputs":[{"internalType":"address[]","name":"_components","type":"address[]"},{"internalType":"int256[]","name":"_units","type":"int256[]"},{"internalType":"address[]","name":"_modules","type":"address[]"},{"internalType":"contract IController","name":"_controller","type":"address"},{"internalType":"address","name":"_manager","type":"address"},{"internalType":"string","name":"_name","type":"string"},';

const EthContracts = () => {
  const { session } = useContext(AppContext);
  const { error, setError, retryFunction, addContracts, isLoading, } = useContracts();
  const [defs, setDefs] = useState([]);
  const [customDefs, setCustomDefs] = useState([]);
  const [customDefsStr, setCustomDefsStr] = useState("");
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState(TAB_KEYS.PACK);
  const { CAN_VIEW_CONTRACTS } = useFeature();

  function setDefaultState() {
    setDefs([]);
    setSuccess(false);
    setCustomDefs([]);
    setCustomDefsStr("");
  }

  function onTabChange(key) {
    setTab(key);
    setSuccess(false);
    setError(null);
  }

  function addDefs() {
    const _defs = customDefs ? customDefs : defs;
    addContracts(_defs)
      .then(() => {
        setSuccess(true)
      })
      .catch(() => {
        setSuccess(false)
      })
  }

  function renderSuccessAlert(buttonTxt = null) {
    return (
      <Result
        status="success"
        title="Success"
        subTitle="Successfully sent data to your Lattice. You must confirm all
                  functions on your Lattice for them to be saved.
                  Please confirm or reject the definitions before continuing."
        extra={
          buttonTxt !== null
            ? [
                <Button
                  type="primary"
                  key="buttonTxt"
                  onClick={() => {
                    setSuccess(false);
                  }}
                >
                  {buttonTxt}
                </Button>,
              ]
            : null
        }
      />
    );
  }

  function renderTabs() {
    return (
      <Tabs activeKey={tab} onChange={onTabChange.bind(this)}>
        <Tabs.TabPane tab="Add Packs" key={TAB_KEYS.PACK} />
        <Tabs.TabPane tab="Add By Address" key={TAB_KEYS.SINGLE_ADDR} />
        <Tabs.TabPane tab="Add Manually" key={TAB_KEYS.CUSTOM} />
        {CAN_VIEW_CONTRACTS && (
          <Tabs.TabPane tab="View Added" key={TAB_KEYS.ADDED} />
        )}
      </Tabs>
    );
  }

  // TEMPORARY FUNCTION TO REMOVE FUNCTIONS WITH ZERO LENGTH PARAM NAMES
  // SEE: https://github.com/GridPlus/gridplus-sdk/issues/154
  function TMP_REMOVE_ZERO_LEN_PARAMS(defs) {
    const newDefs: any[] = [];
    defs.forEach((def) => {
      let shouldAdd = true;
      if (def.name.length === 0) {
        shouldAdd = false;
      } else {
        def.params.forEach((param) => {
          if (param.name.length === 0) shouldAdd = false;
        });
      }
      if (shouldAdd === true) newDefs.push(def);
    });
    return newDefs;
  }

  function renderCustomCard() {
    return (
      <div>
        <p>
          Here you can add ABI definitions manually. Please stick with Etherscan
          formatting (i.e. the contents of "Contract ABI" in the Contract tab
          -&nbsp;
          <a
            className="lattice-a"
            href="https://etherscan.io/address/0x1494ca1f11d487c2bbe4543e90080aeba4ba3c2b#code"
            target="_blank"
            rel="noopener noreferrer"
          >
            example
          </a>
          ).
        </p>
        <Input.TextArea
          placeholder={`${manualPlaceholder}...`}
          autoSize={{ minRows: 5, maxRows: 10 }}
          value={customDefsStr}
          onChange={(x) => {
            const customDefsStr = x.target.value;
            try {
              const parsed = JSON.parse(customDefsStr);
              const customDefs = TMP_REMOVE_ZERO_LEN_PARAMS(
                session.client.parseAbi("etherscan", parsed, true)
              );
              if (customDefs.length > 0) {
                setCustomDefs(customDefs);
                setSuccess(false);
                setCustomDefsStr(customDefsStr);
              }
            } catch (err) {
              console.warn(`Failed to scan for ABI definitions ${err.message}`);
              setCustomDefs([]);
              setSuccess(false);
              setCustomDefsStr(customDefsStr);
            }
          }}
        />
        <br />
        <br />
        {customDefs && customDefs.length > 0 ? (
          <div>
            {success ? (
              <div>
                <center>
                  {renderSuccessAlert()}
                  <Button
                    type="primary"
                    onClick={() => {
                      setCustomDefs([]);
                      setCustomDefsStr("");
                      setSuccess(false);
                    }}
                  >
                    Add More
                  </Button>
                </center>
              </div>
            ) : (
              <div>
                <p>
                  Found <b>{customDefs.length}</b> functions that can be added.
                  <br />
                  <i>
                    Note: functions with unsupported types are not included.
                  </i>
                </p>
                <Button
                  type="primary"
                  onClick={() => {
                    addDefs();
                  }}
                  loading={isLoading}
                >
                  {isLoading ? "Installing..." : "Install"}
                </Button>
                {success ? (
                  <div>
                    <br />
                    {renderSuccessAlert()}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  function renderCard() {
    const f = () => {
      switch (tab) {
        case TAB_KEYS.CUSTOM:
          return renderCustomCard();
        case TAB_KEYS.SINGLE_ADDR:
          return <SearchCard />;
        case TAB_KEYS.ADDED:
          return <ContractTable />;
        case TAB_KEYS.PACK:
        default:
          return <ContractCardList />;
      }
    };
    return (
      <div>
        {renderTabs()}
        {f()}
      </div>
    );
  }

  function render() {
    const content = (
      <div>
        <ErrorAlert
          error={error}
          retryFunction={() => {
            retryFunction();
            setDefaultState();
          }}
        />
        <Card
          title={
            <div>
              <h3>
                Contract Data&nbsp;&nbsp;
                <a
                  className="lattice-a"
                  href={constants.CONTRACTS_HELP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <QuestionCircleOutlined />
                </a>
              </h3>
            </div>
          }
          bordered={true}
        >
          {renderCard()}
        </Card>
      </div>
    );
    return <PageContent content={content} />;
  }
  return render();
};

export default EthContracts;
