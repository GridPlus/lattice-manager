import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Card, Col, Row, Input, Icon, Empty, Statistic, notification, Select, Slider } from 'antd'
import { allChecks } from '../util/sendChecks';
import { constants, buildBtcTxReq, buildERC20Data, getBtcNumTxBytes, getCurrencyText, isValidENS, resolveENS, toHexStr } from '../util/helpers'
import './styles.css'
const BN = require('bignumber.js');
const RECIPIENT_ID = "recipient";
const VALUE_ID = "value";
// Conversion from sats to BTC
const GWEI_FACTOR = Math.pow(10, 9);
const BTC_FACTOR = Math.pow(10, 8);
// ETH uses bignums so we cannot safely do native JS math and must use BigInt types
const ETH_POWER = new BN('10').pow(18);
const GWEI_POWER = new BN('10').pow(9);

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
      erc20Addr: null, // null = use ETH
      ethExtraData: {
        gasPrice: constants.ETH_DEFAULT_FEE_RATE,
        gasLimit: 25000,
        data: '',
        nonce: this.props.session.ethNonce,
      },
      btcFeeRate: constants.BTC_DEFAULT_FEE_RATE,
      ensResolvedAddress: null,
    }

    this.handleENSResolution = this.handleENSResolution.bind(this);
    this.renderBanner = this.renderBanner.bind(this);
    this.renderSubmitButton = this.renderSubmitButton.bind(this);
    this.renderValueLabel = this.renderValueLabel.bind(this);
    this.submit = this.submit.bind(this);
    this.buildEthRequest = this.buildEthRequest.bind(this);
    this.buildBtcrequest = this.buildBtcRequest.bind(this);
    this.updateBtcFeeRate = this.updateBtcFeeRate.bind(this);
  }

  componentDidMount() {
    fetch('https://www.gasnow.org/api/v3/gas/price?utm_source=gpwebwallet')
    .then((response) => response.json())
    .then((resp) => {
      if (resp.code === 200 && resp.data) {
        if (resp.data.fast) {
          const data = JSON.parse(JSON.stringify(this.state.ethExtraData))
          data.gasPrice = (resp.data.fast) / GWEI_FACTOR;
          this.setState({ ethExtraData: data })
        }
      }
      return fetch('https://bitcoinfees.earn.com/api/v1/fees/recommended')
    })
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
    // For ETH, the user may have typed in an ENS name, which should be verified
    // independently.
    if (false === check && this.props.currency === 'ETH' && isValidENS(val))
      resolveENS(val, this.handleENSResolution);
  }

  checkValue(val) {
    // Verify that it is smaller than the balance
    const balance = this.props.session.getBalance(this.props.currency, this.state.erc20Addr);
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

  updateEthExtraData(evt) {
    const extraDataCopy = JSON.parse(JSON.stringify(this.state.ethExtraData));
    switch (evt.target.id) {
      case 'ethGasPrice':
        if (!isNaN(evt.target.value))
          extraDataCopy.gasPrice = evt.target.value;
        break;
      case 'ethGasLimit':
        if (!isNaN(evt.target.value) && Number(evt.target.value) < 10000000)
          extraDataCopy.gasLimit = evt.target.value;
        break;
      case 'ethNonce':
        if (!isNaN(evt.target.value))
          extraDataCopy.nonce = evt.target.value;
        break;
      case 'ethData':
        let data = evt.target.value;
        while(data.indexOf('0x') > -1) {
          const left = data.slice(0, data.indexOf('0x'));
          const right = data.slice(data.indexOf('0x') + 2);
          data = left + right;
        }
        extraDataCopy.data = data;
        break;
      default:
        break;
    }
    this.setState({ ethExtraData: extraDataCopy })
  }

  updateBtcFeeRate(value) {
    this.setState({ btcFeeRate: value })
  }

  //========================================================
  // TRANSACTION-RELATED BUILDERS AND HOOKS
  //========================================================

  getDecimals(addr) {
    let decimals = null;
    constants.ERC20_TOKENS.forEach((token) => {
      if (token.contractAddress.toLowerCase() === addr.toLowerCase())
        decimals = token.decimals;
    })
    return decimals;
  }

  buildEthRequest() {
    let _value, _data, _recipient;
    const recipient = this.state.ensResolvedAddress ?
                      this.state.ensResolvedAddress :
                      this.state.recipient;
    if (this.state.erc20Addr !== null) {
      const decimals = this.getDecimals(this.state.erc20Addr);
      // Sanity check -- should never happen
      if (decimals === null)
        throw new Error('Could not find token specified');
      _value = 0;
      _recipient = this.state.erc20Addr;
      _data = buildERC20Data(recipient, this.state.value, decimals);
    } else {
      const valueBn = new BN(this.state.value);
      _value = toHexStr(valueBn.multipliedBy(ETH_POWER));
      _recipient = recipient;
      _data = this.state.ethExtraData.data;
    }
    const txData = {
      nonce: Number(this.state.ethExtraData.nonce),
      gasPrice: (parseFloat(this.state.ethExtraData.gasPrice).toFixed(1) * GWEI_FACTOR),
      gasLimit: Math.ceil(Number(this.state.ethExtraData.gasLimit)),
      to: _recipient,
      value: _value,
      data: _data,
    };

    const req = {
      currency: 'ETH',
      data: {
        signerPath: [
          constants.BIP44_PURPOSE, 
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
      case 'ETH':
        return `${constants.ETH_TX_BASE_URL}/${this.state.txHash}`;
      case 'BTC':
        return `${constants.BTC_TX_BASE_URL}/${this.state.txHash}`;
      default:
        return '';
    }
  }

  selectToken(item) {
    const extraCopy = JSON.parse(JSON.stringify(this.state.ethExtraData));
    switch (item) {
      case 'ETH':
        extraCopy.gasLimit = 23000;
        this.setState({ erc20Addr: null, ethExtraData: extraCopy });
        break;
      case 'add':
        this.drawAddTokenModal();
        break;
      default:
        extraCopy.gasLimit = 60000;
        this.setState({ erc20Addr: item, ethExtraData: extraCopy});
        break;
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
        <Col span={18} offset={2}>
          {this.renderValueLabelTitle()}
          {input}
        </Col>
      );
    } else if (this.props.currency === 'ETH') {
      // For ETH, account for ERC20s in the form of a dropdown
      const tokensList = constants.ERC20_TOKENS.map((token) => {
        return (<Select.Option value={token.contractAddress} key={`token_${token.contractAddress}`} style={{margin: "0 20px 0 0"}}>
          {token.symbol}
        </Select.Option>);
      });
      // Buffer the ETH string
      const tokenOption = (
        <Select defaultValue={'ETH'} 
                dropdownMatchSelectWidth={false}
                onSelect={this.selectToken.bind(this)} 
                style={{"textAlign": "center"}} 
                className="select-after">
          <Select.Option value={'ETH'} key={'token_ETH'}>ETH</Select.Option>
          {tokensList}
        </Select>
      );
      
      return (
        <div>
          <Col span={18} offset={2}>
            {this.renderValueLabelTitle()}
            <Input type="text" 
                    id={VALUE_ID} 
                    value={this.state.value} 
                    onChange={this.updateValue.bind(this)}
                    addonAfter={tokenOption}
            />
          </Col>
        </div>
      );
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
        <a target={"_blank"} href={this.getUrl()}>View</a></p>
      ) : (
        <p>Your transaction was signed and broadcast successfully. 
        Your hash is: <a target={"_blank"} href={this.getUrl()}>{this.state.txHash}</a></p>
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
    if (this.props.currency === 'ETH') {
      return (
        <div>
            <Row>
              <p style={{textAlign: 'left'}}><b>Gas Price (GWei)</b></p>
              <Input type="text" 
                id={"ethGasPrice"}
                value={this.state.ethExtraData.gasPrice}
                onChange={this.updateEthExtraData.bind(this)}/>
            </Row>
            <Row style={{margin: "20px 0 0 0"}}>
              <p style={{textAlign: 'left'}}><b>Gas Limit</b></p>
              <Input type="text" 
                id={"ethGasLimit"} 
                value={this.state.ethExtraData.gasLimit}
                onChange={this.updateEthExtraData.bind(this)}/>
            </Row>
            <Row style={{margin: "20px 0 0 0"}}>
              <p style={{textAlign: 'left'}}>
                <b>Nonce</b>
                <Button onClick={() => { 
                  const ed = JSON.parse(JSON.stringify(this.state.ethExtraData)); 
                  ed.nonce = this.props.session.ethNonce;
                  this.setState({ ethExtraData: ed })}}
                  type="link">
                  Reset
                </Button>
              </p>
              <Input type="text" 
                id={"ethNonce"} 
                value={this.state.ethExtraData.nonce}
                onChange={this.updateEthExtraData.bind(this)}/>
            </Row>
            {this.state.erc20Addr === null ? (
              <Row style={{margin: "20px 0 0 0"}}>
                <p style={{textAlign: 'left'}}><b>Data</b></p>
                <Input.TextArea rows={2} 
                                id={"ethData"}
                                value={`0x${this.state.ethExtraData.data}`}
                                onChange={this.updateEthExtraData.bind(this)}/>
              </Row>
            ) : null}
        </div>
      )
    } else if (this.props.currency === 'BTC') {
      return (
        <Row>
          <p style={{textAlign: 'left'}}><b>{`Fee: ${this.state.btcFeeRate} sat/byte`}</b></p>
          <Slider
            min={10}
            max={200}
            onChange={this.updateBtcFeeRate}
            value={this.state.btcFeeRate}
          />
        </Row>
      )
    }
  }

  calculateMaxValue() {
    const balance = this.props.session.getBalance(this.props.currency, this.state.erc20Addr);
    switch (this.props.currency) {
      case 'BTC':
        // To spend all BTC, get the size of all UTXOs and calculate the fee required
        // to spend them all
        const txBytes = getBtcNumTxBytes(this.props.session.getUtxos('BTC').length);
        const feeSat = this.state.btcFeeRate * txBytes;
        return Math.max(balance - (feeSat / BTC_FACTOR), 0);
      case 'ETH':
        if (this.state.erc20Addr !== null)
          return balance;
        const gasPriceBn = new BN(this.state.ethExtraData.gasPrice);
        const gasLimitBn = new BN(this.state.ethExtraData.gasLimit);
        const feeWei = gasPriceBn.multipliedBy(gasLimitBn).multipliedBy(GWEI_POWER);
        const balanceBn = new BN(balance);
        const balanceWei = balanceBn.multipliedBy(ETH_POWER);
        const maxEth = balanceWei.minus(feeWei).div(ETH_POWER);
        return Math.max(Number(maxEth.toString(10)), 0);
      default:
        return 0;
    }
  }

  renderSubmitButton() {
    // If all checks have passed, display the button
    const isValidReq = (
      (true == this.state.valueCheck) &&
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
    let balance = new BN(this.props.session.getBalance(this.props.currency, this.state.erc20Addr));
    let token = null;
    if (this.state.erc20Addr) {
      let decimals = 18
      constants.ERC20_TOKENS.forEach((t) => {
        if (t.contractAddress.toLowerCase() === this.state.erc20Addr.toLowerCase()) {
          token = t;
          decimals = t.decimals
        }
      })
      const divisor = new BN(10).pow(decimals);
      balance = balance.div(divisor)
    }
    const name = token === null ? this.props.currency : token.symbol;
    return (
      <Row style={{margin: "0 0 20px 0"}}>
        {this.props.currency === 'ETH' ? (
          <p><i>
          Functionality is limited.<br/>
          We recommend the&nbsp;
          <a href="https://chrome.google.com/webstore/detail/metamask-gridplus-fork/ginmdlhabcljcbgnmladjeimmkblldle" target="_blank">
            GridPlus MetaMask extension 
          </a>
          &nbsp;for a better Ethereum experience.&nbsp;
          </i></p>
        ) : null}
        <Statistic title="Balance" value={`${balance} ${name}`} />
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
          <Row>
            <Col span={18} offset={2}>
              <p style={{textAlign:'left'}}>
                <b>Recipient</b>
                &nbsp;&nbsp;&nbsp;{this.renderIcon(RECIPIENT_ID)}
              </p>
              <Input type="text" 
                      id={RECIPIENT_ID} 
                      value={this.state.recipient} 
                      onChange={this.updateRecipient.bind(this)}
              />
            </Col>
          </Row>
          <Row style={{margin: "20px 0 0 0"}}>
            {this.renderValueLabel()}
          </Row>
          <Row style={{margin: "20px 0 0 0"}}>
            <Col span={18} offset={2}>
              {this.renderExtra()}
            </Col>
          </Row>
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
        <Card title={`Send ${getCurrencyText(this.props.currency)}`} bordered={true}>
          {this.renderCard()}
        </Card>
      </center>      
    )
    return this.props.isMobile() ? content : (
      <Row justify={'center'}>
        <Col span={14} offset={5}>
          {content}
        </Col>
      </Row>
    )
  }
}

export default Send
