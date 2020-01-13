import React from 'react';
import { Card, Col, Row, Input } from 'antd'
import 'antd/dist/antd.css'
const { Search } = Input;

class Pair extends React.Component {

  constructor(props) {
    super(props);
    this.timeout = setTimeout(() => {
      return this.props.submit(null, true);
    }, 60000)
  }

  render() {
    return (
     <Row>
        <Col span={10} offset={7}>
          <center>
            <Card title="Enter Secret" bordered={true}>
              <p></p>
              <p>Please enter the pairing secret displayed on your Lattice screen:</p>
              <Search 
                enterButton="Pair"
                size="large" 
                id="secret" 
                onSearch={value => this.props.submit(value)}
                style={{width: "50%", margin: '20px 0 0 0'}}
              />
            </Card>
          </center>
        </Col>
      </Row>
    )
  }
}

export default Pair