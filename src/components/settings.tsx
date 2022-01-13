import React, { useEffect, useState } from 'react';
import 'antd/dist/antd.dark.css'
import { Button, Card, Checkbox, Col, Collapse, Form, Input, Radio, Row, Space, Table } from 'antd'
import { WarningOutlined } from '@ant-design/icons';
import { PageContent } from './index'
import './styles.css'
import omit from "lodash/omit"
import { constants, getBtcPurpose } from '../util/helpers';
import localStorage from '../util/localStorage';

const Settings = ({isMobile, inModal=false}) => {
  const [settings, setSettings] = useState(localStorage.getSettings())
  const [keyring, setKeyring] = useState(localStorage.getKeyring())
  const [btcPurpose, setBtcPurpose] = useState(getBtcPurpose() || constants.BTC_PURPOSE_NONE)

  useEffect(() => {
    localStorage.setSettings(settings)
  }, [settings])

  useEffect(() => {
    localStorage.setKeyring(keyring)
  }, [keyring])

  function submit() {
    // Reload the page for the changes to take effect
    window.location.reload();
  }

  function updateCustomEndpoint(evt) {
    setSettings((_settings) => ({
      ..._settings,
      customEndpoint: evt.target?.value,
    }));
  }

  function updateUseDevLattice(evt) {
    setSettings((_settings) => ({
      ..._settings,
      devLattice: evt.target.checked,
    }));
    submit();
  }

  function updateBitcoinVersionSetting (evt) {
    setBtcPurpose(parseInt(evt.target.value))
    setSettings((_settings) => ({
      ..._settings,
      btcPurpose: parseInt(evt.target.value),
    }));
    submit()
  }

  function removeKeyring ({ name }) {
    setKeyring({ ...omit(keyring, name) })
  }

  function resetState() {
    localStorage.removeRootStore()
    window.location.reload();
  }

  const ConnectionSettings = () => {
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

  const BitcoinSettings = () => {
    // NOTE: Firmware does not yet support segwit addresses
    return (
      <Card>
        <h4>Bitcoin Wallet Type</h4>
        <Radio.Group
          onChange={updateBitcoinVersionSetting}
          defaultValue={btcPurpose}
          value={btcPurpose}
        >
          <Space direction="vertical">
            <Radio value={constants.BTC_PURPOSE_NONE}>Hide BTC Wallet</Radio>
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
    );
  }

  const DebugSettings = () => {
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

  const KeyringNameCell = (text, record) => {
    const [isEditing, setIsEditing] = useState(false)
    const [form] = Form.useForm();

    const onCancel = () => {
        form.resetFields();
        setIsEditing(false)
    }

    const onFinish = (value) => {
      const newKey = value.key;
      const oldKey = record.key;
      if (oldKey !== newKey) {
        const keyringItem = keyring[oldKey];
        setKeyring((keyring) => (omit({
          ...keyring,
          [newKey]: keyringItem,
        }, oldKey)));
      }
      setIsEditing(false);
    };
    

    return isEditing
      ? <Form
        form={form}
        name="formData"
        layout="inline"
        onFinish={onFinish}>
        <Form.Item
          name="key"
          initialValue={text}
          rules={[{ required: true, message: "Name is required." },]}>
          <Input size='small' />
        </Form.Item>
        <Form.Item>
          <Button type="text" onClick={onCancel} size='small'>Cancel</Button>
          <Button type="ghost" htmlType='submit' size='small'>Save</Button>
        </Form.Item>
      </Form>
      : <Button
        type="text"
        onClick={() => setIsEditing(true)}
      >
        {text}
      </Button>
  }

  const KeyringSettings = () => {
    const cols = [
      { 
        title: 'App Name', 
        dataIndex: 'name', 
        key: 'name',
        render: KeyringNameCell
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

    const data = Object.keys(keyring)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, key: name }));

    return (
      <Card>
        <Row justify='center'>
          <Col span={20}>
            <h3>Third Party Connections</h3>
            <p>
              Manage connections to your Lattice. Third party apps should be listed here if they are connected to your device.
            </p>
            <Collapse>
              <Collapse.Panel header={`Connections List (${data.length})`} key="connections-list">
                <Table dataSource={data} columns={cols} tableLayout="fixed" pagination={false} />
              </Collapse.Panel>
            </Collapse>
          </Col>
        </Row>
      </Card>
    )
  }

  function renderCard() {
    return (
      <>
        <KeyringSettings />
        <ConnectionSettings />
        <BitcoinSettings />
        <DebugSettings />
        <Button type="primary" style={{ marginTop: "2em" }} onClick={submit}>
          Update and Reload
        </Button>
      </>
    );
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