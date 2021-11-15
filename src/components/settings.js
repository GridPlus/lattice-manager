import React from 'react';
import 'antd/dist/antd.dark.css'
import { Button, Card, Checkbox, Collapse, Dropdown, Input, Menu, Row, Table } from 'antd'
import { WarningOutlined } from '@ant-design/icons';
import { PageContent } from './index'
import './styles.css'
import { constants, getLocalStorageSettings, getBtcPurpose } from '../util/helpers';

// TMP: BITCOIN CONSTANTS
// We will be deprecating the wallet functionality so I'm going to put
// these here for now
const BTC_PURPOSE_LEGACY = constants.HARDENED_OFFSET + 44;
const BTC_PURPOSE_LEGACY_STR = 'Legacy (prefix=1)';
const BTC_PURPOSE_WRAPPED_SEGWIT = constants.HARDENED_OFFSET + 49;
const BTC_PURPOSE_WRAPPED_SEGWIT_STR = 'Wrapped Segwit (prefix=3)';
const BTC_PURPOSE_SEGWIT = constants.HARDENED_OFFSET + 84;
const BTC_PURPOSE_SEGWIT_STR = 'Segwit (prefix=bc1)';


class Settings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      settings: {
        customEndpoint: '',
        keyringLogins: {},
        btcPurpose: constants.DEFAULT_BTC_PURPOSE,
      },
      local: {},
    }
    this.getBtcPurposeName = this.getBtcPurposeName.bind(this)
    this.getSettings();
  }

  componentDidMount() {
    this.getSettings();
  }

  getSettings() {
    const settings = getLocalStorageSettings();
    this.setState({ settings })
  }

  submit() {
    // Save the settings to local storage
    const storage = JSON.parse(window.localStorage.getItem(constants.ROOT_STORE) || '{}');
    storage.settings = this.state.settings
    window.localStorage.setItem(constants.ROOT_STORE, JSON.stringify(storage));
    // Reload the page for the changes to take effect
    window.location.reload();
  }

  updateUseCustomEndpoint(value) {
    const settings = JSON.parse(JSON.stringify(this.state.settings));
    const local = this.state.local;
    local.useCustomEndpoint = value;
    if (value !== true) {
      // Reset the custom endpoint if this value is false
      settings.customEndpoint = '';
    }
    this.setState({ settings, local });
  }

  updateCustomEndpoint(evt) {
    const settings = JSON.parse(JSON.stringify(this.state.settings));
    settings.customEndpoint = evt.target.value;
    this.setState({ settings });
  }

  updateUseDevLattice(evt) {
    const settings = JSON.parse(JSON.stringify(this.state.settings));
    settings.devLattice = evt.target.checked
    this.setState({ settings })
  }

  removeKeyring(login) {
    const settings = this.state.settings || {};
    delete settings.keyringLogins[login.name]
    this.setState({ settings })
  }

  resetState() {
    window.localStorage.removeItem(constants.ROOT_STORE);
    window.location.reload();
  }

  renderCustomEndpointSetting() {
    const { customEndpoint='' } = this.state.settings;
    return (
      <Card>
        <h3>Connection Endpoint:</h3>
        <p>
          If you wish to route messages and connections through your own endpoint, you may specify it here. Otherwise leave blank.&nbsp;
          See <a href="https://github.com/GridPlus/lattice-connect" target="_blank" rel="noopener noreferrer">this</a> for more information.
        </p>
        <div>
          <Input  placeholder="host:port" 
                  defaultValue={customEndpoint} 
                  onChange={this.updateCustomEndpoint.bind(this)}/>
        </div>
        <br/>
      </Card>
    )
  }

  handleChangeBitcoinVersionSetting(evt) {
    const settings = JSON.parse(JSON.stringify(this.state.settings));
    settings.btcPurpose = parseInt(evt.key);
    this.setState({ settings })
  }

  getBtcPurposeName() {
    const purpose = this.state.settings.btcPurpose ?
                    this.state.settings.btcPurpose :
                    getBtcPurpose();
    if (purpose === BTC_PURPOSE_LEGACY) {
      return BTC_PURPOSE_LEGACY_STR
    } else if (purpose === BTC_PURPOSE_WRAPPED_SEGWIT) {
      return BTC_PURPOSE_WRAPPED_SEGWIT_STR
    } else if (purpose === BTC_PURPOSE_SEGWIT) {
      return BTC_PURPOSE_SEGWIT_STR;
    } else {
      return 'Error finding BTC version'
    }
  }

  renderBitcoinVersionSetting() {
    // NOTE: Firmware does not yet support segwit addresses
    // TODO: Uncomment this when firmware is updated
    const menu = (
      <Menu onClick={this.handleChangeBitcoinVersionSetting.bind(this)}>
        {/* <Menu.Item key={BTC_PURPOSE_SEGWIT}>
          {BTC_PURPOSE_SEGWIT_STR}
        </Menu.Item> */}
        <Menu.Item key={BTC_PURPOSE_WRAPPED_SEGWIT}>
          {BTC_PURPOSE_WRAPPED_SEGWIT_STR}
        </Menu.Item>
        {/* Don't uncomment this until segwit support is released
        <Menu.Item key={BTC_PURPOSE_LEGACY}>
          {BTC_PURPOSE_LEGACY_STR}
        </Menu.Item> */}
      </Menu>
    )
    return (
      <Card>
        <h4>Bitcoin Address Type</h4>
        <Dropdown overlay={menu}>
          <Button>{this.getBtcPurposeName()}</Button>
        </Dropdown>
      </Card>
    )
  }

  renderDevLatticeSetting() {
    const { devLattice } = this.state.settings;
    return (
      <Card>
        <h4>Debug Settings</h4>
        <Row justify='center' style={{ margin: '10px 0 0 0'}}>
          <Button type="link" onClick={this.resetState} className='warning-a'>
          <WarningOutlined/>&nbsp;Reset App State
        </Button>
        </Row>
        <Row justify='center' style={{ margin: '20px 0 0 0'}}>
          <Checkbox onChange={this.updateUseDevLattice.bind(this)} checked={devLattice}>
            Using Dev Lattice
          </Checkbox>
        </Row>
      </Card>
    )
  }

  renderKeyringsSetting() {
    const { keyringLogins = {} } = this.state.settings;
    const cols = [
      { 
        title: 'App Name', 
        dataIndex: 'name', 
        key: 'name'
      }, 
      { 
        title: 'Action', 
        dataIndex: 'action', 
        key: 'action',
        render: (text, record) => (
          <Button type="link" onClick={() => {this.removeKeyring(record)}}>Forget</Button>
        ) 
      }
    ]
    const data = [];
    Object.keys(keyringLogins)
      .sort((a, b) => { return a.toLowerCase() > b.toLowerCase() ? 1 : -1 })
      .forEach((name) => { data.push({ name }) })
    return (
      <Card>
        <h3>Third Party Connections</h3>
        <p>
          Manage connections to your Lattice. Third party apps should be listed here if they are connected to your device.
        </p>
        <Collapse>
          <Collapse.Panel header={`Connections List (${data.length})`}>
            <Table dataSource={data} columns={cols}/>
          </Collapse.Panel>
        </Collapse>
      </Card>
    )
  }

  renderCard() {
    return (
      <div>
        {this.renderKeyringsSetting()}
        {this.renderCustomEndpointSetting()}
        {this.renderBitcoinVersionSetting()}
        {this.renderDevLatticeSetting()}
        <br/>
        <Button type="primary" onClick={this.submit.bind(this)}>
          Update and Reload
        </Button>
      </div>
    )
  }

  render() {
    const content = (
      <center>
        <Card title={'Settings'} bordered={true}>
          {this.renderCard()}
        </Card>
      </center>      
    )
    if (this.props.inModal)
      return (<center>{this.renderCard()}</center>);
    return (
      <PageContent content={content} isMobile={this.props.isMobile}/>
    )
  }
}

export default Settings