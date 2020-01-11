import React from 'react';
import 'antd/dist/antd.css'
import { Layout, Menu, Icon, Select, Row, Col } from 'antd';
import { SDKSession } from '../sdk/sdkSession';
import { Connect } from './index'
const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;
const { Option } = Select;

class Main extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      collapsed: false,
      sdk: null,
      currency: 'eth',
    };
    this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
  }

  handleCurrencyChange(value) {
    this.setState({ currency: value })
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
    return (
      <Header>
        <Row>
          <Col span={4}>
            <div className="logo">
              <img alt={"GridPlus"} src={"/logo.png"} width={100} />
            </div>
          </Col>
          <Col span={4} offset={16}>
            <Select defaultValue="eth" style={{ width: 120 }} onChange={this.handleCurrencyChange}>
              <Option value="eth">ETH</Option>
              <Option value="btc">BTC</Option>
            </Select>
          </Col>
        </Row>
      </Header>
    )
  }

  renderContent() {
    return (
      <div style={{ margin: '50px 0 0 0'}}>
        <Connect/>
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