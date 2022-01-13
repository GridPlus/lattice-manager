import React, { useEffect, useState } from 'react';
import 'antd/dist/antd.dark.css'
import { Button, Card, Checkbox, Col, Collapse, Input, Radio, Row, Space, Table } from 'antd'
import { WarningOutlined } from '@ant-design/icons';
import { PageContent } from './index'
import './styles.css'
import omit from "lodash/omit"
import { constants, getBtcPurpose } from '../util/helpers';
import localStorage from '../util/localStorage';

const Settings = ({isMobile, inModal=false}) => {
  const [settings, setSettings] = useState(localStorage.getSettings())
  const [keyring, setKeyring] = useState(localStorage.getKeyring())


  useEffect(() => {
    localStorage.setSettings(settings)
  }, [settings])

  function submit() {
    // Save the settings to localStorage
    localStorage.setSettings(settings)
    // Reload the page for the changes to take effect
    window.location.reload();
  }

  // function updateUseCustomEndpoint(value) {
  //   const _settings = {...settings};
  //   if (value !== true) {
  //     // Reset the custom endpoint if this value is false
  //     _settings.customEndpoint = '';
  //   }
  //   setSettings(_settings);
  // }

  function updateCustomEndpoint(evt) {
    const _settings = {...settings};
    _settings.customEndpoint = evt.target.value;
    setSettings(_settings);
  }

  function updateUseDevLattice(evt) {
    const _settings = {...settings};
    _settings.devLattice = evt.target.checked
    setSettings(_settings);
    submit()
  }

  function removeKeyring ({ name }) {
    localStorage.removeKeyringItem(name)
    setKeyring({ keyring: omit(keyring, name) })
  }

  function resetState() {
    localStorage.removeRootStore()
    window.location.reload();
  }

  function renderCustomEndpointSetting() {
    const { customEndpoint='' } = settings;
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
                      onChange={updateCustomEndpoint}/>
            </div>
          </Col>
        </Row>
      </Card>
    )
  }

  function handleChangeBitcoinVersionSetting (evt) {
    const _settings = {...settings};
    _settings.btcPurpose = parseInt(evt.target.value);
    setSettings(_settings);
    submit()
  }

  // function getBtcPurposeName() {
  //   const purpose = settings.btcPurpose ?
  //                   settings.btcPurpose :
  //                   getBtcPurpose();
  //   if (purpose === constants.BTC_PURPOSE_NONE) {
  //     return constants.BTC_PURPOSE_NONE_STR;
  //   } else if (purpose === constants.BTC_PURPOSE_LEGACY) {
  //     return constants.BTC_PURPOSE_LEGACY_STR
  //   } else if (purpose === constants.BTC_PURPOSE_WRAPPED_SEGWIT) {
  //     return constants.BTC_PURPOSE_WRAPPED_SEGWIT_STR
  //   } else if (purpose === constants.BTC_PURPOSE_SEGWIT) {
  //     return constants.BTC_PURPOSE_SEGWIT_STR;
  //   } else {
  //     return 'Error finding BTC version'
  //   }
  // }

  function renderBitcoinVersionSetting() {
    // NOTE: Firmware does not yet support segwit addresses
    // TODO: Uncomment this when firmware is updated
    const purpose = getBtcPurpose() || constants.BTC_PURPOSE_NONE;
    return (
      <Card>
        <h4>Bitcoin Wallet Type</h4>
        <Radio.Group  onChange={handleChangeBitcoinVersionSetting}
                      defaultValue={purpose}>
          <Space direction="vertical">
            <Radio value={constants.BTC_PURPOSE_NONE}>
              Hide BTC Wallet
            </Radio>
            {/* <Radio value={constants.BTC_PURPOSE_SEGWIT}>
              {constants.BTC_PURPOSE_SEGWIT_STR}
            </Radio> */}
            <Radio value={constants.BTC_PURPOSE_WRAPPED_SEGWIT}>
              {constants.BTC_PURPOSE_WRAPPED_SEGWIT_STR}
            </Radio>
            {/* Don't uncomment this until segwit support is released
            <Radio value={constants.BTC_PURPOSE_LEGACY}>
              {constants.BTC_PURPOSE_LEGACY_STR}
            </Radio> */}
          </Space>
        </Radio.Group>
      </Card>
    )
  }

  function renderDevLatticeSetting() {
    const { devLattice } = settings;
    return (
      <Card>
        <h4>Debug Settings</h4>
        <Row justify='center' style={{ margin: '10px 0 0 0'}}>
          <Button type="link" onClick={resetState} className='warning-a'>
          <WarningOutlined/>&nbsp;Reset App State
        </Button>
        </Row>
        <Row justify='center' style={{ margin: '20px 0 0 0'}}>
          <Checkbox onChange={updateUseDevLattice} checked={devLattice}>
            Using Dev Lattice
          </Checkbox>
        </Row>
      </Card>
    )
  }

  function renderKeyringsSetting() {
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
          <Button type="link" onClick={() => {removeKeyring(record)}}>Forget</Button>
        ) 
      }
    ]
    const data: any[] = [];
    Object.keys(keyring)
      .sort((a, b) => { return a.toLowerCase() > b.toLowerCase() ? 1 : -1 })
      .forEach((name) => { data.push({ name }) })
    return (
      <Card>
        <Row justify='center'>
          <Col span={20}>
            <h3>Third Party Connections</h3>
            <p>
              Manage connections to your Lattice. Third party apps should be listed here if they are connected to your device.
            </p>
            <Collapse>
              {/* @ts-expect-error */}
              <Collapse.Panel header={`Connections List (${data.length})`}>
                <Table dataSource={data} columns={cols}/>
              </Collapse.Panel>
            </Collapse>
          </Col>
        </Row>
      </Card>
    )
  }

  function renderCard() {
    return (
      <div>
        {renderKeyringsSetting()}
        {renderCustomEndpointSetting()}
        {renderBitcoinVersionSetting()}
        {renderDevLatticeSetting()}
        <br/>
        <Button type="primary" onClick={submit}>
          Update and Reload
        </Button>
      </div>
    )
  }

  const content = (
    <center>
      <Card title={'Settings'} bordered={true}>
        {renderCard()}
      </Card>
    </center>
  )
  if (inModal)
    return (<center>{renderCard()}</center>);
  return (
    <PageContent content={content} isMobile={isMobile} />
  )

}

export default Settings