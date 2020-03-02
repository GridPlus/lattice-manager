import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Card, Col, Row, Input, Icon, Empty } from 'antd'
import { allChecks } from '../util/sendChecks';
import { constants, buildBtcTxReq } from '../util/helpers'
const RECIPIENT_ID = "recipient";
const VALUE_ID = "value";

class Send extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      recipient: '',
      value: null,
      recipientCheck: null,
      valueCheck: null,
      error: null,
    }

    this.renderError = this.renderError.bind(this);
    this.submit = this.submit.bind(this);
    this.buildEthRequest = this.buildEthRequest.bind(this);
    this.buildBtcrequest = this.buildBtcRequest.bind(this);
  }

  updateRecipient(evt) {
    const val = evt.target.value;
    const check = allChecks[this.props.currency].recipient;
    this.setState({ 
      recipient: val, 
      recipientCheck: check(val), 
    });
  }

  updateValue(evt) {
    let val = evt.target.value;
    const check = allChecks[this.props.currency].value;
    let numberVal = Number(val);
    const isZeroPrefixed = val[0] === '0';
    const isLessThanOne = isZeroPrefixed && val[1] === '.';
    // Only update state if the value can be converted to a number!
    if (val === '0') {
      // Plain zero is fine
      ;
    } else if (!isNaN(numberVal)) {
      // We want to save the string, as it may contain a period
      // which is necessary for forming decimal numbers
      // Because we will be saving the string and not the number,
      // we should make sure we strip out leading zeros for numbers
      // larger than zero (i.e. 0.4 is good, 01.4 is not)
      if (isZeroPrefixed && !isLessThanOne) val = val.slice(1);
    } else if (val === '.') {
      // If the user is trying to make a decimal value <1, prefix
      // with a 0
      val = '0' + val;
    } else {
      return;
    }

    this.setState({ 
      value: val,
      valueCheck: check(val) 
    });
  }

  buildEthRequest() {
    const txData = {
      nonce: this.props.session.ethNonce,
      gasPrice: 1200000000, // dummy val
      gasLimit: 122000, // dummy val
      to: this.state.recipient,
      value: this.state.value,
      data: null // dummy val
    };
    const req = {
      currency: 'ETH',
      data: {
        signerPath: [
          constants.HARDENED_OFFSET+44, 
          constants.HARDENED_OFFSET+60, 
          constants.HARDENED_OFFSET, 
          0, 
          0
        ],
        ...txData,
        chainId: 'rinkeby', // Rinkeby does not use EIP155
      }
    };
    return req;
  }

  buildBtcRequest() {
    const req = buildBtcTxReq(this.state.recipient, 
                              this.state.value, 
                              this.props.session.getUtxos('BTC'), 
                              this.props.session.addrsses['BTC'],  
                              this.props.session.addrsses['BTC_CHANGE']);
    if (req.error) {
      this.setState({ error: req.error });
      return null;
    } else if (!req.data) {
      this.setState({ error: 'Invalid response when building BTC transaction request. '});
      return null;
    }
    return req.data;
  }

  submit() {
    let req;
    switch (this.props.currency) {
      case 'ETH':
        req = this.buildEthRequest();
        break;
      case 'BTC':
        req = this.buildBtcRequest();
        break;
      default:
        console.error('Invalid currency in props.')
        return;
    }
    if (req) {
      this.props.session.sign(req, (err, txHash) => {
        if (err) {
          // Display an error banner
          this.setState({ error: err })
        } else {
          // Start watching this new tx hash for confirmation
          console.log('Got tx hash:', txHash)
        }
      })
    }
  }

  renderIcon(id) {
    const name = `${id}Check`;
    const isValid = this.state[name];
    if (isValid === true) {
      return (<Icon type="check-circle" theme="filled" style={{color: 'green'}}/>)
    } else if (isValid === false) {
      return (<Icon type="close-circle" theme="filled" style={{color: 'red'}}/>)
    } else {
      return;
    }
  }

  renderError() {
    if (this.state.error) {
      return (
          <Alert
            message="Failed to Send Transaction"
            description={this.state.error}
            type="error"
            closable
            onClose={() => { this.setState({ error: null })}}
          />
      )
    }
  }

  renderCard() {
    if (true) {
      return (
        <div>
          <Row>
            <Col span={18} offset={2}>
              <p style={{textAlign:'left'}}><b>Recipient</b></p>
              <Input type="text" 
                      id={RECIPIENT_ID} 
                      value={this.state.recipient} 
                      onChange={this.updateRecipient.bind(this)}
              />
            </Col>
            <Col offset={20}>
              <div style={{margin: "30px 0 0 0", fontSize: "24px"}}>
                {this.renderIcon(RECIPIENT_ID)}
              </div>
            </Col>
          </Row>
          <Row style={{margin: "20px 0 0 0"}}>
            <Col span={18} offset={2}>
              <p style={{textAlign: 'left'}}><b>Value</b></p>
              <Input type="text" 
                      id={VALUE_ID} 
                      value={this.state.value} 
                      onChange={this.updateValue.bind(this)}
              />
            </Col>
            <Col offset={20}>
              <div style={{margin: "30px 0 0 0", fontSize: "24px"}}>
                {this.renderIcon(VALUE_ID)}
              </div>
            </Col>
          </Row>
          <Button type="primary" 
                  onClick={this.submit} 
                  hidden={() => { return false === allChecks[this.props.currency].full(this.state); }} 
                  style={{ margin: '30px 0 0 0'}}>
            Send
          </Button>
        </div>
      )
    } else {
      return (
        <div>
          <p>No addresses found from your Lattice. If you have your wallet setup, please try logging out and reconnecting.</p>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}/>
        </div>
      )
    }
  }

  render() {
    return (
      <Row justify={'center'} type={'flex'}>
        <Col style={{width: '600px'}}>
          <center>
            {this.renderError()}
            <Card title="Send" bordered={true}>
              {this.renderCard()}
            </Card>
          </center>
        </Col>
      </Row>
    )
  }
}

export default Send