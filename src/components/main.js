import React from 'react';
import 'antd/dist/antd.css'
import { Alert, Button, Layout, Menu, Icon, Select, PageHeader, Tag } from 'antd';
import { default as SDKSession } from '../sdk/sdkSession';
import { Connect, Error, Loading, Pair, Send, Receive, Wallet } from './index'
import { CONSTANTS } from '../constants'
const { Content, Footer, Sider } = Layout;
const { Option } = Select;

class Main extends React.Component {
  constructor(props) {
    super(props)    
    this.state = {
      currency: 'ETH',
      menuItem: 'menu-wallet',
      session: new SDKSession(),
      errMsg: null,
      error: { msg: null, cb: null },
      pendingMsg: null,
      hasClient: false,
      waiting: false, // Waiting on asynchronous data, usually from the Lattice
      // Tick state in order to force a re-rendering of the `Wallet` component
      stateTick: 0,
      // Login info stored in localstorage. Can be cleared out at any time by the `logout` func
      deviceID: null,
      password: null,
    };

    // Bind local state updaters
    this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
    this.handleMenuChange = this.handleMenuChange.bind(this);
    this.handleLogout = this.handleLogout.bind(this);

    // Bind callbacks whose calls may originate elsewhere
    this.connectSession = this.connectSession.bind(this);
    this.handlePair = this.handlePair.bind(this);
    this.loadAddresses = this.loadAddresses.bind(this);

    // Bind wrappers
    this.retry = this.retry.bind(this);

  }

  componentDidMount() {
    // Lookup deviceID and pw from storage
    const deviceID = window.localStorage.getItem('gridplus_web_wallet_id');
    const password = window.localStorage.getItem('gridplus_web_wallet_password');
    if (deviceID && password) {
      this.setState({ deviceID, password })
      this.connectSession({ deviceID, password})
    }
  }

  //------------------------------------------
  // LOCAL STATE UPDATES
  //------------------------------------------

  // Simple mechanism to force a state update
  // Only use this when you want to force the Wallet component
  // to update/re-render!
  tick() {
    this.setState({ stateTick: this.state.stateTick + 1 })
  }

  // Update alert message. If no args are provided, this will clear
  // all alert messages
  setAlertMessage(msg={}) {
    this.setState({
      errMsg: msg.errMsg || null,
      pendingMsg: msg.pendingMsg || null,
    })
  }

  wait(msg=null) {
    this.setState({ pendingMsg: msg, waiting: true });
  }

  unwait() {
    this.setState({ pendingMsg: null, waiting: false });
  }

  setError(data) {
    if (data) {
      this.setState({ error: data });
    } else {
      this.setState({ error: { msg: null, cb: null }});
    }
  }

  // Let this component know that we do/not have a client session
  // If we do not have a client, we should disconnect the session.
  // If we do have a client (i.e. a new connection), set that
  updateHasClient(hasClient=false) {
    if (!hasClient) {
      this.state.session.disconnect();
    }
    this.setState({ hasClient })
    // Clear out alert messages and tick, just in case
    this.setAlertMessage();
    this.tick();
  }

  //------------------------------------------
  // END LOCAL STATE UPDATES
  //------------------------------------------

  //------------------------------------------
  // HEADER HANDLERS
  //------------------------------------------

  handleCurrencyChange(value) {
    this.setAlertMessage();
    this.setState({ currency: value })
  }

  handleMenuChange({key}) {
    this.setState({ menuItem: key })
  }

  handleLogout() {
    this.updateHasClient(false);
    this.state.session.disconnect();
    window.localStorage.clear();
  }
  
  //------------------------------------------
  // END HEADER HANDLERS
  //------------------------------------------

  //------------------------------------------
  // SDK HOOKS
  //------------------------------------------

