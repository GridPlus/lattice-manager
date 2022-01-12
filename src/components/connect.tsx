import React from 'react';
import 'antd/dist/antd.dark.css'
import { Alert, Button, Card, Col, Input, Row, Modal } from 'antd'
import { DesktopOutlined, LinkOutlined } from '@ant-design/icons';
import { Settings } from './index'
import { constants } from '../util/helpers'

class Connect extends React.Component<any, any> {
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
    //@ts-expect-error
    this.input.focus()
    this.setState({ isLoading: false });    
  }

  componentDidUpdate() {
    if (this.props.name !== constants.DEFAULT_APP_NAME && document.title !== 'Lattice Connector') {
      document.title = 'Lattice Connector'
    }
  }

  componentWillUnmount() {
    this.setState({ isLoading: false })
  }

  handleSubmit() {
    const deviceID = (document.getElementById("deviceIdInput") as HTMLInputElement).value;
    const password = (document.getElementById("passwordInput") as HTMLInputElement).value;
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
        <Row justify="center">
          <Input  placeholder="DeviceID" 
                  id="deviceIdInput" 
                  //@ts-expect-error
                  ref={i => {this.input = i}}
                  style={{ margin: '10px 0 0 0', width: "70%"}} />
        </Row>
        <Row justify="center">
          <Input.Password placeholder="Password (create for new logins)" 
                          id="passwordInput" 
                          onPressEnter={this.handleSubmit} 
                          style={{ margin: '20px 0 0 0', width: "70%"}} />
        </Row>
        <Row justify="center">
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

  renderSetupInfo() {
    return (
      <div>
        <center>
          <h3><b>New User Setup</b></h3>
        </center>
        <p>
          You can use this page to establish a connection between <b>{this.props.name}</b>&nbsp; and your Lattice 
          hardware wallet device.&nbsp;
          <i>For more general device setup information, please see the&nbsp;
            <a className="lattice-a" href="https://gridplus.io/setup" target={"_blank"} rel={"noopener noreferrer"}>
            Lattice setup page
            </a>.</i>
        </p>
        <h3><b>Step 1:</b></h3>
        <p>
          Unlock your Lattice and find its <b>Device ID</b> on the main menu. This is a six-character code.
        </p>
        <h3><b>Step 2:</b></h3>
        <p>
          Once you have your Device ID, specify a <b>password</b>. This does <i>not</i> secure any value and 
          is <i>not</i> associated with your wallet seed - it is only used to send secure requests to your device. 
          If you lose your password, you can remove the permission on your device and re-connect with a new one.
        </p>
        <h3><b>Step 3:</b></h3>
        <p>
          Please ensure your Lattice is <b>online</b> and click "Connect". Your device is online if there is a single
          wifi signal icon on the top-right of the screen.
        </p>
      </div>
    )
  }

  renderModal() {
    if (this.state.showSettings) {
      return (
        <Modal
          title="Settings"
          footer={null}
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
          title={this.props.name === constants.DEFAULT_APP_NAME ? this.props.name : 'Lattice Connector 🔗'}
          footer={null}
          visible={this.state.modal}
          onOk={this.hideModal.bind(this)}
          onCancel={this.hideModal.bind(this)}
        >
          {this.renderSetupInfo()}
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
    if (err)
      return (
        <Alert  message={<p><b>Error:</b><br/>{err}</p>} 
                type={"error"} 
                style={{margin: "20px 0 0 0"}}
                closable/>
      );
    return;
  }

  render() {
    const spanWidth = this.props.isMobile() ? 24 : 10;
    const spanOffset = this.props.isMobile() ? 0 : 7;
    const keyringName = this.props.name === constants.DEFAULT_APP_NAME ? null : this.props.name
    const tooLong = keyringName !== null && keyringName.length < 5;
    return (
      <Row>
        {this.renderModal()}
        <Col span={spanWidth} offset={spanOffset}>
          <center>
            {this.renderMsg()}
            <Card bordered={true}>
              <a  className='lattice-a'
                  href="https://gridplus.io/lattice" 
                  target='_blank' 
                  rel='noopener noreferrer'
              >
                {keyringName ? (
                  <h2 style={{margin: "10px 0 0 0"}}>Lattice Connector <LinkOutlined/></h2>
                ) : (
                  <h2 style={{margin: "10px 0 0 0"}}>Lattice Manager<br/><DesktopOutlined/></h2>
                )}
              </a>
              {keyringName ? (<div><br/><i><h3>Connect to:</h3></i><h2>{keyringName}</h2></div>) : null}
              {/* @ts-expect-error */}
              {tooLong ? (<p><b>Error: App name must be more than 4 characters.</b></p>) : this.renderForm()}
            </Card>
            <Button type="link" onClick={this.showModal.bind(this)} style={{margin: "20px 0 0 0"}}>
              New User Info
            </Button>
            <br/>
            <Button type="link" onClick={() => {
              this.setState({ showSettings: true }, this.showModal)
            }}>
              Settings
            </Button>
            <br/>
            <Button type="link" href="https://gridplus.io/lattice" target={"_blank"} rel={"noopener noreferrer"}>
              About the Lattice
            </Button>
          </center>
        </Col>
      </Row>
    )
  }
}

export default Connect
