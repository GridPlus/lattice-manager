import React from 'react';
import 'antd/dist/antd.dark.css'
import { Alert, Button, Card, Row, Input, InputNumber, Empty, Statistic, notification } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { PageContent } from '../index'
import { allChecks } from '../../util/sendChecks';
import { 
  constants, buildBtcTxReq, getBtcNumTxBytes, getCurrencyText
} from '../../util/helpers'
import '../styles.css'
const BN = require('bignumber.js');
const RECIPIENT_ID = "recipient";
const VALUE_ID = "value";
// Conversion from sats to BTC
const BTC_FACTOR = Math.pow(10, 8);

class Send extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      recipient: '',
      value: null,
      recipientCheck: null,
      valueCheck: null,
      error: null,
      isLoading: false,
      txHash: null,
      btcFeeRate: constants.BTC_DEFAULT_FEE_RATE,
      ensResolvedAddress: null,
    }

    this.handleENSResolution = this.handleENSResolution.bind(this);
    this.renderBanner = this.renderBanner.bind(this);
    this.renderSubmitButton = this.renderSubmitButton.bind(this);
    this.renderValueLabel = this.renderValueLabel.bind(this);
    this.submit = this.submit.bind(this);
    this.buildBtcRequest = this.buildBtcRequest.bind(this);
    this.updateBtcFeeRate = this.updateBtcFeeRate.bind(this);
  }

  componentDidMount() {
    fetch('https://bitcoinfees.earn.com/api/v1/fees/recommended')
    .then((response) => response.json())
    .then((resp) => {
      if (resp.hourFee)
        this.setState({ btcFeeRate: resp.hourFee })
    })
    .catch((err) => {
      console.error(`Error from fetching fee rates: ${err.toString()}`)
    })
  }

  //========================================================
  // STATE MANAGERS
  //========================================================

  handleENSResolution(err, address) {
    if (err || address === null)
      return this.setState({ recipientCheck: false, ensResolvedAddress: null })
    // If we got an address, stash that under "ensResolvedAddress" so as to not
    // overwrite the text in the display component.
    return this.setState({ recipientCheck: true, ensResolvedAddress: address })
  }

  updateRecipient(evt) {
    const val = evt.target.value;
    const check = allChecks[this.props.currency].recipient(val);
    this.setState({ 
      recipient: val,
      ensResolvedAddress: null,
      recipientCheck: check, 
    });
  }

  checkValue(val) {
    // Verify that it is smaller than the balance
    const balance = this.props.session.getBalance(this.props.currency);
    if (val === '' || val === null || val === undefined)
      return null;
    return (Number(balance) >= Number(val));
  }

  updateValue(evt) {
    let val = evt.target.value;
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
      valueCheck: this.checkValue(val) 
    });
  }

  updateBtcFeeRate(value) {
    this.setState({ btcFeeRate: value })
  }

  //========================================================
  // TRANSACTION-RELATED BUILDERS AND HOOKS
  //========================================================
  buildBtcRequest() {
    const req = buildBtcTxReq(this.state.recipient, 
                              this.state.value,
                              this.props.session.getUtxos('BTC'), 
                              this.props.session.addresses['BTC'],  
                              this.props.session.addresses['BTC_CHANGE'],
                              this.state.btcFeeRate);
    if (req.error) {
      this.setState({ error: req.error });
      return null;
    } else if (!req.data) {
      this.setState({ error: 'Invalid response when building BTC transaction request. '});
      return null;
    }
    return req;
  }

  submit() {
    let req;
    switch (this.props.currency) {
      case 'BTC':
        req = this.buildBtcRequest();
        break;
      default:
        console.error('Invalid currency in props.')
        return;
    }
    if (req) {
      notification.open({
        message: "Waiting for signature...",
        key: 'signNotification',
        description: `We have sent the transaction to your Lattice for signing.
                      After approval, the transaction will be broadcast.`,
        duration: 0,
      });
      this.setState({ isLoading: true });
      this.props.session.sign(req, (err, txHash) => {
        notification.close('signNotification');
        if (err) {
          // Display an error banner
          this.setState({ 
            error: err.message, 
            isLoading: false, 
            txHash: null 
          })
        } else {
          // Start watching this new tx hash for confirmation
          this.setState({ 
            recipient: '',
            recipientCheck: null,
            value: null,
            valueCheck: null,
            txHash: txHash, 
            error: null, 
            isLoading: false 
          })
        }
      })
    }
  }

  //========================================================
  // HELPERS
  //========================================================

  getUrl() {
    switch (this.props.currency) {
      case 'BTC':
        return `${constants.BTC_TX_BASE_URL}/${this.state.txHash}`;
      default:
        return '';
    }
  }

  //========================================================
  // RENDERERS
  //========================================================

  renderValueLabelTitle() {
    return (
      <p style={{textAlign: 'left'}}>
        <b>Value</b>
        <Button type="link"
                onClick={() => { 
                  this.updateValue({ 
                    target: { 
                      value: this.calculateMaxValue() 
                    } 
                  }) 
                }}>
          Max
        </Button>
        {this.renderIcon(VALUE_ID)}
      </p>
    )
  }

  renderValueLabel() {
    const input = (
      <Input type="text"
              id={VALUE_ID} 
              value={this.state.value} 
              onChange={this.updateValue.bind(this)}
      />
    );
    if (this.props.currency === 'BTC') {
      // For BTC, we don't need to worry about other assets
      return (
        <Row justify='center'>
          {this.renderValueLabelTitle()}
          {input}
        </Row>
      );
    }
  }

  renderRecipientLabel() {
    return (          
      <Row justify='center'>  
        <p style={{textAlign:'left'}}>
          <b>Recipient</b>
          &nbsp;&nbsp;&nbsp;{this.renderIcon(RECIPIENT_ID)}
        </p>
        <Input type="text" 
                id={RECIPIENT_ID} 
                value={this.state.recipient} 
                onChange={this.updateRecipient.bind(this)}
        />
      </Row>
    )
  }

  renderIcon(id) {
    const name = `${id}Check`;
    const isValid = this.state[name];
    if (isValid === true) {
      return (<CheckCircleOutlined theme="filled" style={{color: 'green'}}/>)
    } else if (isValid === false) {
      return (<CloseCircleOutlined theme="filled" style={{color: 'red'}}/>)
    } else {
      return;
    }
  }

  renderBanner() {
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
    } else if (this.state.txHash) {
      const desc = this.props.isMobile() ? (
        <p>Transaction signed and broadcast successfully.&nbsp;
        <a className='lattice-a' target='_blank' rel='noopener noreferrer' href={this.getUrl()}>View</a></p>
      ) : (
        <p>Your transaction was signed and broadcast successfully. 
        Your hash is: <a className='lattice-a' target='_blank' rel='noopener noreferrer' href={this.getUrl()}>
          {this.state.txHash}
        </a></p>
      )
      return (
        <Alert
          type="success"
          message="Success"
          description={desc}
        />
      )
    } else {
      return;
    }
  }

  renderExtra() {
    if (this.props.currency === 'BTC') {
      return (
        <div>
          <Row justify='center'>
            <b><p>Fee (sat/byte):</p></b>
          </Row>
          <Row justify='center'>        
            <InputNumber
              min={1}
              max={100}
              onChange={this.updateBtcFeeRate}
              value={this.state.btcFeeRate}
            />
          </Row>
        </div>
      )
    }
  }

  calculateMaxValue() {
    const balance = this.props.session.getBalance(this.props.currency);
    switch (this.props.currency) {
      case 'BTC':
        // To spend all BTC, get the size of all UTXOs and calculate the fee required
        // to spend them all
        const txBytes = getBtcNumTxBytes(this.props.session.getUtxos('BTC').length);
        const feeSat = this.state.btcFeeRate * txBytes;
        return Math.max((balance - (feeSat / BTC_FACTOR)).toFixed(8), 0);
      default:
        return 0;
    }
  }

  renderSubmitButton() {
    // If all checks have passed, display the button
    const isValidReq = (
      (true === this.state.valueCheck) &&
      (allChecks[this.props.currency].full(this.state) || this.state.ensResolvedAddress !== null)
    );

    if (this.state.isLoading) {
      return (
        <Button type="primary"
                style={{ margin: '30px 0 0 0'}}
                loading>
          Waiting...
        </Button>
      )
    } else if (isValidReq) {
      return (
        <Button type="primary" 
                onClick={this.submit} 
                style={{ margin: '30px 0 0 0'}}>
          Send
        </Button>
      )
    } else {
      return (
        <Button type="primary"
                style={{ margin: '30px 0 0 0'}}
                disabled>
          Send
        </Button>
      )
    }
  }

  renderBalance() {
    let balance = new BN(this.props.session.getBalance(this.props.currency));
    if (this.props.currency === 'BTC') {
      balance = balance.toFixed(8);
    }
    return (
      <Row justify='center' style={{margin: "0 0 20px 0"}}>
        <Statistic title="Balance" value={`${balance} ${this.props.currency}`} />
      </Row>
    )
  }

  renderCard() {
    const hasAddressesSlot = this.props.session.addresses[this.props.currency];
    const hasAddresses =  hasAddressesSlot ? 
                          this.props.session.addresses[this.props.currency].length > 0 : 
                          false;
    if (hasAddresses) {
      return (
        <div>
          {this.renderBalance()}
          <div>
            {this.renderRecipientLabel()}
          </div>
          <div style={{margin: "20px 0 0 0"}}>
            {this.renderValueLabel()}
          </div>
          <div style={{margin: "20px 0 0 0"}}>
            {this.renderExtra()}
          </div>
          {this.renderSubmitButton()}
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
    if (this.props.currency === 'ETH') {
      return;
    }
    const content = (
      <center>
        {this.renderBanner()}
        <Card title={`Send ${getCurrencyText(this.props.currency)}`} bordered={true}>
          {this.renderCard()}
        </Card>
      </center>      
    )
    return (
      <PageContent content={content} isMobile={this.props.isMobile}/>
    )
  }
}

export default Send
