import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Layout, Menu, Icon, Select, PageHeader, Spin, Tag } from 'antd';
import { default as SDKSession } from '../sdk/sdkSession';
import { Connect, Loading, Pair, Wallet } from './index'
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
      // Login info stored in localstorage. Can be cleared out at any time by the `logout` func
      deviceID: null,
      password: null,
    };

    this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handlePair = this.handlePair.bind(this);
  }

  componentDidMount() {
    // Lookup deviceID and pw from storage
    const deviceID = window.localStorage.getItem('gridplus_web_wallet_id');
    const password = window.localStorage.getItem('gridplus_web_wallet_password');
    if (deviceID && password) {
      this.setState({ deviceID, password })
      this.handleConnect({ deviceID, password})
    }
  }

  tick() {
    this.setState({ waiting: false, stateTick: this.state.stateTick + 1 })
  }

  setMsg(msg={}) {
    this.setState({
      errMsg: msg.errMsg || null,
      pendingMsg: msg.pendingMsg || null,
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
    window.localStorage.clear();
  }

  // Asynchronously load addresses from the client session using
  // the currently selected currency
  loadAddresses() {
    this.setState({ waiting: true });
    this.state.session.loadAddresses(this.state.currency, (err) => {
      this.tick(); //  Notify state we potentially have new data
      if (err) return this.setMsg({ errMsg: err });
    });
  }

  handleConnect(data) {
    this.setState({ waiting: true })
    this.state.session.connect(data.deviceID, data.password, (err, isPaired) => {
      this.setState({ waiting: false })
      if (err) {
        this.resetClient();
        this.setState({ errMsg: 'Failed to find to your Lattice. Please ensure your device is online and that you entered the correct DeviceID.' })
      } else {
        // We connected!
        // 1. Set this as the client
        this.resetClient(true);
        // 2. Save these credentials to localStorage
        window.localStorage.setItem('gridplus_web_wallet_id', data.deviceID);
        window.localStorage.setItem('gridplus_web_wallet_password', data.password);
        
        // Are we already paired?
        // If so, load addresses.
        // If not, the component should re-render a pairing screen
        if (isPaired) {
          this.loadAddresses();
        }
      }
    })
  }

  handlePair(data) {
    this.setState({ waiting: true });
    this.state.session.pair(data, (err) => {
      this.setState({ waiting: false });
      if (err) {
        this.setState({ errMsg: 'Failed to pair with your device. Please try again. '});
        this.handleConnect({ deviceID: this.state.deviceID, password: this.state.password });
      } else {
        this.loadAddresses();
      }
    })
  }

  onCollapse = collapsed => {
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
        <Alert message={this.state.errMsg} type={"error"} showIcon closable />
      )
    } else if (this.state.pendingMsg) {
      return (
        <Spin spinning={true} tip={this.state.pendingMsg}>
          <Alert message={"  "}/>
        </Spin>
      )
    } else {
      return;
    }
  }

  renderContent() {
    if (this.state.waiting) {
      return (<Loading/> )
    } else if (!this.state.hasClient) {
      return (
        <Connect submitCb={this.handleConnect}/>
      )
    } else if (!this.state.session.isPaired()) {
      return (<Pair submit={this.handlePair}/>)
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
          <Content style={{ margin: '20px 16px' }}>
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