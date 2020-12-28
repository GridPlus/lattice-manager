import React from 'react';
import 'antd/dist/antd.css'
import { Card, Col, Row, Button } from 'antd'

class Error extends React.Component {
  render() {
    const spanVal = this.props.isMobile === true ? 22 : 10;
    const offsetVal = this.props.isMobile === true ? 1 : 7;
    return (
      <Row>
        <Col span={spanVal} offset={offsetVal}>
          <center>
            <Card title="Error" bordered={true}>
              <p>{this.props.msg}</p>
              {this.props.retryCb ? (
                <Button onClick={() => { this.props.retryCb(this.props.cb) }} type="danger">
                  {this.props.btnMsg || "Retry"}
                </Button>
              ): null}
            </Card>
          </center>
        </Col>
      </Row>
    )
  }
}

export default Error