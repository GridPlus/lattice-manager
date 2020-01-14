import React from 'react';
import 'antd/dist/antd.css'
import { Card, Col, Row, Spin } from 'antd'

class Loading extends React.Component {
  render() {
    return (
      <Row>
        <Col span={10} offset={7}>
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