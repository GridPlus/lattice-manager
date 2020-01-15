import React from 'react';
import 'antd/dist/antd.css'
import { Card, Col, Row, Input, Icon, Empty } from 'antd'
const QRCode = require('qrcode.react');
const { Search } = Input;
const SEARCH_ID = "address-data";

class Receive extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      address: null,
      windowWidth: window.innerWidth,
    }

    this.updateWidth = this.updateWidth.bind(this);
  }

  componentDidMount() {
    this.updateDisplayAddress();
    window.addEventListener('resize', this.updateWidth);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWidth);
  }

  updateWidth() {
    this.setState({ windowWidth: window.innerWidth });

  }


  updateDisplayAddress() {
    const addrs = this.props.session.getAddresses(this.props.currency);
    const displayAddr = addrs[addrs.length - 1] || null;
    if (addrs) this.setState({ address:  displayAddr });
  }

  copyAddress() {
    const copy = document.getElementById(SEARCH_ID);
    copy.select();
    document.execCommand("copy")
  }

  renderCard() {
    if (this.state.address) {
      return (
        <div>
          <p>Your {this.props.currency} receiving address:</p>
          <QRCode value={this.state.address} 
                  size={0.2 * this.state.windowWidth}
                  style={{margin: "30px 0 0 0"}}
          />
          <Search type="text" 
                  id={SEARCH_ID} 
                  value={this.state.address} 
                  enterButton={<Icon type="copy" />}
                  onSearch={this.copyAddress}
                  style={{margin: "30px 0 0 0"}}
          />
        </div>
      )
    } else {
      return (
        <div>
          <p>No addresses found</p>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}/>
        </div>
      )
    }
  }

  render() {
    return (
      <Row>
        <Col span={8} offset={8}>
          <center>
            <Card title="Receive" bordered={true}>
              {this.renderCard()}
            </Card>
          </center>
        </Col>
      </Row>
    )
  }
}

export default Receive