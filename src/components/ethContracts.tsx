import { QuestionCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Input, Result, Tabs } from "antd";
import "antd/dist/antd.dark.css";
import React from "react";
import { constants } from "../util/helpers";
import { ContractCardList } from "./ContractCardList";
import { PageContent } from "./index";
import { SearchCard } from "./SearchCard";
import "./styles.css";

const defaultState = {
  contract: null,
  defs: [],
  success: false,
  loading: false,
  customDefs: [],
  customDefsStr: "",
};
const TAB_KEYS = {
  PACK: "1",
  SINGLE_ADDR: "2",
  CUSTOM: "3",
};
const manualPlaceholder =
  '[{"inputs":[{"internalType":"address[]","name":"_components","type":"address[]"},{"internalType":"int256[]","name":"_units","type":"int256[]"},{"internalType":"address[]","name":"_modules","type":"address[]"},{"internalType":"contract IController","name":"_controller","type":"address"},{"internalType":"address","name":"_manager","type":"address"},{"internalType":"string","name":"_name","type":"string"},';

class EthContracts extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      contract: null,
      defs: [],
      success: false,
      loading: false,
      tab: TAB_KEYS.PATH,
      selectedPackKey: "AAVE",
    };

    this.addDefs = this.addDefs.bind(this);
    this.onSmartContractAddress = this.onSmartContractAddress.bind(this);
    this.renderSuccessAlert = this.renderSuccessAlert.bind(this);
    this.renderPackCard = this.renderPackCard.bind(this);
    this.renderCustomCard = this.renderCustomCard.bind(this);
    this.renderSearchCard = this.renderSearchCard.bind(this);
  }

  onTabChange(key) {
    this.setState({ tab: key, success: false, error: null, loading: false });
  }

  onSmartContractAddress(input) {
    if (
      input.slice(0, 2) !== "0x" ||
      false === /^[0-9a-fA-F]+$/.test(input.slice(2)) ||
      input.length !== 42
    ) {
      // Not a valid address
      this.setState({
        error: "Invalid Ethereum contract address",
        ...defaultState,
      });
    } else {
      this.setState({ loading: true });
      setTimeout(() => {
        fetch(`${constants.GET_ABI_URL}${input}`)
          .then((response) => response.json())
          .then((resp) => {
            // Map confusing error strings to better descriptions
            if (resp.err === "Contract source code not verified") {
              resp.err =
                "Contract source code not published to Etherscan or not verified. Cannot determine data.";
            }
            if (resp.err) {
              this.setState({ error: resp.err.toString(), ...defaultState });
            } else {
              try {
                const result = JSON.parse(resp.result);
                const defs = this.TMP_REMOVE_ZERO_LEN_PARAMS(
                  this.props.session.client.parseAbi("etherscan", result, true)
                );
                this.setState({
                  defs,
                  contract: input,
                  error: null,
                  success: false,
                  loading: false,
                });
              } catch (err) {
                this.setState({ error: err.toString(), ...defaultState });
              }
            }
          })
          .catch((err) => {
            this.setState({ error: err.toString(), ...defaultState });
          });
      }, 5000); // 1 request per 5 seconds with no API key provided
    }
  }

  addDefs(skipErrors = false, defsToAdd = null) {
    this.setState({ loading: true, error: null });
    // Longer timeout for loading these since requests may get dropped
    this.props.session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT;
    const defs = this.state.customDefs
      ? this.state.customDefs
      : this.state.defs;
    this.props.session.addAbiDefs(defs, (err) => {
      // Reset timeout to default
      this.props.session.client.timeout = constants.ASYNC_SDK_TIMEOUT;
      if (err) {
        this.setState({
          error: err.toString(),
          loading: false,
          success: false,
        });
      } else {
        this.setState({ error: null, loading: false, success: true });
      }
    });
  }

  renderBanner() {
    if (this.state.error) {
      return (
        <Alert
          message="Error"
          description={this.state.error}
          type="error"
          closable
          onClose={() => {
            this.setState({ error: null, ...defaultState });
          }}
        />
      );
    }
  }

  renderSuccessAlert(buttonTxt = null) {
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
                    this.setState({ loading: false, success: false });
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

  renderTabs() {
    const isLoadingDefs = this.state.success || this.state.loading;
    if (isLoadingDefs) return;
    return (
      <Tabs activeKey={this.state.tab} onChange={this.onTabChange.bind(this)}>
        <Tabs.TabPane tab="Packs" key={TAB_KEYS.PACK} />
        <Tabs.TabPane tab="Address" key={TAB_KEYS.SINGLE_ADDR} />
        <Tabs.TabPane tab="Manual" key={TAB_KEYS.CUSTOM} />
      </Tabs>
    );
  }

  renderSearchCard() {
    return <SearchCard session={this.props.session} />;
  }

  // TEMPORARY FUNCTION TO REMOVE FUNCTIONS WITH ZERO LENGTH PARAM NAMES
  // SEE: https://github.com/GridPlus/gridplus-sdk/issues/154
  TMP_REMOVE_ZERO_LEN_PARAMS(defs) {
    const newDefs = [];
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

  renderCustomCard() {
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
          value={this.state.customDefsStr}
          onChange={(x) => {
            const customDefsStr = x.target.value;
            try {
              const parsed = JSON.parse(customDefsStr);
              const customDefs = this.TMP_REMOVE_ZERO_LEN_PARAMS(
                this.props.session.client.parseAbi("etherscan", parsed, true)
              );
              if (customDefs.length > 0)
                this.setState({ customDefs, success: false, customDefsStr });
            } catch (err) {
              console.warn(`Failed to scan for ABI definitions ${err.message}`);
              this.setState({ customDefs: [], success: false, customDefsStr });
            }
          }}
        />
        <br />
        <br />
        {this.state.customDefs && this.state.customDefs.length > 0 ? (
          <div>
            {this.state.success ? (
              <div>
                <center>
                  {this.renderSuccessAlert()}
                  <Button
                    type="primary"
                    onClick={() => {
                      this.setState({
                        customDefs: [],
                        customDefsStr: "",
                        success: false,
                        loading: false,
                      });
                    }}
                  >
                    Add More
                  </Button>
                </center>
              </div>
            ) : (
              <div>
                <p>
                  Found <b>{this.state.customDefs.length}</b> functions that can
                  be added.
                  <br />
                  <i>
                    Note: functions with unsupported types are not included.
                  </i>
                </p>
                <Button
                  type="primary"
                  onClick={() => {
                    this.addDefs(true);
                  }}
                  loading={this.state.loading}
                >
                  {this.state.loading ? "Installing..." : "Install"}
                </Button>
                {this.state.success ? (
                  <div>
                    <br />
                    {this.renderSuccessAlert()}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  renderPackCard() {
    return <ContractCardList session={this.props.session} />;
  }

  renderCard() {
    let f;
    switch (this.state.tab) {
      case TAB_KEYS.CUSTOM:
        f = this.renderCustomCard;
        break;
      case TAB_KEYS.SINGLE_ADDR:
        f = this.renderSearchCard;
        break;
      case TAB_KEYS.PACK:
      default:
        f = this.renderPackCard;
        break;
    }
    return (
      <div>
        {this.renderTabs()}
        {f()}
      </div>
    );
  }

  render() {
    const content = (
      <div>
        {this.renderBanner()}
        <Card
          title={
            <div>
              <h3>
                Load Contract Data&nbsp;&nbsp;
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
          {this.renderCard()}
        </Card>
      </div>
    );
    return <PageContent content={content} isMobile={this.props.isMobile} />;
  }
}

export default EthContracts;
