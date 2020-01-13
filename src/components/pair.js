import React from 'react';
import { Card, Col, Row, Input } from 'antd'
import 'antd/dist/antd.css'

class Pair extends React.Component {

  constructor(props) {
    super(props);
    this.handleInput = this.handleInput.bind(this);
  }

  handleInput() {
    const value = document.getElementById("secret").value;
    if (value.length > 7) {
      return this.props.submit(value);
    }
  }

  render() {
    return (
     <Row>
        <Col span={10} offset={7}>
          <center>
            <Card title="Enter Secret" bordered={true}>
              <p></p>
              <p>Please enter the pairing secret displayed on your Lattice screen:</p>
              <Input id="secret" onChange={this.handleInput} style={{width: 100}}/>
            </Card>
          </center>
        </Col>
      </Row>
    )
  }
}

export default Pair