  // Call `connect` on the SDK session. If we get an error back, clear out the client,
  // as we cannot connect.
  connectSession(data=this.state) {
    this.wait("Trying to contact your Lattice");
    const timeout = this.state.hasClient ? CONSTANTS.ASYNC_SDK_TIMEOUT : CONSTANTS.SHORT_TIMEOUT;
    this.state.session.connect(data.deviceID, data.password, (err, isPaired) => {
      this.unwait();
      if (err) {
        // If we failed to connect, clear out the SDK session. This component will
        // prompt the user for new login data and will try to create one.
        this.updateHasClient();
        this.setState({ errMsg: 'Failed to find to your Lattice. Please ensure your device is online and that you entered the correct DeviceID.' })
      } else {
        // We connected!
        // 1. Set this as the client
        this.updateHasClient(true);
        // 2. Save these credentials to localStorage
        window.localStorage.setItem('gridplus_web_wallet_id', data.deviceID);
        window.localStorage.setItem('gridplus_web_wallet_password', data.password);
        // 3. Clear error data
        this.setError();
        // Are we already paired?
        // If so, load addresses
        if (isPaired) {
          this.loadAddresses();
        }
      }
    }, timeout);
  }

  // Asynchronously load addresses from the client session using
  // the currently selected currency
  loadAddresses() {
    this.wait("Loading addresses")
    this.state.session.loadAddresses(this.state.currency, (err) => {
      this.unwait();
      // Catch an error if there is one
      if (err) {
        this.setError({ msg: err, cb: this.loadAddresses })
        return;
      }
      // If there is no error, get the data
      this.wait("Syncing chain data");
      this.state.session.fetchData(this.state.currency, (err) => {
        this.unwait();
        if (err) {
          this.setError({ msg: `Failed to sync history for ${this.state.currency}`,})
        }
      });
    });
  }

  //------------------------------------------
  // END SDK HOOKS
  //------------------------------------------

  //------------------------------------------
  // SDK CALLBACKS
  //------------------------------------------

  // Handle a `finalizePairing` response. There are three states:
  // 1. Wrong secret: draw a new screen (try again) automatically
  // 2. Timed out: display error screen and wait for user to try again
  // 3. Success: load addresses
  handlePair(data, timedOut=false) {
    this.setState({ pairingTimedOut: timedOut });
    if (timedOut) {
      // There is a timer in the Pair component that will throw
      // a timeout after 60 seconds. This will move the user
      // to the <Error> screen
      // Tick just in case
      this.setError({ msg: 'Pairing timed out. Please try again.', cb: this.connectSession });
      return;
    }
    // If we didn't timeout, submit the secret and hope for success!
    this.wait("Establishing connection with your Lattice");
    this.state.session.pair(data, (err) => {
      this.unwait();
      if (err) {
        // If there was an error here, the user probably entered the wrong secret
        this.setError({ msg: 'Secret was incorrect. Please try again.', cb: this.connectSession });
      } else {
        // Success! Load our addresses from this wallet.
        this.loadAddresses();
      }
    })
  }

  //------------------------------------------
  // END SDK CALLBACKS
  //------------------------------------------

  //------------------------------------------
  // RENDERERS
  //------------------------------------------

  renderSidebar() {
    return (
      <Sider>
        <Menu theme="dark" defaultSelectedKeys={['menu-wallet']} mode="inline" onSelect={this.handleMenuChange}>
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
    } else {
      return;
    }
  }

  retry(cb) {
    this.setError();
    return cb();
  }

  renderMenuItem() {
    switch (this.state.menuItem) {
      case 'menu-wallet':
        return (
          <Wallet currency={this.state.currency} 
                  session={this.state.session}
                  msgHandler={this.setAlertMessage}
                  tick={this.state.tick}
          />
        );
      case 'menu-receive':
        return (
          <Receive currency={this.state.currency}
                   session={this.state.session}
                   tick={this.state.tick}
          />
        );
      case 'menu-send':
        return (
          <Send currency={this.state.currency}
                session={this.state.session}
                tick={this.state.tick}
          />
        )
      default:
        return;
    }
  }

  renderContent() {
    const hasError = this.state.error.msg && this.state.error.cb;
    if (this.state.waiting) {
      return (
        <Loading msg={this.state.pendingMsg} /> 
      );
    } else if (!this.state.hasClient) {
      // Connect to the Lattice via the SDK
      return (
        <Connect submitCb={this.connectSession}/>
      );
    } else if (hasError) {
      return (
        <Error  cb={this.state.error.cb}
                msg={this.state.error.msg}
                retryCb={this.retry}
        />
      );
    } else if (!this.state.session.isPaired()) {
      // Automatically try to pair if we have a session but no pairing  
      return (
        <Pair submit={this.handlePair}/>
      );
    } else {
      return this.renderMenuItem();
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