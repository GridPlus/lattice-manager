import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Card, Col, Icon, Input, Row, Spin } from 'antd'
import './styles.css'
import { constants, } from '../util/helpers';

const defaultState = {
  contract: null, defs: [], success: false, loading: false,
}

class EthContracts extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      contract: null,
      defs: [],
      success: false,
      loading: false
    }

    this.addContract = this.addContract.bind(this);
    this.onSmartContractAddress = this.onSmartContractAddress.bind(this);
  }

  onSmartContractAddress(input) {
    if (input.slice(0, 2) !== '0x' || false === (/^[0-9a-fA-F]+$/).test(input.slice(2)) || input.length !== 42) {
      // Not a valid address
      this.setState({ error: 'Invalid Ethereum contract address', ...defaultState });
    } else {
      this.setState({ loading: true })
      fetch(`${constants.GRIDPLUS_CLOUD_API}/contractData/${input}`)
      .then((response) => response.json())
      .then((resp) => {
        if (resp.err) {
          this.setState({ error: resp.err.toString(), ...defaultState })
        } else {
          try {
            const defs = this.props.session.client.parseAbi('etherscan', resp.result);
            this.setState({ defs, contract: input, error: null, success: false, loading: false })
          } catch (err) {
            let errStr = err.toString()
            // The most common error will be from our lack of tuple support so let's use a custom string
            if (errStr === 'Error: Unsupported type: tuple[]')
              errStr = 'This contract contains "tuple" types, which are not yet supported. We are working on support for the next version!'
            this.setState({ error: errStr, ...defaultState })
          }
        }
      })
      .catch((err) => {
        this.setState({ error: err.toString(), ...defaultState })
      });
    }
  }

  addContract() {
    this.setState({ loading: true })
    this.props.session.addAbiDefs(this.state.defs, (err) => {
      if (err) {
        this.setState({ error: err.toString(), loading: false, success: false })
      } else {
        this.setState({ error: null, loading: false, success: true })
      }
    })
  }


  renderBanner() {
    if (this.state.error) {
      return (
        <Alert
          message="Error"
          description={this.state.error}
          type="error"
          closable
          onClose={() => { this.setState({ error: null, ...defaultState })}}
        />
      )
    } else if (this.state.loading) {
      return (
        <div>
          <Spin indicator={(<Icon type="loading"/>)}/>
          <br/>
        </div>
      )
    }
  }

  renderCard() {
    return (
      <div>
        <p>
          You can add Ethereum smart contract data to your Lattice. Transactions calling saved
          smart contract functions are displayed in a more readable way.
          <br/><br/>
          Search for a verified smart contract:
        </p>
        <Input.Search
          placeholder="Contract address"
          allowClear
          enterButton
          onSearch={this.onSmartContractAddress}
        />
        <br/>
        <br/>
        {this.state.contract ? (
          <Card title={this.state.contract}>
            <p>Found <b>{this.state.defs.length}</b> functions to add from this contract.</p>
            <Button type="primary" onClick={this.addContract}>Send to Lattice</Button>
            {this.state.success ? (
              <div>
                <br/>
                <Alert 
                  type="success"
                  message="Success"
                  description="Successfully sent data to Lattice. You must 
                              confirm all functions on your Lattice for them to be saved."
                /> 
              </div>
            ) : null}
          </Card>
        ): null}
      </div>
    )
  }

  render() {
    const content = (
      <center>
        {this.renderBanner()}
        <Card title={'Ethereum Smart Contracts'} bordered={true}>
          {this.renderCard()}
        </Card>
      </center>      
    )
    return this.props.isMobile() ? content : (
      <Row justify={'center'}>
        <Col span={14} offset={5} style={{maxWidth: '600px'}}>
          {content}
        </Col>
      </Row>
    )
  }
}

export default EthContracts
