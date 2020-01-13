
import React from 'react';
import 'antd/dist/antd.css'
import { Button, Avatar, Divider, Statistic, List, Row, Col, Card, Icon } from 'antd';
const GREEN = "#00FF00";
const RED = "#FF0000";

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
    const title = `${item.value.toFixed(8)} ${item.currency}`;
    const subtitle = item.incoming ? `From: ${item.from}` : `To: ${item.to}`;
    const label = (
      <div align="right">
        <p>
        {item.incoming ? 'Received ' : 'Sent '}
        {getDateDiffStr(item.timestamp)} ago&nbsp; 
        {item.incoming ? (
          <Icon type="down-circle" style={{color: GREEN}}/>
        ) : (
          <Icon type="up-circle" style={{color: RED}}/>
        )}
        </p>
        <Button size="small" href={item.link} target="_blank">View</Button>
      </div>
    );
    return (
      <List.Item key={item.hash}>
        <List.Item.Meta
          avatar={
            <Avatar src={`/${this.props.currency}.png`} />
          }
          title={title}
          description={subtitle}
        />
        {label}
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


// Get a human readable, string representation of the difference
// between two dates
function getDateDiffStr(ts) {
  const then = new Date(ts);
  const now = new Date();
  const min = 1000 * 60;
  const hour = min * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = week * 4;
  const year = month * 12;

  const diff = now - then;

  if (diff / min < 1) {
    return 'seconds';
  } else if (diff / hour < 1) {
    return `${Math.floor(diff/min)} minutes`;
  } else if (diff / day < 1) {
    return `${Math.floor(diff/hour)} hours`;
  } else if (diff / week < 1) {
    return `${Math.floor(diff/day)} days`;
  } else if (diff / month < 1) {
    return `${Math.floor(diff/week)} weeks`;
  } else if (diff / year < 1) {
    return `${Math.floor(diff/month)} months`;
  } else {
    return `${Math.floor(diff/year)} years`
  }

}