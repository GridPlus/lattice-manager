import React from 'react';
import 'antd/dist/antd.css'
import { Button, Card, Col, Row, Input, Icon, Empty } from 'antd'
import { checkEth } from '../util/sendChecks';
const { Search } = Input;
const ADDRESS_SEARCH = "address";
const VALUE_SEARCH = "value";

class Send extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      windowWidth: window.innerWidth,
      recipient: '',
      value: 0,
    }

    this.updateWidth = this.updateWidth.bind(this);
    this.submit = this.submit.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.updateWidth);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWidth);
  }

  updateWidth() {
    this.setState({ windowWidth: window.innerWidth });
  }

  paste(id) {
    const e = document.getElementById(id);
    e.select();
    document.execCommand("paste")
  }

  updateRecipient(evt) {
    this.setState({ recipient: evt.target.value });
  }

  updateValue(evt) {
    let val = evt.target.value;
    let numberVal = Number(val);
    const isZeroPrefixed = val[0] === '0';
    const isLessThanOne = isZeroPrefixed && val[1] === '.';
    // Only update state if the value can be converted to a number!
    if (val === '0') {
      // Plain zero is fine
      this.setState({ value: val })
    } else if (!isNaN(numberVal)) {
      // We want to save the string, as it may contain a period
      // which is necessary for forming decimal numbers
      // Because we will be saving the string and not the number,
      // we should make sure we strip out leading zeros for numbers
      // larger than zero (i.e. 0.4 is good, 01.4 is not)
      if (isZeroPrefixed && !isLessThanOne) val = val.slice(1);
      this.setState({ value: val })
    } else if (val === '.') {
      // If the user is trying to make a decimal value <1, prefix
      // with a 0
      val = '0' + val;
      this.setState({ value: val })
    }
  }

  submit() {
    let valid = false;
    switch (this.props.currency) {
      case 'ETH':
        valid = checkEth(this.state);
        break;
      default:
        break;
    }
    console.log('submitted: valid?', valid)
  }

  renderCard() {
    if (true) {
      return (
        <div>
          <p style={{textAlign:'left'}}><b>Recipient</b></p>
          <Search type="text" 
                  id={ADDRESS_SEARCH} 
                  value={this.state.recipient} 
                  enterButton={<Icon type="snippets" />}
                  // onSearch={() => this.paste(ADDRESS_SEARCH)}
                  onChange={this.updateRecipient.bind(this)}
          />
          <p style={{margin: "20px 0 0 0", textAlign: 'left'}}><b>Value</b></p>
          <Search type="text" 
                  id={VALUE_SEARCH} 
                  value={this.state.value} 
                  enterButton={<Icon type="snippets" />}
                  // onSearch={() => this.paste(VALUE_SEARCH)}
                  onChange={this.updateValue.bind(this)}
          />
          <Button type="primary" onClick={this.submit} style={{ margin: '20px 0 0 0'}}>
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
      <Row>
        <Col span={16} offset={4}>
          <center>
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