import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Card, Col, Collapse, Icon, Input, Row, Popover } from 'antd'
const { Panel } = Collapse;

class Connect extends React.Component {
    constructor(props) {
      super(props)
      this.state = {
        errMsg: null,
      }
      this.handleSubmit = this.handleSubmit.bind(this);
      this.renderMsg = this.renderMsg.bind(this);
    }


  handleSubmit(data) {
    const deviceID = document.getElementById("deviceIdInput").value;
    const password = document.getElementById("passwordInput").value;
    if (password.length < 8) {
      this.setState({errMsg: "Your password must be at least 8 characters."})
    } else {
      this.setState({ errMsg: null })
      this.props.submitCb({deviceID, password});
    }
  }

  renderForm(getFieldDecorator) {
    return (
      <div>
        <Row>
          <Input placeholder="DeviceID" id="deviceIdInput" style={{ margin: '10px 0 0 0', width: "50%"}} />
        </Row>
        <Row>
          <Input.Password placeholder="Password" id="passwordInput" onPressEnter={this.handleSubmit} style={{ margin: '20px 0 0 0', width: "50%"}} />
        </Row>
        <Row>
          <Button type="primary" onClick={this.handleSubmit} style={{ margin: '20px 0 0 0'}}>
            Connect
          </Button>
        </Row>
      </div>
    )
  }

  renderMsg() {
    if (this.state.errMsg !== null) {
      return (<Alert message={this.state.errMsg} type={"error"} closable />)
    } else {
      return;
    }
  }

  render() {
    console.log('this.props.isMobile', this.props.isMobile())
    const spanWidth = this.props.isMobile() ? 24 : 10;
    const spanOffset = this.props.isMobile() ? 0 : 7;
    return (
      <Row>
        <Col span={spanWidth} offset={spanOffset}>
          <center>
            {this.renderMsg()}
            <Card bordered={true} style={{"backgroundColor": "#001529"}}>
              <h1 style={{"fontSize": "36px", "color": "#ffffff", margin:"20px 0 0 0"}}>GridPlus Web Wallet</h1>
            </Card>
            <Card bordered={true}>
              <p>
                With the GridPlus Web Wallet you can monitor balances and transactions for your Lattice1 device.
                In order to connect to your device, find its <b>Device ID</b>&nbsp;
                <Popover title={"Enter your DeviceID"} content={deviceIdContent}>
                  <Icon type="question-circle" />
                </Popover>
                &nbsp;by navigating to the Device Info screen on your Lattice1 device.
                Once you have the Device ID, specify a <b>password</b>&nbsp;
                <Popover title={"Enter a Password"} content={pwContent}>
                  <Icon type="question-circle" />
                </Popover>.
                This password is not stored on any server or locally so there is no way to reset it.
                However, if you forget your password, you can always create a new one and reconnect to your Lattice1.
                <br/><br/>Please ensure your Lattice1 is <b>online</b> before trying to connect.
              </p>
            </Card>
            <Card bordered={true} style={{margin: "20px 0 0 0"}}>
              {this.renderForm()}
            </Card>
          </center>
        </Col>
      </Row>
    )
  }


}

export default Connect


const deviceIdContent = (
  <Collapse defaultActiveKey={['1']}>
    <Panel header="What is this?" key="1">
      <p>The DeviceID is a unique fingerprint of your Lattice1 device. It is used to find your Lattice over the internet.</p>
    </Panel>
    <Panel header="How do I find my DeviceID?" key="2">
      <p>Go to your Lattice1 and navigate to the "Settings" screen and then to the "Device Info" screen.</p> 
      <p>The DeviceID should be made of 8 random numbers and letters.</p>
    </Panel>
    <Panel header="Why do I need to enter this?" key="3">
      <p>This web wallet does not save any information about you or your device.<br/>
      You will need to enter your DeviceID every time you open this wallet.</p>
    </Panel>
  </Collapse>
);

const pwContent = (
  <Collapse defaultActiveKey={['1']}>
    <Panel header="What is this?" key="1">
      <p>The password you enter is used to create a unique connection to your Lattice1 device.</p>
    </Panel>
    <Panel header="Where is the password stored?" key="2">
      <p>It isn't stored at all. It never leaves this page and if you come back, it will not be saved.</p> 
      <p>You should back it up yourself.</p>
    </Panel>
    <Panel header="What if I lose my password?" key="3">
      <p>No problem! Just go to your Lattice1 device, open up your "Connections" page,<br/>and delete the connection called "GridPlus Web Wallet".</p>
      <p>Then simply create a new password here (and save it offline) to re-connect to your Lattice.</p>
    </Panel>
  </Collapse>
);