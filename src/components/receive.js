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
      windowWidth: document.getElementById('main-content-inner').offsetWidth,
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
    this.setState({ windowWidth:  document.getElementById('main-content-inner').offsetWidth });
  }


  updateDisplayAddress() {
    const displayAddr = this.props.session.getDisplayAddress(this.props.currency);
    if (displayAddr) this.setState({ address:  displayAddr });
  }

  copyAddress() {
    const copy = document.getElementById(SEARCH_ID);
    copy.select();
    document.execCommand("copy")
  }

  renderCard() {
    if (this.state.address) {
      const cardW = document.getElementById("receive-card").offsetWidth;
      const w = Math.min(300, 0.8 * cardW);
      return (
        <div>
          <Row>
          <QRCode value={this.state.address} 
                  size={w}
                  style={{margin: "30px 0 0 0"}}
          />
          </Row>
          <Row>
          <Search type="text" 
                  id={SEARCH_ID} 
                  value={this.state.address} 
                  enterButton={<Icon type="copy" />}
                  onSearch={this.copyAddress}
                  style={{margin: "30px 0 0 0", width: `${w}px`}}
          />
          </Row>
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
    const content = (
      <center>
        <Card title="Receive" bordered={true} id="receive-card">
          <center>
            {this.renderCard()}
          </center>
        </Card>
      </center>      
    )

    return this.props.isMobile() ? content : (
      <Row justify={'center'}>
        <Col span={12} offset={6}>
          {content}
        </Col>
      </Row>
    )
  }
}

export default Receive