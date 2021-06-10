import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Card, Col, Icon, Input, Modal, Result, Row, Select, Spin, Table, Tabs, Tag } from 'antd'
import './styles.css'
import { constants, } from '../util/helpers';

// Approximate of seconds each def takes to load. 2 defs load per request
// This is just a guesstimate for display purposes
const SEC_PER_DEF = 1.2; 

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
  // CURVE: {
  //   name: 'Curve Pack',
  //   desc: 'Contract definitions from Curve Finance',
  //   url: 'v2_curve'
  // },
  GNOSIS: {
    name: 'Gnosis Safe Pack',
    desc: 'Contract definitions for the Gnosis Safe application',
    url: 'v2_gnosis'
  },
  MAKER: {
    name: 'Maker Pack',
    desc: 'Contract definitions from Maker',
    url: 'v2_maker'
  },
  OPYN: {
    name: 'Opyn Pack',
    desc: 'Contract definitions from Opyn V3',
    url: 'v2_opyn'
  },
  SUSHISWAP: {
    name: 'SushiSwap Pack',
    desc: 'Contract definitions from SushiSwap',
    url: 'v2_uniswap'
  },
  UNISWAP: {
    name: 'UniSwap Pack',
    desc: 'Contract definitions from Uniswap V2 and V3.',
    url: 'v2_uniswap'
  },
  YEARN: {
    name: 'Yearn Pack',
    desc: 'Contract definitions from Yearn Finance',
    url: 'v2_yearn'
  },
}
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
      fetch(`${constants.GRIDPLUS_CLOUD_API}/contractData/${input}`)
      .then((response) => response.json())
      .then((resp) => {
        if (resp.err) {
          this.setState({ error: resp.err.toString(), ...defaultState })
        } else {
          try {
            const defs = this.TMP_REMOVE_ZERO_LEN_PARAMS(this.props.session.client.parseAbi('etherscan', resp.result, true));
            this.setState({ defs, contract: input, error: null, success: false, loading: false })
          } catch (err) {
            this.setState({ error: err.toString(), ...defaultState })
          }
        }
      })
      .catch((err) => {
        this.setState({ error: err.toString(), ...defaultState })
      });
    }
  }

  loadPackData(key) {
    if (!PACKS[key])
      return;
    const data = {}
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
    // Stop the web worker so it doesn't interfere with this request
    this.props.session.stopWorker();
    // Longer timeout for loading these since requests may get dropped
    this.props.session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT;
    const defs = this.state.customDefs ? this.state.customDefs : this.state.defs;
    this.props.session.addAbiDefs(defs, (err) => {
      // Restart the web worker and reset the timeout
      this.props.session.client.timeout = constants.ASYNC_SDK_TIMEOUT;
      this.props.session.restartWorker();
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
    const cols = [
      {
        title: 'Address',
        dataIndex: 'address',
        key: 'address',
      },
      {
        title: 'App',
        dataIndex: 'app',
        key: 'app',
      },
      {
        title: 'Website',
        dataIndex: 'website',
        key: 'website',
      }
    ];
    const contracts = []
    this.state.packData[this.state.selectedPackKey].metadata.forEach((d) => {
      contracts.push({
        key: d.key,
        address: d.address,
        app: d.app,
        website: d.website
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
          <Table dataSource={contracts}>
            <Table.Column title='Address' dataIndex='address' key='address'
              render={addr => (
                <Tag color="blue">
                  <a href={`https://etherscan.io/address/${addr}`} target={"_blank"}>
                    {`${addr.slice(0, 10)}...${addr.slice(addr.length-8, addr.length)}`}
                  </a>
                </Tag>
              )}
            />
            <Table.Column title='App' dataIndex='app' key='app'/>
            <Table.Column title='Source' dataIndex='website' key='website'
              render={url => (
                <a href={url} target={"_blank"}>Link</a>
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
      <Card>
        <br/>
        <h3>{PACKS[key].name}</h3>
        {this.state.packData[key] ? (
          <p>
            {PACKS[key].desc}
            <br/>
            (
              <a onClick={() => { 
                  this.setState({ selectedPackKey: key, success: false, loading: false }, 
                  this.showModal.bind(this)) }}
              >View Contents</a>
            )
          </p>
        ) : <p>{PACKS[key].desc}</p>}
        <br/>
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
              <Button size="large" type="primary" loading={shouldLoad}
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
          <Button size="large" onClick={() => { this.loadPackData(key) }}>
            Check Latest
          </Button>
        )
        :
        null}
      </Card>
    )
  }

  renderSearchCard() {
    return (
      <div>
        <p>
          You can install contract data from any supported contract which has been verified by&nbsp;
          <a href="https://etherscan.io" target={"_blank"}>Etherscan</a>. Search for a verified smart contract:
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
          <a href="https://etherscan.io/address/0x1494ca1f11d487c2bbe4543e90080aeba4ba3c2b#code" target={"_blank"}>
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
    return (
      <div>
        <p>
          Once loaded, please click View Contents to see the specific contracts being loaded.
        </p>
        {this.renderPack('AAVE')}
        {/* {this.renderPack('CURVE')} */}
        {this.renderPack('MAKER')}
        {this.renderPack('GNOSIS')}
        {this.renderPack('OPYN')}
        {this.renderPack('SUSHISWAP')}
        {this.renderPack('UNISWAP')}
        {this.renderPack('YEARN')}
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
        <p><i>Add smart contract data for more readable transactions on your Lattice1! Note that not all
        functions may be added for a given app.</i></p>
        {this.renderTabs()}
        {f()}
      </div>
    )
  }

  render() {
    const content = (
      <div>
        {this.renderBanner()}
        <Card title={'Contract Data'} bordered={true}>
          {this.renderCard()}
        </Card>
      </div>      
    )
    return this.props.isMobile() ? content : (
      <Row justify={'center'}>
        {this.renderModal()}
        <Col span={14} offset={5} style={{maxWidth: '600px'}}>
          {content}
        </Col>
      </Row>
    )
  }
}

export default EthContracts
