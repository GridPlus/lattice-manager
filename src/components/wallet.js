
import React from 'react';
import 'antd/dist/antd.css'
import { Button, Avatar, Divider, Statistic, List, Row, Card, Icon, Tag, Spin} from 'antd';
import { constants, getCurrencyText } from '../util/helpers'
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
    }
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

  getInnerWidth() {
    return document.getElementById('main-content-inner').offsetWidth;
  }

  // Make sure text doesn't overflow on smaller screens. We need to trim larger strings
  ensureTrimmedText(text) {
    if (!this.props.isMobile()) return text;
    const maxChars = this.getInnerWidth() / 22;
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

    function getTokenName(item) {
      if (item.currency === 'ETH' && item.asset !== 'ETH' && item.contractAddress != null)
        return item.asset;
      return null;
    }

    function getTokenImageURI(item) {
      if (item.asset === 'BTC') {
        return `/BTC.png`;
      } else if (item.asset === 'ETH') {
          return `/ETH.png`
      } else if (getTokenName(item) !== null) {
          return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${item.contractAddress}/logo.png`
      } else {
        return `/token.png`;
      }
    }

    function getValue(item) {
      if (getTokenName(item) === null)
        return item.value.toFixed(8);
      return (item.value / 10 ** (Number(item.tokenDecimals) || 0))
    }

    function getTitle(i) {
      const tokenName = getTokenName(i);
      if (tokenName !== null)
        return `${getValue(i)} ${tokenName}`
      else if (i.value === 0 && i.asset === 'ETH' && !i.incoming)
        return 'Contract Interaction'
      else
        return `${getValue(i)} ${item.asset}`
    }
    const isPending = item.height === -1;
    const title = getTitle(item);
    const subtitle = item.incoming ? `From: ${this.ensureTrimmedText(item.from)}` : `To: ${this.ensureTrimmedText(item.to)}`;
    const label = (
      <div align={this.props.isMobile() ? "left" : "right"}>
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
            <Spin indicator={(<Icon type="loading"/>)}/>
          )}
        <Button size="small" href={item.link} target="_blank">View</Button>
      </div>
    );
    const itemMeta = (
      <List.Item.Meta
        avatar={
          <Avatar src={getTokenImageURI(item)} />
        }
        title={!isPending ? (<p>{`${title}`}</p>) : (<p><i>{`${title}`}</i></p>)}
        description={!isPending ? (<p>{`${subtitle}`}</p>) : (<p><i>{`${subtitle}`}</i></p>)}
      />
    )
    if (this.props.isMobile()) {
      return (
        <List.Item key={item.hash}>
          <Row>{itemMeta}</Row>
          <Row>{label}</Row>
        </List.Item>
      )    
    } else {
      return(
        <List.Item key={item.hash}>
          {itemMeta}
          {label}
        </List.Item>
      )
    }
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

  deDuplicateTxs() {
    const hashes = [];
    const newTxs = [];
    this.state.txs.forEach((tx) => {
      if (hashes.indexOf(tx.hash) === -1) {
        hashes.push(tx.hash);
        newTxs.push(tx);
      }
    })
    return newTxs;
  }

  separatePendingTxs(txs) {
    const pending = [];
    const confirmed = [];
    txs.forEach((tx) => {
      if (tx.height === -1) pending.push(tx)
      else                  confirmed.push(tx);
    });
    return {
      pending, confirmed
    }
  }

  renderList() {
    const txs = this.separatePendingTxs(this.deDuplicateTxs());
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

  convertBalance() {
    if (this.props.currency === 'BTC')
      return this.state.balance.toFixed(8)
    else
      return this.state.balance.toFixed(10)
  }

  renderHeader() {
    if (this.props.isMobile()) {
      return (
        <div>
          <Row style={{margin: "20px 0 0 0"}}>
              <Statistic title="Balance" value={`${this.convertBalance()} ${this.props.currency}`} />
          </Row>
          <Row>
            <Statistic title="USD Value" value={this.state.usdValue} precision={2} />
          </Row>
        </div>
      )
    } else {
      return (
        <div>
          <Row style={{margin: "20px 0 0 0"}}>
            <Statistic title="Balance" value={`${this.convertBalance()} ${this.props.currency}`} />
          </Row>
          <Row style={{margin: "10px 0 0 0"}}>
            <Statistic title="USD Value" value={this.state.usdValue} precision={2} />
          </Row>
        </div>
      )
    }
  }

  renderPages() {
    // We only paginate results for ETH
    if (this.props.currency !== 'ETH')
      return;
    const page = this.props.session.getPage();
    return (
      <center style={{margin: "20px 0 0 0"}}>
        {page > 1 ? (
          <Button onClick={() => {this.props.pageTurnCb(page-1)}}>
            <Icon type="caret-left"/>
          </Button>
        ) : null}
        {this.state.txs.length >= constants.PAGE_SIZE ? (
          <Button onClick={() => { this.props.pageTurnCb(page+1)}}>
            <Icon type="caret-right"/>
          </Button>
        ): null}
      </center>
    )
  }

  render() {
    return (
      <div style={{width: this.getInnerWidth() - 10}}>
        <Row gutter={16}>
          <Card title={`${getCurrencyText(this.props.currency)} Wallet`} bordered={true}>
            <Row>
              Last Updated {this.renderLastUpdatedTag()}
              {this.props.stillSyncingAddresses === true ? (
                <div>
                  <Tag color="red">Still Fetching Addresses</Tag> 
                  <Spin indicator={<Icon type="loading"/>} size={"small"}/>
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
          {this.renderPages()}
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