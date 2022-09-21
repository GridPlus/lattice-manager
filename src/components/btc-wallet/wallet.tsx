
import React from 'react';

import { Button, Avatar, Divider, Statistic, List, Row, Card, Tag} from 'antd';
import { 
  CaretLeftOutlined, CaretRightOutlined, ClockCircleOutlined, 
  ArrowDownOutlined, ArrowUpOutlined, ReloadOutlined
} from '@ant-design/icons';
import { PageContent } from '../index'
import { constants } from '../../util/helpers'
import { AppContext } from '../../store/AppContext';

class Wallet extends React.Component<any, any> {
  static contextType = AppContext;
  context = this.context as any;

  componentDidMount() {
    if (this.props.session) {
      this.props.session.getBtcWalletData()
    }
  }

  getInnerWidth() {
    return document.getElementById('main-content-inner')?.offsetWidth;
  }

  // Make sure text doesn't overflow on smaller screens. We need to trim larger strings
  ensureTrimmedText(text) {
    if (!this.context.isMobile) return text;
    const maxChars = this.getInnerWidth() / 22;
    if (text.length > maxChars) return `${text.slice(0, maxChars)}...`
    return text;
  }

  // Render a transaction in a list
  renderListItem(item) {
    // Label to view transaction on explorer
    const label = (
      //@ts-expect-error
      <div align={this.context.isMobile ? "left" : "right"}>
        {item.confirmed ? (
          <p>
            {item.incoming ? 'Received ' : 'Sent '}
            {getDateDiffStr(item.timestamp)} ago
          </p>) : null}
        <Button size="small" 
                href={`${constants.BTC_TX_BASE_URL}/${item.id}`} 
                target="_blank"
          >View</Button>
      </div>
    );
    if (item.value === 0) {
      // This is an internal transaction, meaning all spenders and recipients
      // are addresses we control
      return (
        <List.Item key={item.hash}>
          <List.Item.Meta avatar={<Avatar src={'/BTC.png'}/>}
                          title='Internal Transaction'
                          description='This transaction sender and recipient are your addresses.'
          />
          {label}
        </List.Item>
      )
    }
    // Information about the transaction
    const title = `${item.value / Math.pow(10, 8)} BTC`
    const subtitle = `\t${this.ensureTrimmedText(item.recipient)}`;
    const itemMeta = (
      <List.Item.Meta avatar={<Avatar src={'/BTC.png'}/>}
                      title={item.confirmed ? (
                        <p>{`${title}`}</p>
                      ) : (
                        <p><i>{`${title}`}</i></p>
                      )}
                      description={item.confirmed ? (
                        <p>
                          {item.incoming ? (
                            <ArrowDownOutlined/>
                          ) : (
                            <ArrowUpOutlined/>
                          )}
                          {`${subtitle}`}
                        </p>
                      ) : (
                        <p>
                          {item.incoming ? (
                            <ArrowDownOutlined/>
                          ) : (
                            <ArrowUpOutlined/>
                          )}
                          <i>{`${subtitle}`}</i>
                        </p>
                      )}
      />
    )
    if (this.context.isMobile) {
      return (
        <List.Item key={item.hash}>
          <Row justify='center'>{itemMeta}</Row>
          <Row justify='center'>{label}</Row>
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
    if (!this.props.session)
      return;
    const lastUpdated = this.props.session.lastFetchedBtcData;
    if (!lastUpdated) {
      return (
        <Tag color={'red'}>Never</Tag>
      )
    }
    //@ts-expect-error
    const elapsedSec = Math.floor((new Date() - lastUpdated) / 1000);
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
      timeType = elapsed === 1 ? 'min' : 'mins';
      color = 'green'
    } else if (elapsedSec < 172800) {
      // Less than a 2 days we display hours 
      elapsed = Math.floor(elapsedSec / 3600);
      timeType = elapsed === 1 ? 'hour' : 'hours';
      color = 'orange';
    } else { 
      // Otherwise display days
      elapsed = Math.floor(elapsedSec / 86400);
      timeType = 'days';
      color = 'red';
    }
    return (
      <Tag color={color}>{`${elapsed} ${timeType} ago`}</Tag>
    )
  }

  renderList() {
    const txs = {
      confirmed: this.props.session.getBtcTxs(),
      pending: this.props.session.getBtcTxs(false),
    }
    return (
      <div>
        {txs.pending.length > 0 ? (
          <Card title={<p><ClockCircleOutlined/> Pending</p>} 
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
    const btcBalance = this.props.session.getBtcBalance() / constants.SATS_TO_BTC;
    const btcPrice = this.props.session.btcPrice;
    return (
      <div>
        <Row justify='center' style={{margin: "20px 0 0 0"}}>
            <Statistic title="Balance" value={`${btcBalance} BTC`} />
        </Row>
        <Row justify='center'>
          <Statistic title="USD Value" value={btcBalance * btcPrice} precision={2} />
        </Row>
      </div>
    )
  }

  renderPages() {
    const page = this.props.session.getPage();
    const txs = this.props.session.getBtcTxs();
    return (
      <center style={{margin: "20px 0 0 0"}}>
        {page > 1 ? (
          <Button onClick={() => {this.props.pageTurnCb(page-1)}}>
            <CaretLeftOutlined/>
          </Button>
        ) : null}
        {txs.length >= constants.PAGE_SIZE ? (
          <Button onClick={() => { this.props.pageTurnCb(page+1)}}>
            <CaretRightOutlined/>
          </Button>
        ): null}
      </center>
    )
  }

  renderStartCard() {
    return (
      <Card title={`BTC Wallet`} bordered={true}>
        <center>
          <p>You have not loaded any addresses yet.</p>
          <Button size="large" 
                  type="primary" 
                  ghost 
                  onClick={() => {this.props.refreshData()}}
          >
            Start
          </Button>
        </center>
      </Card>
    )
  }

  renderContent() {
    const lastUpdated = this.props.session.lastFetchedBtcData;
    if (!lastUpdated) {
      return this.renderStartCard();
    }
    return (
      <div>
        <Card title={`BTC Wallet`} bordered={true}>
          <Row justify='center'>
            Last Update&nbsp;{this.renderLastUpdatedTag()}
            <Button size="small" 
                    type="primary" 
                    ghost 
                    onClick={() => {this.props.refreshData()}}
            >
              Refresh <ReloadOutlined/>
            </Button>
          </Row>
          <Row justify='center' style={{margin: "20px 0 0 0"}}>
            {this.renderHeader()}
          </Row>
        </Card>
        <Divider/>
        <div>
          {this.renderList()}
          {this.renderPages()}
        </div>
      </div>
    )
  }

  render() {
    const content = (
      <center>
        {this.renderContent()}
      </center>      
    )
    return (
      <PageContent content={content} />
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

  //@ts-expect-error
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