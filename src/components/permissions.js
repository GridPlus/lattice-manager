// NOTE: This feature has been shelved for now. The problem is this:
// 1. We deprecated the ETH wallet and are in the process of deprecating the BTC wallet too
// 2. Only the paired requester can setup a permission and the web wallet (rebanded manager)
//    is itself a paired requester.
// Ideally we could have a true manager that can create a permission on behalf of a paired
// requester, otherwise the requester needs to have an interface to setup the permission.
// If we are to use this app as the "manager", we cannot manage permissions on it.
// FOR NOW, I AM HIDING THIS FEATURE IN main.js

import React from 'react';
import 'antd/dist/antd.dark.css'
import { Alert, Button, Card, Col, Dropdown, Icon, Input, Menu, Row, Select, Spin } from 'antd'
import './styles.css'
const BN = require('bignumber.js');
const HOURS = 3600;
const DAYS = 86400;
const assets = {
  ETH: {
    name: 'ETH',
    decimals: 18,
  },
  BTC: {
    name: 'BTC',
    decimals: 8,
  }
}
const HELP_LINK = "https://docs.gridplus.io/gridplus-web-wallet/how-to-set-and-use-spending-limits"

class Permissions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      success: false,
      loading: false,
      asset: assets.ETH,
      timeMultiplier: HOURS, // conversion of window to seconds
      value: 0,
      window: 0,
    }

    this.submit = this.submit.bind(this);
    this.updateAsset = this.updateAsset.bind(this);
    this.updateTimeMultiplier = this.updateTimeMultiplier.bind(this);
    this.updateValue = this.updateValue.bind(this);
    this.updateWindow = this.updateWindow.bind(this);
  }

  updateAsset(x) {
    this.setState({ asset: assets[x.key]})
  }

  updateTimeMultiplier(x) {
    this.setState({ timeMultiplier: x })
  }

  updateWindow(evt) {
    const x = evt.target.value
    if (!isNaN(parseFloat(x))) {
      let s = parseFloat(x);
      if (x[x.length-1] === '.')
        s += '.';
      this.setState({ window: s })
    }
    else if (x === '')
      this.setState({ window: '0' })
  }

  updateValue(evt) {
    let x = evt.target.value
    if (!isNaN(parseFloat(x))) {
      if (x.length > 1 && x[0] === '0' && x[1] !== '.')
        x = x.slice(1);
      this.setState({ value: x })
    }
    else if (x === '')
      this.setState({ value: '0' })
  }

  submit() {
    this.setState({ loading: true, error: null, success: false })
    const req = {
      currency: this.state.asset.name,
      decimals: this.state.asset.decimals,
      timeWindow: Math.floor(parseFloat(this.state.window) * this.state.timeMultiplier),
      limit: 0,
      asset: null,
    };
    const value = new BN(this.state.value);
    const decimals = new BN(this.state.asset.decimals);
    const power = new BN('10').pow(decimals);
    let limitStr = value.multipliedBy(power).toString(16)
    if (limitStr.length % 2 > 0)
      limitStr = `0${limitStr}`;
    req.limit = `0x${limitStr}`;
    this.props.session.addPermissionV0(req, (err) => {
      if (err) {
        this.setState({ error: err.toString(), success: false, loading: false })
      } else {
        this.setState({ error: null, success: true, loading: false })
      }
    })
  }

  renderBanner() {
    if (this.state.error) {
      return (
        <Alert
          message="Error"
          description={this.state.error}
          type="error"
          closable
          onClose={() => { this.setState({ error: null })}}
        />
      )
    } else if (this.state.loading) {
      return (
        <div>
          <Spin indicator={(<Icon type="loading"/>)}/>
          <br/>
        </div>
      )
    } else if (this.state.success) {
      return (
        <Alert 
          type="success"
          message="Success"
          description="Successfully added permission to Lattice."
        />
      )
    }
  }

  renderCard() {
    const timeMultiplierSelect = (
      <Select defaultValue={HOURS} onChange={this.updateTimeMultiplier}>
        <Select.Option value={HOURS}>hours</Select.Option>
        <Select.Option value={DAYS}>days</Select.Option>
      </Select>
    )

    const currencyMenu = (
      <Menu onClick={this.updateAsset}>
        {Object.keys(assets).map((key) => {
          return (
            <Menu.Item key={key}>{key}</Menu.Item>
          )
        })}
      </Menu>
    );

    return (
      <div>
        <p>
          You can set spending limits for ETH and BTC. If you make a request from this web wallet that is under your
          spending limit, your Lattice will auto-sign the transaction. Note that this currently only works for simple 
          ETH and BTC transfers.&nbsp;
          <a  href={HELP_LINK}
              target={"_blank"}
              rel={"noopener noreferrer"}>
            (More info)
          </a>        
        </p>
        <br/>
        <i>This is a feature prototype. In the future, GridPlus intends to expand this functionality
        to other assets and more general contract interactions.</i>
        <br/><br/>
        <p><b>Currency:</b></p>
        <Row>
          <Col span={12} offset={6}>
            <Dropdown overlay={currencyMenu}>
              <Button>{this.state.asset.name}</Button>
            </Dropdown>
          </Col>
        </Row>
        <br/>
        <p><b>Spending Limit:</b></p>
        <Row>
          <Col span={12} offset={6}>
            <Input type="text"
                  id="permission-value" 
                  value={this.state.value} 
                  onChange={this.updateValue.bind(this)}
            />
          </Col>
        </Row>
        <br/>
        <p><b>Reset Every:</b></p>
         <Row>
          <Col span={12} offset={6}>
            <Input type="text"
                  id="permission-window"
                  addonAfter={timeMultiplierSelect}
                  value={this.state.window} 
                  onChange={this.updateWindow.bind(this)}
            />
          </Col>
        </Row>
        <br/>
        <Button type="primary" onClick={this.submit}>
          Set Limit
        </Button>
      </div>
    )
  }

  render() {
    const content = (
      <center>
        {this.renderBanner()}
        <Card title={<div>
          <h3>Spending Limits (Beta)&nbsp;
            <a  href={HELP_LINK}
              target={"_blank"}
              rel={"noopener noreferrer"}>
              <Icon type="question-circle"/>
            </a>
          </h3>
        </div>} bordered={true}>
          {this.renderCard()}
        </Card>
      </center>      
    )
    return this.props.isMobile() ? content : (
      <Row justify={'center'}>
        <Col span={14} offset={5} style={{maxWidth: '600px'}}>
          {content}
        </Col>
      </Row>
    )
  }
}

export default Permissions