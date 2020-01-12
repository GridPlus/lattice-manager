
import React from 'react';
import 'antd/dist/antd.css'
import { Avatar, Divider, Statistic, List, Row, Col, Card } from 'antd';

class Wallet extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      balance: 0,
      usdValue: 0,
      txs: [],
    }
  }

  componentDidMount() {
    this.setState({
      balance: this.props.session.getBalance(this.props.currency),
      usdValue: this.props.session.getUSDValue(this.props.currency),
      txs: this.props.session.getTxs(this.props.currency),
    })
  }

  // Render a transaction in a list
  renderListItem(item) {
    // Transaction:
    /*
    value: 0.005260666000300001
to: "0x1c96099350f13d558464ec79b9be4445aa0ef579"
from: "0xb91bcfd9d30178e962f0d6c204ce7fd09c05d84c"
fee: "0.0000315"
incoming: false
hash: "0xf1bfe45aaf8dc8ca379aa6661bf3af9f2d71f27d90a64d618e7ba1cfdba66ca5"
currency: "ETH"
asset: "ETH"
height: "5394552"
status: "Received"
timestamp: 1573057414000
title: "0x1c96099350f13d558464ec79b9be4445aa0ef579"
type: "subtract"
contractAddress: null
link: "https://rinkeby.etherscan.io/tx/0xf1bfe45aaf8dc8ca379aa6661bf3af9f2d71f27d90a64d618e7ba1cfdba66ca5"
lastUpdated: 1578858115022
*/

    return (
      <List.Item key={item.foo}>
        <List.Item.Meta
          avatar={
            <Avatar src={`/${this.props.currency}.png`} />
          }
          title={item.foo}
          description={item.foo}
        />
        <div>Content</div>
      </List.Item>
    )
  }

  renderList() {
    return (
       <List
        itemLayout="horizontal"
        dataSource={this.state.txs}
        renderItem={item => (
          this.renderListItem(item)
        )}
      />
    )
  }

  render() {
    return (
      <div>
        <Row gutter={16}>
          <Card title={`${this.props.currency} Wallet`} bordered={true}>
            <Col span={12}>
              <Statistic title="Balance" value={`${this.state.balance} ${this.props.currency}`} />
            </Col>
            <Col span={12}>
              <Statistic title="USD Value" value={this.state.usdValue} precision={2} />
            </Col>
          </Card>
        </Row>
        <Divider/>
        <Row>
          <Card title="Transactions" bordered={true}>
            {this.renderList()}
          </Card>
        </Row>
      </div>
    )
  }


}

export default Wallet
