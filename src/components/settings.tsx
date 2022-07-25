import React from 'react';
import 'antd/dist/antd.dark.css'
import { Button, Card, Checkbox, Col, Collapse, Input, Radio, Row, Space, Table } from 'antd'
import { WarningOutlined } from '@ant-design/icons';
import { PageContent } from './index'
import './styles.css'
import omit from "lodash/omit"
import { constants, getBtcPurpose } from '../util/helpers';
import localStorage from '../util/localStorage';

class Settings extends React.Component<any, any> {
  constructor(props) {
    super(props);

    this.state = {
      settings: localStorage.getSettings(),
      keyring: localStorage.getKeyring(),
    }
    this.getBtcPurposeName = this.getBtcPurposeName.bind(this)
  }


  submit() {
    // Save the settings to localStorage
    localStorage.setSettings(this.state.settings)
    // Reload the page for the changes to take effect
    window.location.reload();
  }

  updateUseCustomEndpoint(value) {
    const settings = this.state.settings;
    if (value !== true) {
      // Reset the custom endpoint if this value is false
      settings.customEndpoint = '';
    }
    this.setState({ settings });
  }

  updateCustomEndpoint(evt) {
    const settings = this.state.settings;
    settings.customEndpoint = evt.target.value;
    this.setState({ settings });
  }

  updateUseDevLattice(evt) {
    const settings = this.state.settings;
    settings.devLattice = evt.target.checked
    this.setState({ settings }, this.submit)
  }

  removeKeyring ({ name }) {
    localStorage.removeKeyringItem(name)
    this.setState({ keyring: omit(this.state.keyring, name) })
  }

  resetState() {
    localStorage.removeRootStore()
    window.location.reload();
  }

  renderCustomEndpointSetting() {
    const { customEndpoint='' } = this.state.settings;
    return (
      <Card>
        <Row justify='center'>
          <Col span={20}>
            <h3>Connection Endpoint:</h3>
            <p>
              If you wish to route messages and connections through your own endpoint, you may specify it here.&nbsp;
              Otherwise leave blank.&nbsp; See&nbsp;
              <a  href="https://github.com/GridPlus/lattice-connect"
                  className='lattice-a'
                  target="_blank" 
                  rel="noopener noreferrer">
                this
              </a> for more information.
            </p>
            <div>
              <Input  placeholder="host:port" 
                      defaultValue={customEndpoint} 
                      onChange={this.updateCustomEndpoint.bind(this)}/>
            </div>
          </Col>
        </Row>
      </Card>
    )
  }

  handleChangeBitcoinVersionSetting(evt) {
    const settings = this.state.settings;
    settings.btcPurpose = parseInt(evt.target.value);
    this.setState({ settings }, this.submit)
  }

  getBtcPurposeName() {
    const purpose = this.state.settings.btcPurpose ?
                    this.state.settings.btcPurpose :
                    getBtcPurpose();
    if (purpose === constants.BTC_PURPOSE_NONE) {
      return constants.BTC_PURPOSE_NONE_STR;
    } else if (purpose === constants.BTC_PURPOSE_LEGACY) {
      return constants.BTC_PURPOSE_LEGACY_STR
    } else if (purpose === constants.BTC_PURPOSE_WRAPPED_SEGWIT) {
      return constants.BTC_PURPOSE_WRAPPED_SEGWIT_STR
    } else if (purpose === constants.BTC_PURPOSE_SEGWIT) {
      return constants.BTC_PURPOSE_SEGWIT_STR;
    } else {
      return 'Error finding BTC version'
    }
  }

  renderBitcoinVersionSetting() {
    // NOTE: Firmware does not yet support segwit addresses
    // TODO: Uncomment this when firmware is updated
    const purpose = getBtcPurpose() || constants.BTC_PURPOSE_NONE;
    return (
      <Card>
        <h4>Bitcoin Wallet Type</h4>
        <Radio.Group  onChange={this.handleChangeBitcoinVersionSetting.bind(this)}
                      defaultValue={purpose}>
          <Space direction="vertical">
            <Radio value={constants.BTC_PURPOSE_NONE}>
              Hide BTC Wallet
            </Radio>
            <Radio value={constants.BTC_PURPOSE_SEGWIT}>
              {constants.BTC_PURPOSE_SEGWIT_STR}
            </Radio>
            <Radio value={constants.BTC_PURPOSE_WRAPPED_SEGWIT}>
              {constants.BTC_PURPOSE_WRAPPED_SEGWIT_STR}
            </Radio>
            <Radio value={constants.BTC_PURPOSE_LEGACY}>
              {constants.BTC_PURPOSE_LEGACY_STR}
            </Radio>
          </Space>
        </Radio.Group>
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
    const keyring = localStorage.getKeyring()
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
    const data: any[] = [];
    Object.keys(keyring)
      .sort((a, b) => { return a.toLowerCase() > b.toLowerCase() ? 1 : -1 })
      .forEach((name) => { data.push({ name, key: name }) })
    return (
      <Card>
        <Row justify='center'>
          <Col span={20}>
            <h3>Third Party Connections</h3>
            <p>
              Manage connections to your Lattice. Third party apps should be listed here if they are connected to your device.
            </p>
            <Collapse>
              <Collapse.Panel header={`Connections List (${data.length})`} key='third-party'>
                <Table dataSource={data} columns={cols}/>
              </Collapse.Panel>
            </Collapse>
          </Col>
        </Row>
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
      <PageContent content={content} />
    )
  }
}

export default Settings