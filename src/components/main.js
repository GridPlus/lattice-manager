import React from 'react';
import 'antd/dist/antd.css'
import { Layout, Menu, Breadcrumb, Icon } from 'antd';
import { SDKSession } from '../sdk/sdkSession';
import { Connect } from './index'
const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;

class Main extends React.Component {
  state = {
    collapsed: false,
    sdk: null,
  };

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
            <span>My Wallet</span>
          </Menu.Item>
          <SubMenu
            key="sub1"
            title={
              <span>
                <Icon type="arrow-up" />
                <span>Send</span>
              </span>
            }
          >
            <Menu.Item key="3">Ethereum</Menu.Item>
            <Menu.Item key="4">Bitcoin</Menu.Item>
          </SubMenu>
          <SubMenu
            key="sub2"
            title={
              <span>
                <Icon type="arrow-down" />
                <span>Receive</span>
              </span>
            }
          >
            <Menu.Item key="6">Ethereum</Menu.Item>
            <Menu.Item key="8">Bitcoin</Menu.Item>
          </SubMenu>
        </Menu>
      </Sider>
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
        <Header>
          <div className="logo">
            <img alt={"GridPlus"} src={"/logo.png"} width={100} />
          </div>
        </Header>
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