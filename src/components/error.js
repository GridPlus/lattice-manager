import React from 'react';
import 'antd/dist/antd.dark.css'
import { Card, Col, Row, Button } from 'antd'

class Error extends React.Component {

  constructor(props) {
    super(props);
    this.keyPressListener = this.keyPressListener.bind(this);
    this.submit = this.submit.bind(this)
   }

  componentDidMount() {
    window.addEventListener('keypress', this.keyPressListener)
  }

  componentWillUnmount() {
    window.removeEventListener('keypress', this.keyPressListener)
  }

  keyPressListener(e) {
    if (e.key === 'Enter')
      this.submit()
  }

  submit() {
    this.props.retryCb(this.props.cb)
  }

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
                <Button id="submitButton"
                  onClick={this.submit} type="danger">
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