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
      return (
        <div>
          <p>Your {this.props.currency} receiving address:</p>
          <QRCode value={this.state.address} 
                  size={0.8 * this.getCardWidth()}
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

  getCardWidth() {
    if (this.state.windowWidth > 500) {
      return 500;
    } else if (this.state.windowWidth > 300) {
      return 300;
    } else {
      return this.state.windowWidth - 10;
    }
  }

  render() {
    return (
      <center>
        <Card title="Receive" bordered={true} style={{width: this.getCardWidth()}}>
          {this.renderCard()}
        </Card>
      </center>
    )
  }
}

export default Receive