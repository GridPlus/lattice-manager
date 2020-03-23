import React from 'react';
import { Card, Col, Row, Input } from 'antd'
import 'antd/dist/antd.css'
const { Search } = Input;

class Pair extends React.Component {
  render() {
    const spanWidth = this.props.isMobile() ? 24 : 10;
    const spanOffset = this.props.isMobile() ? 0 : 7;
    const searchWidth = this.props.isMobile() ? "100%" : "80%";
    return (
     <Row>
        <Col span={spanWidth} offset={spanOffset}>
          <center>
            <Card title="Enter Secret" bordered={true}>
              <p></p>
              <p>Please enter the pairing secret displayed on your Lattice screen:</p>
              <Search 
                enterButton="Pair"
                size="large" 
                id="secret" 
                onSearch={value => this.props.submit(value)}
                style={{width: searchWidth, margin: '20px 0 0 0'}}
              />
            </Card>
          </center>
        </Col>
      </Row>
    )
  }
}

export default Pair