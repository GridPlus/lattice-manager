import React from 'react';
import 'antd/dist/antd.dark.css'
import { Button, Card, Col, Icon, Row, Spin } from 'antd'

class Loading extends React.Component {
  render() {
    const spanLength = this.props.isMobile() ? 18 : 10;
    const spanOffset = this.props.isMobile() ? 3 : 7; 
    return (
      <Row>
        <Col span={spanLength} offset={spanOffset}>
          <center>
            <Card title="Loading" bordered={true}>
              {this.props.spin !== false ? (
                <Spin indicator={<Icon type="loading"/>} />
              ) : null}
              <p>{this.props.msg ? this.props.msg : "Waiting for data from your Lattice1"}</p>
              {this.props.onCancel ? (
                <Button type='link' onClick={this.props.onCancel}>
                  Cancel
                </Button>
              ) : null}
            </Card>
          </center>
        </Col>
      </Row>
    )
  }


}

export default Loading