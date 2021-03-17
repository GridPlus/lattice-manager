import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Card, Col, Icon, Input, Modal, Row, Select, Spin, Table, Tabs, Tag } from 'antd'
import './styles.css'
import { constants, } from '../util/helpers';

// Approximate of seconds each def takes to load. 2 defs load per request
// This is just a guesstimate for display purposes
const SEC_PER_DEF = 1.2; 

const defaultState = {
  contract: null, defs: [], success: false, loading: false,
}
const TAB_KEYS = {
  PACK: '1',
  SINGLE_ADDR: '2',
}
const PACKS = {
  AAVE: {
    name: 'AAVE Pack',
    desc: 'Contract definitions from AAVE',
    url: 'aave_pack'
  },
  CURVE: {
    name: 'Curve Pack',
    desc: 'Contract definitions from Curve Finance',
    url: 'curve_pack'
  },
  MAKER: {
    name: 'Maker Pack',
    desc: 'Contract definitions from Maker',
    url: 'maker_pack'
  },
  OPYN: {
    name: 'Opyn Pack',
    desc: 'Contract definitions from Opyn V3',
    url: 'opyn_pack'
  },
  UNISWAP: {
    name: 'Uniswap Pack',
    desc: 'Contract definitions from Uniswap V2. Note that Uniswap V2 router definitions are preloaded on your Lattice.',
    url: 'uniswap_pack'
  },
  YEARN: {
    name: 'Yearn Pack',
    desc: 'Contract definitions from Yearn Finance',
    url: 'yearn_pack'
  },
}


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

    this.addContract = this.addContract.bind(this);
    this.onSmartContractAddress = this.onSmartContractAddress.bind(this);
    this.loadPackData = this.loadPackData.bind(this);
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
            const defs = this.props.session.client.parseAbi('etherscan', resp.result);
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

  addContract() {
    this.setState({ loading: true, error: null })
    // Stop the web worker so it doesn't interfere with this request
    this.props.session.stopWorker();
    // Longer timeout for loading these since requests may get dropped
    this.props.session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT; 
    this.props.session.addAbiDefs(this.state.defs, (err) => {
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

  renderSuccessAlert() {
    return (<Alert 
      type="success"
      message="Success"
      description="Successfully sent data to Lattice. You must 
                  confirm all functions on your Lattice for them to be saved."
    />)
  }

  renderTabs() {
    return (
      <Tabs defaultActiveKey={TAB_KEYS.PACK} onChange={this.onTabChange.bind(this)}>
        <Tabs.TabPane tab="Packs" key={TAB_KEYS.PACK}/>
        <Tabs.TabPane tab="Search" key={TAB_KEYS.SINGLE_ADDR}/>
      </Tabs>
    )
  }

  renderPack(key) {
    if (!PACKS[key])
      return;
    let shouldLoad = this.state.loading && this.state.selectedPackKey === key;
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
            {(this.state.success && this.state.selectedPackKey === key)? (
              <div>
                {this.renderSuccessAlert()}
              </div>
            ) : (
              <Button size="large" type="primary" loading={shouldLoad}
                      onClick={() => {
                        this.setState({ defs: this.state.packData[key].defs, selectedPackKey: key, success: false, loading: false }, 
                        this.addContract)}}
              >
                {shouldLoad ? 
                  "Installing..." :
                  `Install (~${Math.ceil((this.state.packData[key].defs.length * SEC_PER_DEF) / 60) } min)`
                }
              </Button>
            )}
          </div>
        ) : (
          <Button size="large" onClick={() => { this.loadPackData(key) }}>
            Check Latest
          </Button>
        )}
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
                <Button type="primary" onClick={this.addContract} loading={this.state.loading}>
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

  renderPackCard() {
    return (
      <div>
        {this.renderPack('AAVE')}
        {this.renderPack('CURVE')}
        {this.renderPack('MAKER')}
        {this.renderPack('OPYN')}
        {this.renderPack('UNISWAP')}
        {this.renderPack('YEARN')}
      </div>
    )
  }

  renderCard() {
    return (
      <div>
        <p><i>Add smart contract data for more readable transactions on your Lattice1! Note that not all
        functions may be added for a given app. Please View Contents to see the specific contracts being loaded.</i></p>
        {this.renderTabs()}
        {this.state.tab === TAB_KEYS.SINGLE_ADDR ? this.renderSearchCard() : this.renderPackCard()}
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
