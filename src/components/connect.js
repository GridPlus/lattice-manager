import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Card, Col, Collapse, Icon, Input, Row, Modal } from 'antd'
import { Settings } from './index'
const { Panel } = Collapse;

class Connect extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      errMsg: null,
      isLoading: false,
      modal: false,
      showSettings: false,
    }
    this.handleCancel = this.handleCancel.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.renderMsg = this.renderMsg.bind(this);
    this.showModal = this.showModal.bind(this);
  }

  componentDidMount() {
    this.setState({ isLoading: false });    
  }

  componentWillUnmount() {
    this.setState({ isLoading: false })
  }

  handleSubmit() {
    const deviceID = document.getElementById("deviceIdInput").value;
    const password = document.getElementById("passwordInput").value;
    if (password.length < 8) {
      this.setState({ isLoading: true, errMsg: "Your password must be at least 8 characters."})
    } else {
      this.setState({ isLoading: true, errMsg: null })
      // Call the connect function. Skip the loading screen so we don't
      // leave the landing page until we connect.
      this.props.submitCb({deviceID, password}, false);
    }
  }

  handleCancel() {
    this.props.cancelConnect();
    this.setState({ isLoading: false, errMsg: null });
  }

  renderConnectButton() {
    if (this.state.isLoading && 
        this.state.errMsg === null &&
        this.props.errMsg === null) {
      return (
        <div>
          <Button type="primary"
                  style={{ margin: '20px 0 0 0' }}
                  loading>
            Connecting...
          </Button>
          <br/>
          <Button type="link" onClick={this.handleCancel}>
            Cancel
          </Button>
        </div>
      )
    } else {
      return (
        <Button type="primary" onClick={this.handleSubmit} style={{ margin: '20px 0 0 0'}}>
          Connect
        </Button>
      )
    }
  }

  renderForm(getFieldDecorator) {
    return (
      <div>
        <Row>
          <Input  placeholder="DeviceID" 
                  id="deviceIdInput" 
                  style={{ margin: '10px 0 0 0', width: "70%"}} />
        </Row>
        <Row>
          <Input.Password placeholder="Password (create for new logins)" 
                          id="passwordInput" 
                          onPressEnter={this.handleSubmit} 
                          style={{ margin: '20px 0 0 0', width: "70%"}} />
        </Row>
        <Row>
          {this.renderConnectButton()}
        </Row>
      </div>
    )
  }

  showModal() {
    this.setState({ modal: true });
  }

  hideModal() {
    this.setState({ modal: false, showSettings: false });
  }

  _isMobile() {
    return this.state.windowWidth < 500;
  }

  renderModal() {
    if (this.state.showSettings) {
      return (
        <Modal
          title="Settings"
          visible={this.state.modal}
          onOk={this.hideModal.bind(this)}
          onCancel={this.hideModal.bind(this)}
        >
          <Settings isMobile={() => this._isMobile()} inModal={true} />
        </Modal>
      )
    }
     return (
      <div>
        <Modal
          title="GridPlus Web Wallet"
          visible={this.state.modal}
          onOk={this.hideModal.bind(this)}
          onCancel={this.hideModal.bind(this)}
        >
          <center>
            <h3><b>New User Setup</b></h3>
          </center>
          <p>
            With the GridPlus Web Wallet you can monitor balances and transactions for your Lattice1 device. The following
            guide is meant to explain this login process.
            <br/><br/>
            <i>For more general setup information, please see the <a href="https://gridplus.io/setup" target={"_blank"}>
              Lattice1 setup page
            </a>.</i>
          </p>
          <h3><b>Step 1:</b></h3>
          <p>
            In order to connect to your device, find its <b>Device ID</b>:
          </p>
          <p>
            {deviceIdContent}
          </p>
          <h3><b>Step 2:</b></h3>
          <p>
            Once you have your Device ID, specify a <b>password</b>:
          </p>
          <p>
            {pwContent}
          </p>
          <p><i>
            This password is not stored on any server or locally so there is no way to reset it.
            However, if you forget your password, you can always create a new one and reconnect to your Lattice1.
          </i></p>
          <h3><b>Step 3:</b></h3>
          <p>
            <br/><br/>Please ensure your Lattice1 is <b>online</b> and click "Connect".
          </p>
        </Modal>
      </div>
    );
  }

  renderMsg() {
    let err;
    if (this.state.errMsg)
      err = this.state.errMsg;
    else if (this.props.errMsg)
      err = this.props.errMsg;

      const desc = (
            <Button onClick={this.handleSubmit} type="primary">
              Retry
            </Button>
      )
    if (err)
      return (
        <Alert  message={<p><b>Error:</b><br/>{err}</p>} 
                type={"error"} 
                style={{margin: "20px 0 0 0"}}
                description={desc}
                closable/>
      );
    return;
  }

  render() {
    const spanWidth = this.props.isMobile() ? 24 : 10;
    const spanOffset = this.props.isMobile() ? 0 : 7;
    const keyringName = this.props.name === 'GridPlus Web Wallet' ? null : this.props.name
    const tooLong = keyringName !== null && keyringName.length < 5;
    return (
      <Row>
        {this.renderModal()}
        <Col span={spanWidth} offset={spanOffset}>
          <center>
            {this.renderMsg()}
            <Card bordered={true}>
              <a href="https://gridplus.io/lattice" target={"_blank"}>
                <img alt="GridPlus" src={'/gridplus-logo-black.png'}/>
                {keyringName ? (
                  <h2 style={{margin: "10px 0 0 0"}}>Lattice1 Connector <Icon type="link"/></h2>
                ) : (
                  <h2 style={{margin: "10px 0 0 0"}}>Web Wallet <Icon type="wallet"/></h2>
                )}
              </a>
              {keyringName ? (<div><br/><i><p>Login for <b>{keyringName}</b></p></i></div>) : null}
              {tooLong ? (<p><b>Error: App name must be more than 4 characters.</b></p>) : this.renderForm()}
            </Card>
            <Button type="link" onClick={this.showModal.bind(this)} style={{margin: "20px 0 0 0"}}>
              New User?
            </Button>
            <br/>
            <Button type="link" onClick={() => {
              this.setState({ showSettings: true }, this.showModal)
            }}>
              Settings
            </Button>
            <a href="https://gridplus.io/lattice" target={"_blank"}>
              <p>Buy a Lattice1</p>
            </a>
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
      <p>On your Lattice1's home screen, you should see an item titled "Device ID". Click this to find the ID.</p> 
      <p>The DeviceID contains 6 to 8 random numbers and letters.</p>
    </Panel>
    <Panel header="Why do I need to enter this?" key="3">
      <p>This web wallet does not save or send any information about you or your device.</p>
      <p>After logging out, you must re-enter your device ID in order to find your device.</p>
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