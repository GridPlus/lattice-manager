import React from 'react';
import { Card, Col, Row } from 'antd'
import 'antd/dist/antd.css'

class Content extends React.Component {
  
  render() {
    return (
      <div>
        <Row padding={100}>
          <Col span={4} offset={10}>
            <center><img alt={"GridPlus"} src={"/logo.png"} width={100} /></center>
          </Col>
        </Row>
        <Row>
          <Col span={8} offset={8}>
            {/* <center> */}
            <Card title="Enter DeviceID" bordered={true}>
              <p>Please enter your Lattice's DeviceID. To find this, navigate to Settings -> Device Info</p>
            </Card>
            {/* </center> */}
          </Col>
        </Row>
      </div>
    )
  }
}

export default Content