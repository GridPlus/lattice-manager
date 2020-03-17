
import React from 'react';
import 'antd/dist/antd.css'
import { Button, Avatar, Divider, Statistic, List, Row, Col, Card, Icon, Tag, Spin} from 'antd';
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
      lastUpdated: null,
      tick: 0,
      windowWidth: document.getElementById('main-content-inner').offsetWidth,
    }

    this.updateWidth = this.updateWidth.bind(this);
  }

  componentDidMount() {
    this.setState({
      balance: this.props.session.getBalance(this.props.currency),
      usdValue: this.props.session.getUSDValue(this.props.currency),
      txs: this.props.session.getTxs(this.props.currency),
      lastUpdated: this.props.lastUpdated,
    })
    // Tick every 15 seconds to force a re-rendering of the lastUpdated tag
    setInterval(() => {
      this.setState({ tick: this.state.tick + 1 })
    }, 2000)
    window.addEventListener('resize', this.updateWidth);
  }

  componentDidUpdate() {
    if (this.props.lastUpdated !== this.state.lastUpdated) {
      this.setState({
        balance: this.props.session.getBalance(this.props.currency),
        usdValue: this.props.session.getUSDValue(this.props.currency),
        txs: this.props.session.getTxs(this.props.currency),
        lastUpdated: this.props.lastUpdated,
      })
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWidth);
  }

  updateWidth() {
    this.setState({ windowWidth:  document.getElementById('main-content-inner').offsetWidth });
  }

  // Make sure text doesn't overflow on smaller screens. We need to trim larger strings
  ensureTrimmedText(text) {
    if (this.state.windowWidth > 500) return text;
    const maxChars = this.state.windowWidth / 30;
    if (text.length > maxChars) return `${text.slice(0, maxChars)}...`
    return text;
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
    const isPending = item.height === -1;
    const title = `${item.value.toFixed(8)} ${item.asset}`;
    const subtitle = item.incoming ? `From: ${this.ensureTrimmedText(item.from)}` : `To: ${this.ensureTrimmedText(item.to)}`;
    const label = (
      <div align="right">
        {!isPending ? (
          <p>
            {item.incoming ? 'Received ' : 'Sent '}
            {getDateDiffStr(item.timestamp)} ago&nbsp; 
            {item.incoming ? (
              <Icon type="down-circle" style={{color: GREEN}}/>
            ) : (
              <Icon type="up-circle" style={{color: RED}}/>
            )}
          </p>) : (
            <p><Spin indicator={(<Icon type="loading"/>)}/></p>
          )}
        <Button size="small" href={item.link} target="_blank">View</Button>
      </div>
    );
    return (
      <List.Item key={item.hash}>
        <List.Item.Meta
          avatar={
            <Avatar src={`/${item.asset}.png`} />
          }
          title={!isPending ? (<p>{`${title}`}</p>) : (<p><i>{`${title}`}</i></p>)}
          description={!isPending ? (<p>{`${subtitle}`}</p>) : (<p><i>{`${subtitle}`}</i></p>)}
        />
        {label}
      </List.Item>
    )
  }

  renderLastUpdatedTag() {
    const elapsedSec = Math.floor((new Date() - this.state.lastUpdated) / 1000);
    let elapsed, timeType, color;
    if (elapsedSec < 60) {
      // Just display that it was updated "seconds" ago if we're under a minute
      elapsed = '';
      timeType = 'seconds';
      color = 'green';
    } else if (elapsedSec < 3600) {
      // A couple minutes is fine, but more than 10 and there's probably a connectivity
      // problem -- display orange warning tag
      elapsed = Math.floor(elapsedSec / 60);
      timeType = 'min';
      color = elapsed > 10 ? 'orange' : 'green';
    } else { 
      // Red means there's def a connectivity issue. We probably won't ever get here
      elapsed = '>1';
      timeType = 'hour';
      color = 'red';
    }
    return (
      <Tag color={color}>{`${elapsed} ${timeType} ago`}</Tag>
    )
  }

  separatePendingTxs() {
    const pending = [];
    const confirmed = [];
    this.state.txs.forEach((tx) => {
      if (tx.height === -1) pending.push(tx)
      else                  confirmed.push(tx);
    });
    return {
      pending, confirmed
    }
  }

  renderList() {
    const txs = this.separatePendingTxs();
    return (
      <div>
        {txs.pending.length > 0 ? (
          <Card title={<p><Icon type="clock-circle"/> Pending</p>} 
                bordered={true}
                style={{ margin: '0 0 30px 0'}}>
            <List
              itemLayout="horizontal"
              dataSource={txs.pending}
              renderItem={item => (
                this.renderListItem(item)
              )}
            />
          </Card>
        ): null}
        <Card title="Transactions" bordered={true}>
          <List
            itemLayout="horizontal"
            dataSource={txs.confirmed}
            renderItem={item => (
              this.renderListItem(item)
            )}
          />
        </Card>
      </div>
    )
  }

  renderHeader() {
    if (this.state.windowWidth > 500) {
      return (
        <Row style={{margin: "20px 0 0 0"}}>
          <Col span={12}>
            <Statistic title="Balance" value={`${this.state.balance} ${this.props.currency}`} />
          </Col>
          <Col span={12}>
            <Statistic title="USD Value" value={this.state.usdValue} precision={2} />
          </Col>
        </Row>
      )
    } else {
      return (
        <div>
          <Row style={{margin: "20px 0 0 0"}}>
            <Statistic title="Balance" value={`${this.state.balance} ${this.props.currency}`} />
          </Row>
          <Row style={{margin: "10px 0 0 0"}}>
            <Statistic title="USD Value" value={this.state.usdValue} precision={2} />
          </Row>
        </div>
      )
    }
  }

  render() {
    return (
      <div style={{width: this.state.windowWidth - 10}}>
        <Row gutter={16}>
          <Card title={`${this.props.currency} Wallet`} bordered={true}>
            <Row>
              Last Updated {this.renderLastUpdatedTag()}
              {this.props.stillSyncingAddresses === true ? (
                <div>
                  <Tag color="orange">Still Fetching Addresses</Tag> 
                  <Spin size={"small"}/>
                </div>
              ): (
                <Button size="small" type="link" icon="reload" onClick={() => {this.props.refreshData(null)}}></Button>
              )}
            </Row>
            <Row style={{margin: "20px 0 0 0"}}>
              {this.renderHeader()}
            </Row>
          </Card>
        </Row>
        <Divider/>
        <Row>
          {this.renderList()}
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