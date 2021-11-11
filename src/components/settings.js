import React from 'react';
import 'antd/dist/antd.css'
import { Button, Card, Checkbox, Col, Collapse, Dropdown, Input, Menu, Row, Switch, Table } from 'antd'
import './styles.css'
import { constants, getLocalStorageSettings } from '../util/helpers';
const settingsPath = `${constants.ROOT_STORE}/settings`

// TMP: BITCOIN CONSTANTS
// We will be deprecating the wallet functionality so I'm going to put
// these here for now
const BTC_PURPOSE_LEGACY = 44;
const BTC_PURPOSE_LEGACY_STR = 'Legacy';
const BTC_PURPOSE_WRAPPED_SEGWIT = 49;
const BTC_PURPOSE_WRAPPED_SEGWIT_STR = 'Wrapped Segwit';
const BTC_PURPOSE_SEGWIT = 84;
const BTC_PURPOSE_SEGWIT_STR = 'Segwit';


class Settings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      settings: {
        customEndpoint: '',
        keyringLogins: {},
        btcPurpose: BTC_PURPOSE_WRAPPED_SEGWIT,
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

  renderCustomEndpointSetting() {
    const { customEndpoint='' } = this.state.settings;
    let { useCustomEndpoint=false } = this.state.local;
    if (customEndpoint !== '')
      useCustomEndpoint = true;
    return (
      <Card>
        <h3>(Advanced) Connection Endpoint:</h3>
        <p><i>
          If you wish to route messages and connections through your own endpoint, you may specify it here. 
          See <a href="https://github.com/GridPlus/lattice-connect" target="_blank">this</a> for more information.
        </i></p>
        <p><b>Use Custom:</b></p>
        <Switch checked={useCustomEndpoint} onChange={this.updateUseCustomEndpoint.bind(this)}/>
        {useCustomEndpoint === true ? (
          <div>
            <br/>
            <p><b>Custom Endpoint:</b></p>
            <Input  placeholder="host:port" 
                    defaultValue={customEndpoint} 
                    onChange={this.updateCustomEndpoint.bind(this)}/>
          </div>
        ) : null}
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
    if (this.state.settings.btcPurpose === BTC_PURPOSE_LEGACY) {
      return BTC_PURPOSE_LEGACY_STR
    } else if (this.state.settings.btcPurpose === BTC_PURPOSE_WRAPPED_SEGWIT) {
      return BTC_PURPOSE_WRAPPED_SEGWIT_STR
    } else {
      return BTC_PURPOSE_SEGWIT_STR;
    }
  }

  renderBitcoinVersionSetting() {
    const menu = (
      <Menu onClick={this.handleChangeBitcoinVersionSetting.bind(this)}>
        <Menu.Item key={BTC_PURPOSE_SEGWIT}>
          {BTC_PURPOSE_SEGWIT_STR}
        </Menu.Item>
        <Menu.Item key={BTC_PURPOSE_WRAPPED_SEGWIT}>
          {BTC_PURPOSE_WRAPPED_SEGWIT_STR}
        </Menu.Item>
        <Menu.Item key={BTC_PURPOSE_LEGACY}>
          {BTC_PURPOSE_LEGACY_STR}
        </Menu.Item>
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
        <Checkbox onChange={this.updateUseDevLattice.bind(this)} checked={devLattice}>
          Using Dev Lattice
        </Checkbox>
        <br/>
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
        <p><i>
          You may forget a third party here and next time you use the app you will be prompted to create a new one.
        </i></p>
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
        {this.renderDevLatticeSetting()}
        {this.renderBitcoinVersionSetting()}
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
    return (this.props.isMobile() || this.props.inModal) ? content : (
      <Row justify={'center'}>
        <Col span={14} offset={5} style={{maxWidth: '600px'}}>
          {content}
        </Col>
      </Row>
    )
  }
}

export default Settings