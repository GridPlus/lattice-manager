import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Layout, Menu, Icon, Select, PageHeader, Spin, Tag } from 'antd';
import { default as SDKSession } from '../sdk/sdkSession';
import { Connect, Loading, Wallet } from './index'
const { Content, Footer, Sider } = Layout;
const { Option } = Select;

class Main extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      collapsed: false,
      currency: 'ETH',
      menuItem: 'menu-wallet',
      session: new SDKSession(),
      errMsg: null,
      pendingMsg: null,
      hasClient: false,
      waiting: false, // Waiting on asynchronous data, usually from the Lattice
      stateTick: 0, // A simple counter to track state transitions between components
    };
    this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  tick() {
    this.setState({ stateTick: this.state.stateTick + 1 })
  }

  setMsg(msg={}) {
    this.setState({
      errMsg: msg.errMsg || null,
      pendingMsg: msg.PendingMsg || null,
    })
  }

  resetClient(hasClient=false) {
    if (!hasClient) {
      this.state.session.disconnect();
    }
    this.setState({ hasClient })
    this.setMsg();
  }

  handleCurrencyChange(value) {
    this.setMsg();
    this.setState({ currency: value })
  }

  handleMenuChange(value) {
    this.setMsg();
    this.setState({ menuItem: value })
  }

  handleLogout() {
    this.resetClient(false);
    this.state.session.disconnect();
  }

  handleConnect(data) {
    this.setMsg({ pendingMsg: 'Connecting to your Lattice1...' });
    this.state.session.connect(data.deviceID, data.password, (err) => {
      // if (err) {
      //   this.resetClient();
      //   this.setState({ errMsg: 'Failed to connect to your Lattice. Please ensure your device is online and that you entered the correct DeviceID.' })
      // } else {
        this.resetClient(true);
        // Load initial balances and transactions
        this.setState({ waiting: true });
        this.state.session.loadAddresses(this.state.currency, (err) => {
          this.tick(); //  Notify state we potentially have new data
          this.setState({ waiting: false });
          if (err) return this.setMsg({ errMsg: err });  
        });
      // }
    })
  }

  onCollapse = collapsed => {
    console.log(collapsed);
    this.setState({ collapsed });
  };

  renderSidebar() {
    return (
      <Sider collapsible collapsed={this.state.collapsed} onCollapse={this.onCollapse}>
        <Menu theme="dark" defaultSelectedKeys={['menu-wallet']} mode="inline">
          <Menu.Item key="menu-wallet">
            <Icon type="wallet" />
            <span>Wallet</span>
          </Menu.Item>
          <Menu.Item key="menu-send">
            <Icon type="arrow-up" />
            <span>Send</span>
          </Menu.Item>
          <Menu.Item key="menu-receive">
            <Icon type="arrow-down" />
            <span>Receive</span>
          </Menu.Item>
        </Menu>
      </Sider>
    )
  }

  renderHeader() {
    const extra = [
      <Select key="currency-select" defaultValue="ETH" onChange={this.handleCurrencyChange}>
        <Option value="ETH">ETH</Option>
        <Option value="BTC">BTC</Option>
      </Select>
    ];
    if (this.state.hasClient) {
      extra.push(
        <Button key="logout-button" type="primary" onClick={this.handleLogout}>
          Logout
        </Button>
      )
    }
    return (
      <PageHeader
        tags={<Tag>GridPlus Web Wallet</Tag>}
        // avatar={{src: "/logo.png"}}
        style={{background: "#001529", "fontColor": "#fff"}}
        ghost={false}
        extra={extra}
      />
    )
  }

  renderAlert() {
    if (this.state.errMsg) {
      return (
        <Alert message={this.state.errMsg} type={"error"} closable />
      )
    } else if (this.state.pendingMsg) {
      return (
        <Spin spinning={true}>
          <Alert message={"Connecting to your Lattice"} closable/>
        </Spin>
      )
    } else {
      return;
    }
  }

  renderContent() {
    if (this.state.waiting) {
      return (<Loading/> )
    // } else if (false) {
    } else if (!this.state.hasClient) {
      return (
        <Connect submitCb={this.handleConnect}/>
      )
    } else {
      return (
        <Wallet currency={this.state.currency} 
                session={this.state.session}
                msgHandler={this.setMsg}
                tick={this.state.tick}
        />
      );
    }
  }

  renderFooter() {
    return (
      <Footer style={{ textAlign: 'center' }}>©2020 GridPlus Inc</Footer>
    )
  }

  render() {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        {this.renderHeader()}
        <Layout>
          {this.renderSidebar()}
        <Layout>
          <Content style={{ margin: '0 16px' }}>
            {this.renderAlert()}
            <div style={{ margin: '50px 0 0 0'}}>
              {this.renderContent()}        
            </div>
          </Content>
          {this.renderFooter()}
        </Layout>
      </Layout>
      </Layout>

    );
  }
}

export default Main