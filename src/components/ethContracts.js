import React from 'react';
import 'antd/dist/antd.dark.css'
import { Alert, Button, Card, Col, Input, Modal, Result, Row, Table, Tabs, Tag } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons';
import { PageContent } from './index'
import './styles.css'
import { constants } from '../util/helpers';
const MAX_SPAN_W = 24;
const defaultState = {
  contract: null, defs: [], success: false, loading: false, customDefs: [], customDefsStr: '',
}
const TAB_KEYS = {
  PACK: '1',
  SINGLE_ADDR: '2',
  CUSTOM: '3',
}
const PACKS = {
  AAVE: {
    name: 'AAVE Pack',
    desc: 'Contract definitions from AAVE',
    url: 'v2_aave'
  },
  ALCHEMIX: {
    name: 'Alchemix Pack',
    desc: 'Contract defintions from Alchemix',
    url: 'v2_alchemix'
  },
  BALANCER: {
    name: 'Balancer Pack',
    desc: 'Contract definitions from Balancer V2. NOTE: Some unsupported definitions were skipped.',
    url: 'v2_balancer',
    website: 'https://docs.balancer.fi/v/v1/smart-contracts/addresses',
  },  
  CRYPTEX: {
    name: 'Cryptex Pack',
    desc: 'Contract definitions from Cryptex',
    url: 'v2_cryptex'
  },
  CURVE: {
    name: 'Curve Pack',
    desc: 'Contract definitions from Curve Finance',
    url: 'v2_curve',
    website: 'https://curve.readthedocs.io/ref-addresses.html',
  },
  GNOSIS: {
    name: 'Gnosis Safe Pack',
    desc: 'Contract definitions for the Gnosis Safe application',
    url: 'v2_gnosis',
    website: 'https://github.com/gnosis/safe-contracts/blob/v1.3.0/CHANGELOG.md',
  },
  MAKER: {
    name: 'Maker Pack',
    desc: 'Contract definitions from Maker',
    url: 'v2_maker'
  },
  OPYN: {
    name: 'Opyn Pack',
    desc: 'Contract definitions from Opyn V3',
    url: 'v2_opyn',
    website: 'https://opyn.gitbook.io/opyn/contracts/addressbook-1',
  },
  SUSHISWAP: {
    name: 'SushiSwap Pack',
    desc: 'Contract definitions from SushiSwap',
    url: 'v2_uniswap',
    app: 'SushiSwap',
    website: 'https://dev.sushi.com/sushiswap/contracts', 
  },
  UNISWAP: {
    name: 'UniSwap Pack',
    desc: 'Contract definitions from Uniswap V2 and V3.',
    url: 'v2_uniswap',
    website: 'https://github.com/Uniswap/v3-periphery/blob/main/deploys.md',
  },
  YEARN: {
    name: 'Yearn Pack',
    desc: 'Contract definitions from Yearn Finance',
    url: 'v2_yearn'
  },
}
const PACKS_PER_ROW = 3;
const manualPlaceholder = '[{"inputs":[{"internalType":"address[]","name":"_components","type":"address[]"},{"internalType":"int256[]","name":"_units","type":"int256[]"},{"internalType":"address[]","name":"_modules","type":"address[]"},{"internalType":"contract IController","name":"_controller","type":"address"},{"internalType":"address","name":"_manager","type":"address"},{"internalType":"string","name":"_name","type":"string"},'


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
      packData: {},
      selectedPackKey: 'AAVE',
      modal: false
    }

    this.addDefs = this.addDefs.bind(this);
    this.onSmartContractAddress = this.onSmartContractAddress.bind(this);
    this.loadPackData = this.loadPackData.bind(this);
    this.renderSuccessAlert = this.renderSuccessAlert.bind(this);
    this.renderPackCard = this.renderPackCard.bind(this);
    this.renderCustomCard = this.renderCustomCard.bind(this);
    this.renderSearchCard = this.renderSearchCard.bind(this);
  }

  showModal() {
    this.setState({ modal: true });
  }

  hideModal() {
    this.setState({ modal: false });
  }

  onTabChange(key) {
    this.setState({ tab: key, success: false, error: null, loading: false })
  }

  onSmartContractAddress(input) {
    if (input.slice(0, 2) !== '0x' || false === (/^[0-9a-fA-F]+$/).test(input.slice(2)) || input.length !== 42) {
      // Not a valid address
      this.setState({ error: 'Invalid Ethereum contract address', ...defaultState });
    } else {
      this.setState({ loading: true })
      setTimeout(() => {
        fetch(`${constants.GET_ABI_URL}${input}`)
        .then((response) => response.json())
        .then((resp) => {
          // Map confusing error strings to better descriptions
          if (resp.err === 'Contract source code not verified') {
            resp.err = 'Contract source code not published to Etherscan or not verified. Cannot determine data.'
          }
          if (resp.err) {
            this.setState({ error: resp.err.toString(), ...defaultState })
          } else {
            try {
              const result = JSON.parse(resp.result);
              const defs = this.TMP_REMOVE_ZERO_LEN_PARAMS(this.props.session.client.parseAbi('etherscan', result, true));
              this.setState({ defs, contract: input, error: null, success: false, loading: false })
            } catch (err) {
              this.setState({ error: err.toString(), ...defaultState })
            }
          }
        })
        .catch((err) => {
          this.setState({ error: err.toString(), ...defaultState })
        });
      }, 5000); // 1 request per 5 seconds with no API key provided
    }
  }

  loadPackData(key) {
    if (!PACKS[key])
      return;
    fetch(`${constants.AWS_BUCKET_URL}/${PACKS[key].url}.json`)
    .then((response) => response.json())
    .then((resp) => {
      if (resp.err)
        throw new Error(resp.err)
      const newPackData = JSON.parse(JSON.stringify(this.state.packData))
      newPackData[key] = resp
      this.setState({ packData: newPackData })
    })
    .catch((err) => {
      this.setState({ error: err.toString(), ...defaultState })
    })
  }

  addDefs(skipErrors=false) {
    this.setState({ loading: true, error: null })
    // Longer timeout for loading these since requests may get dropped
    this.props.session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT;
    const defs = this.state.customDefs ? this.state.customDefs : this.state.defs;
    this.props.session.addAbiDefs(defs, (err) => {
      // Reset timeout to default
      this.props.session.client.timeout = constants.ASYNC_SDK_TIMEOUT;
      if (err) {
        this.setState({ error: err.toString(), loading: false, success: false })
      } else {
        this.setState({ error: null, loading: false, success: true })
      }
    })
  }

  renderModal() {
    if (!this.state.packData[this.state.selectedPackKey])
      return
    const contracts = []
    this.state.packData[this.state.selectedPackKey].metadata.forEach((d) => {
      // Adding these hacky references since the main source of data is in an S3 bucket
      // TODO: Overhaul how these packs are loaded/stored/sourced... eventually
      const localPack = PACKS[this.state.selectedPackKey];
      const website = localPack.website ? localPack.website : d.website;
      const app = localPack.app ? localPack.app : d.app;
      contracts.push({
        key: d.key,
        address: d.address,
        app,
        website
      })
    })
    return (
      <div>
        <Modal
          title={PACKS[this.state.selectedPackKey].name}
          visible={this.state.modal}
          onOk={this.hideModal.bind(this)}
          onCancel={this.hideModal.bind(this)}
        >
          <Table dataSource={contracts} key="main-table">
            <Table.Column title='Address' dataIndex='address' key='address'
              render={addr => (
                <Tag color="blue" key={`tag-${addr}`}>
                  <a className="lattice-a"
                      href={`https://etherscan.io/address/${addr}`} 
                      target={"_blank"}
                      rel={"noopener noreferrer"}
                      key={`a-${addr}`}
                  >
                    {`${addr.slice(0, 10)}...${addr.slice(addr.length-8, addr.length)}`}
                  </a>
                </Tag>
              )}
            />
            <Table.Column title='App' dataIndex='app' key='app'/>
            <Table.Column title='Source' dataIndex='website' key='website'
              render={url => (
                <a  className="lattice-a" 
                    href={url} 
                    target={"_blank"} 
                    rel={"noopener noreferrer"}
                    key={`a-${url}`}
                >
                  Link
                </a>
              )}
            />
          </Table>
        </Modal>
      </div>
    );
  }


  renderBanner() {
    if (this.state.error) {
      return (
        <Alert
          message="Error"
          description={this.state.error}
          type="error"
          closable
          onClose={() => { this.setState({ error: null, ...defaultState })}}
        />
      )
    }
  }

  renderSuccessAlert(buttonTxt=null) {
    return (
      <Result
        status="success"
        title="Success"
        subTitle="Successfully sent data to your Lattice. You must confirm all
                  functions on your Lattice for them to be saved.
                  Please confirm or reject the definitions before continuing."
        extra={buttonTxt !== null ? [
          <Button type="primary"
                  key="buttonTxt" 
                  onClick={() => { this.setState({ loading: false, success: false, })}}>
            {buttonTxt}
          </Button>
        ] : null}
      />
    )
  }

  renderTabs() {
    const isLoadingDefs = (this.state.success || this.state.loading)
    if (isLoadingDefs)
      return;
    return (
      <Tabs activeKey={this.state.tab} onChange={this.onTabChange.bind(this)}>
        <Tabs.TabPane tab="Packs" key={TAB_KEYS.PACK}/>
        <Tabs.TabPane tab="Address" key={TAB_KEYS.SINGLE_ADDR}/>
        <Tabs.TabPane tab="Manual" key={TAB_KEYS.CUSTOM}/>
      </Tabs>
    )
  }

  renderPack(key) {
    if (!PACKS[key])
      return;
    const isLoadingDefs = (this.state.success || this.state.loading)
    const onCurrentKey = this.state.selectedPackKey === key
    let shouldLoad = this.state.loading && onCurrentKey
    if (isLoadingDefs && !onCurrentKey)
      return;
    return (
      <Card bordered={true} key={`card-${key}`}>
        <center>
        <p className='lattice-h3'>{PACKS[key].name}</p>
        {this.state.packData[key] ? (
          <Button type="link" onClick={() => {
              this.setState({ selectedPackKey: key, success: false, loading: false }, 
              this.showModal.bind(this)) }}
          >View Contents</Button>
        ) : null}
        {this.state.packData[key] ? (
          <div>
            {(this.state.success && onCurrentKey) 
            ? 
            (
              <div>
                {this.renderSuccessAlert('Continue')}
              </div>
            ) 
            : 
            (isLoadingDefs && this.state.selectedPackKey !== key)
            ?
            null
            :
            (
              <Button type="primary" loading={shouldLoad}
                      onClick={() => {
                        this.setState({ defs: this.state.packData[key].defs, selectedPackKey: key, success: false, loading: false }, 
                        this.addDefs)}}
              >
                {shouldLoad ? 
                  "Installing..." :
                  "Install"
                }
              </Button>
            )}
          </div>
        ) 
        :
        isLoadingDefs === false
        ?
        (
          <Button type='link' onClick={() => { this.loadPackData(key) }}>
            Check Latest
          </Button>
        )
        :
        null}
      </center>
      </Card>
    )
  }

  renderSearchCard() {
    return (
      <div>
        <p>
          You can install contract data from any supported contract which has been verified by&nbsp;
          <a  className='lattice-a' 
              href="https://etherscan.io" 
              target='_blank'
              rel='noopener noreferrer'
          >
            Etherscan
          </a>. Search for a verified smart contract:
        </p>
        <Input.Search
          placeholder="Contract address"
          allowClear
          enterButton
          loading={this.state.loading && !this.state.contract}
          onSearch={this.onSmartContractAddress}
        />
        <br/>
        <br/>
        {this.state.contract ? (
          <div>
            {this.state.success ? (
              <div>{this.renderSuccessAlert()}</div>
            ) : (
              <Card title={this.state.contract}>
                <p>Found <b>{this.state.defs.length}</b> functions to add from this contract.</p>
                <Button type="primary" onClick={this.addDefs} loading={this.state.loading}>
                  {this.state.loading ? "Installing..." : "Install"}
                </Button>
                {this.state.success ? (
                  <div>
                    <br/>
                    {this.renderSuccessAlert()}
                  </div>
                ) : null}
              </Card>
            )}
          </div>
        ): null}
      </div>
    )
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
          if (param.name.length === 0)
            shouldAdd = false;
        })
      }
      if (shouldAdd === true)
        newDefs.push(def);
    })
    return newDefs;
  }

  renderCustomCard() {
    return (
      <div>
        <p>
          Here you can add ABI definitions manually. Please stick with
          Etherscan formatting (i.e. the contents of "Contract ABI" in the Contract tab -&nbsp;
          <a  className="lattice-a"
              href="https://etherscan.io/address/0x1494ca1f11d487c2bbe4543e90080aeba4ba3c2b#code" 
              target="_blank"
              rel="noopener noreferrer"
          >
          example</a>
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
              const customDefs = this.TMP_REMOVE_ZERO_LEN_PARAMS(this.props.session.client.parseAbi('etherscan', parsed, true));
              if (customDefs.length > 0)
                this.setState({ customDefs, success: false, customDefsStr })
            } catch (err) {
              console.warn(`Failed to scan for ABI definitions ${err.message}`)
              this.setState({ customDefs: [], success: false, customDefsStr })
            }
          }}
        />
        <br/>
        <br/>
        {this.state.customDefs && this.state.customDefs.length > 0 ? (
          <div>
            {this.state.success ? (
              <div>
                <center>
                  {this.renderSuccessAlert()}
                  <Button type="primary" onClick={() => { 
                    this.setState({ customDefs: [], customDefsStr: '', success: false, loading: false })
                  }}>
                    Add More
                  </Button>
                </center>
              </div>

            ) : (
              <div>
                <p>
                  Found <b>{this.state.customDefs.length}</b> functions that can be added.
                  <br/>
                  <i>Note: functions with unsupported types are not included.</i>
                </p>
                <Button type="primary" onClick={() => {this.addDefs(true)}} loading={this.state.loading}>
                  {this.state.loading ? "Installing..." : "Install"}
                </Button>
                {this.state.success ? (
                  <div>
                    <br/>
                    {this.renderSuccessAlert()}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ): null}
      </div>
    )
  }

  renderPackCard() {
    const numRows = Object.keys(PACKS).length / PACKS_PER_ROW;
    const rows = []
    for (let i = 0; i < numRows; i++) {
      const cards = [];
      for (let j = 0; j < PACKS_PER_ROW; j++) {
        cards.push(
          <Col span={Math.floor(MAX_SPAN_W / PACKS_PER_ROW)} key={`col_${i}_${j}`}>
            {this.renderPack(Object.keys(PACKS)[(i * PACKS_PER_ROW) + j])}
          </Col>
        )        
      }
      rows.push(
        <Row justify="center" key={`row-${i}`}>{cards}</Row>
      )
    }
    return (
      <div>
        <p>
          Once loaded, please click View Contents to see the specific contracts being loaded.
        </p>
        {rows}
      </div>
    )
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
    )
  }

  render() {
    const content = (
      <div>
        {this.renderModal()}
        {this.renderBanner()}
        <Card title={<div>
          <h3>Load Contract Data&nbsp;&nbsp;
            <a  className='lattice-a'
                href={constants.CONTRACTS_HELP_LINK}
                target='_blank'
                rel='noopener noreferrer'
            >
              <QuestionCircleOutlined/>
            </a>
          </h3>
        </div>} bordered={true}>
          {this.renderCard()}
        </Card>
      </div>      
    )
    return (
      <PageContent content={content} isMobile={this.props.isMobile}/>
    )
  }
}

export default EthContracts
