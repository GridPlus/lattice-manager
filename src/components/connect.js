import React from 'react';
import 'antd/dist/antd.css'
import { Button, Card, Checkbox, Col, Icon, Input, Form, Row } from 'antd'

class Connect extends React.Component {
  handleSubmit(data) {
    const deviceID = document.getElementById("deviceIdInput").value;
    const password = document.getElementById("passwordInput").value;
    console.log('deviceId', deviceID, 'password', password)
  }

  renderForm(getFieldDecorator) {
    return (
      <div>
        <Input placeholder="DeviceID" id="deviceIdInput" style={{ margin: '20px 0 0 0'}} />
        <Input.Password placeholder="Password" id="passwordInput" style={{ margin: '20px 0 0 0'}} />
        <Button type="primary" onClick={this.handleSubmit} style={{ margin: '20px 0 0 0'}}>
          Connect
        </Button>
      </div>
    )
  }

  render() {
    return (
      <Row>
        <Col span={10} offset={7}>
          <center>
            <Card title="Connect to Lattice1" bordered={true}>
              <p>Please enter your Lattice's Device ID and specify a password.</p>
              <p>If you hve connected to your Lattice before, you must use the <b>same</b> password.</p>
              <p><i>To find your Lattice's Device ID, navigate to Settings -> Device Info on your device.</i></p>
              {this.renderForm()}
            </Card>
          </center>
        </Col>
      </Row>
    )
  }

}

export default Connect