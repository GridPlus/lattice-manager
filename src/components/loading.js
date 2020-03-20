import React from 'react';
import 'antd/dist/antd.css'
import { Card, Col, Row, Spin } from 'antd'

class Loading extends React.Component {
  render() {
    const spanLength = this.props.isMobile() ? 18 : 10;
    const spanOffset = this.props.isMobile() ? 3 : 7; 
    return (
      <Row>
        <Col span={spanLength} offset={spanOffset}>
          <center>
            <Card title="Loading" bordered={true}>
              <Spin/>
              <p>{this.props.msg ? this.props.msg : "Waiting for data from your Lattice1"}</p>
            </Card>
          </center>
        </Col>
      </Row>
    )
  }


}

export default Loading