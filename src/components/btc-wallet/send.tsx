import React from 'react';
import 'antd/dist/antd.dark.css'
import { Alert, Button, Card, Row, Input, InputNumber, Empty, Statistic, notification } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { PageContent } from '../index'
import { allChecks } from '../../util/sendChecks';
import { constants, buildBtcTxReq, getBtcNumTxBytes } from '../../util/helpers'
import '../styles.css'
const RECIPIENT_ID = "recipient";
const VALUE_ID = "value";

class Send extends React.Component<any, any> {
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
    fetch('https://blockstream.info/api/fee-estimates')
    .then((response) => response.json())
    .then((resp) => {
      if (resp['1']) { // Expected confirmation in 1 block
        this.setState({ btcFeeRate: Math.ceil(Number(resp['1'])) })
      }
      if (this.props.session) {
        this.props.session.getBtcWalletData()
      }
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
    const check = allChecks.BTC.recipient(val);
    this.setState({ 
      recipient: val,
      ensResolvedAddress: null,
      recipientCheck: check, 
    });
  }

  checkValue(val) {
    // Verify that it is smaller than the balance
    const balance = this.props.session.getBtcBalance() / constants.SATS_TO_BTC;
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
                              this.props.session.btcUtxos, 
                              this.props.session.addresses['BTC'],  
                              this.props.session.addresses['BTC_CHANGE'],
                              this.state.btcFeeRate,
                              this.state.value === this.calculateMaxValue());
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
    const req = this.buildBtcRequest();
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
            error: err, 
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
            txHash, 
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
    return `${constants.BTC_TX_BASE_URL}/${this.state.txHash}`;
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
                      value: this.calculateMaxValue(),
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
    return (
      <Row justify='center'>
        {this.renderValueLabelTitle()}
        {input}
      </Row>
    );
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
      return (<CheckCircleOutlined style={{color: 'green'}}/>)
    } else if (isValid === false) {
      return (<CloseCircleOutlined style={{color: 'red'}}/>)
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
        <p>
          Your transaction was signed and broadcast successfully. 
          Please return to your History tab and refresh to see status.
        </p>
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

  calculateMaxValue() {
    const balance = this.props.session.getBtcBalance();
    const utxos = this.props.session.getBtcUtxos();
    // To spend all BTC, get the size of all UTXOs and calculate the fee required
    const txBytes = getBtcNumTxBytes(utxos.length);
    const feeSat = Math.floor(this.state.btcFeeRate * txBytes);
    // @ts-expect-error
    return Math.max(((balance - feeSat) / constants.SATS_TO_BTC).toFixed(8), 0);
  }

  renderSubmitButton() {
    // If all checks have passed, display the button
    const isValidReq = (
      (true === this.state.valueCheck) &&
      (allChecks.BTC.full(this.state) || this.state.ensResolvedAddress !== null)
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
    let balance = this.props.session.getBtcBalance() / constants.SATS_TO_BTC;
    return (
      <Row justify='center' style={{margin: "0 0 20px 0"}}>
        <Statistic title="Balance" value={`${balance} BTC`} />
      </Row>
    )
  }

  renderCard() {
    const hasAddressesSlot = this.props.session.addresses.BTC;
    const hasAddresses =  hasAddressesSlot ? 
                          this.props.session.addresses.BTC.length > 0 : 
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
    const content = (
      <center>
        {this.renderBanner()}
        <Card title={'Send BTC'} bordered={true}>
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
