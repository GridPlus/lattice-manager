import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Layout, Menu, Icon, Select, PageHeader, Row, Col, Spin, Tag } from 'antd';
import { default as SDKSession } from '../sdk/sdkSession';
import { Connect } from './index'
const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;
const { Option } = Select;

class Main extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      collapsed: false,
      currency: 'eth',
      session: new SDKSession(),
      errMsg: null,
      pendingMsg: null,
    };
    this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  resetMsg() {
    this.setState({
      errMsg: null,
      pendingMsg: null,
    })
  }

  handleCurrencyChange(value) {
    this.resetMsg();
    this.setState({ currency: value })
  }

  handleLogout() {
    this.resetMsg();
    this.state.session.disconnect();
  }

  handleConnect(data) {
    this.resetMsg();
    this.setState({ pendingMsg: 'Connecting to your Lattice1...' });
    this.state.session.connect(data.deviceID, data.password, (err) => {
      if (err) {
        this.setState({ errMsg: 'Failed to connect to your Lattice. Please ensure your device is online and that you entered the correct DeviceID.' })
      }
    })
  }

  onCollapse = collapsed => {
    console.log(collapsed);
    this.setState({ collapsed });
  };

  renderSidebar() {
    return (
      <Sider collapsible collapsed={this.state.collapsed} onCollapse={this.onCollapse}>
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
          <Menu.Item key="1">
            <Icon type="wallet" />
            <span>Wallet</span>
          </Menu.Item>
          <Menu.Item key="2">
            <Icon type="arrow-up" />
            <span>Send</span>
          </Menu.Item>
          <Menu.Item key="3">
            <Icon type="arrow-down" />
            <span>Receive</span>
          </Menu.Item>
        </Menu>
      </Sider>
    )
  }

  renderHeader() {
    const extra = [
      <Select key="currency-select" defaultValue="eth" onChange={this.handleCurrencyChange}>
        <Option value="eth">ETH</Option>
        <Option value="btc">BTC</Option>
      </Select>
    ];
    if (this.state.session.isConnected()) {
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
    return (
      <div>
        {this.renderAlert()}
        <div style={{ margin: '50px 0 0 0'}}>
          <Connect submitCb={this.handleConnect}/>
        </div>
      </div>
    )
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
            {this.renderContent()}
          </Content>
          {this.renderFooter()}
        </Layout>
      </Layout>
      </Layout>

    );
  }
}

export default Main