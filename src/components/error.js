import React from 'react';
import 'antd/dist/antd.css'
import { Card, Col, Row, Button } from 'antd'

class Error extends React.Component {
  render() {
    return (
      <Row>
        <Col span={10} offset={7}>
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