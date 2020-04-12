import React from 'react';
import 'antd/dist/antd.css'
import './styles.css'
import { Alert, Button, Layout, Menu, Icon, Select, PageHeader, Tag, Tooltip } from 'antd';
import { default as SDKSession } from '../sdk/sdkSession';
import { Connect, Error, Loading, Pair, Send, Receive, Wallet } from './index'
import { constants } from '../util/helpers'
const { Content, Footer, Sider } = Layout;
const { Option } = Select;

class Main extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currency: 'ETH',
      menuItem: 'menu-wallet',
      // GridPlusSDK session object
      session: null,
      // WebWorker that will periodically lookup state on available addrs
      worker: null, 
      errMsg: null,
      alertMsg: null,
      error: { msg: null, cb: null },
      pendingMsg: null,
      // State variable to track if we are fetching new addresses in the background
      stillSyncingAddresses: false, 
      // Waiting on asynchronous data, usually from the Lattice
      waiting: false, 
      // Tick state in order to force a re-rendering of the `Wallet` component
      stateTick: 0,
      // Login info stored in localstorage. Can be cleared out at any time by the `logout` func
      deviceID: null,
      password: null,
      // Last time the state was updated (comes from webwork setup by SdkSession)
      lastUpdated: new Date(),
      // Width of the current window
      windowWidth: window.innerWidth,
    };

    // Bind local state updaters
    this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
    this.handleMenuChange = this.handleMenuChange.bind(this);
    this.handleLogout = this.handleLogout.bind(this);

    // Bind callbacks whose calls may originate elsewhere
    this.connectSession = this.connectSession.bind(this);
    this.handlePair = this.handlePair.bind(this);
    this.fetchAddresses = this.fetchAddresses.bind(this);
    this.fetchData = this.fetchData.bind(this);
    this.handleStateUpdate = this.handleStateUpdate.bind(this);
    this.refreshWallets = this.refreshWallets.bind(this);

    // Bind wrappers
    this.retry = this.retry.bind(this);

    // Bind listener callbacks
    this.updateWidth = this.updateWidth.bind(this);
  }

  componentDidMount() {
    // Listen for window resize
    window.addEventListener('resize', this.updateWidth);
    // Lookup deviceID and pw from storage
    const deviceID = window.localStorage.getItem('gridplus_web_wallet_id');
    const password = window.localStorage.getItem('gridplus_web_wallet_password');
    if (deviceID && password) {
      this.connect(deviceID, password, () => {
        this.connectSession();
      });
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWidth);
  }

  updateWidth() {
    this.setState({ windowWidth:  window.innerWidth });
  }

  isMobile() {
    return this.state.windowWidth < 500;
  }

  connect(deviceID, password, cb) {
    const updates = { deviceID, password };
    if (!this.state.session) {
      // Create a new session if we don't have one.
      updates.session =  new SDKSession(deviceID, this.handleStateUpdate);
    }
    this.setState(updates, cb);
  }

  isConnected() {
    if (!this.state.session) return false;
    return this.state.session.isConnected();
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
      if (data.msg instanceof Error)         data.msg = String(data.msg);
      else if (typeof data.msg !== 'string') data.msg = JSON.stringify(data.msg);
      this.setState({ error: data });
    } else {
      this.setState({ error: { msg: null, cb: null }});
    }
    this.unwait();
  }

  //------------------------------------------
  // END LOCAL STATE UPDATES
  //------------------------------------------

  //------------------------------------------
  // HEADER HANDLERS
  //------------------------------------------

  handleCurrencyChange(value) {
    this.setAlertMessage();
    this.setState({ currency: value, error: { msg: null, cb: null } }, function() {
      // Load addresses for new currency once it is updated
      // If we get a callback, this worked (i.e. we either already)
      // had the necessary addresses or we fetched them properly.
      if (this.isConnected()) {
        this.fetchAddresses(this.fetchData);
      }
    })
  }

  handleMenuChange({key}) {
    this.setState({ menuItem: key })
  }

  handleLogout() {
    this.unwait();
    this.state.session.disconnect();
    this.setState({ session: null, currency: 'ETH' });
    window.localStorage.removeItem('gridplus_web_wallet_id');
    window.localStorage.removeItem('gridplus_web_wallet_password');
  }

  handleStateUpdate(data={err:null, currency:null, cb:null}) {
    if (data.err && data.currency === this.state.currency) {
      // We shouldn't assume we have updated state if we got an error message.
      // Most likely, the request failed.
      this.setAlertMessage({ errMsg: data.err })
    } else {
      const st = { lastUpdated: new Date() };
      if (data.stillSyncingAddresses !== undefined) 
        st.stillSyncingAddresses = data.stillSyncingAddresses;
      this.setState(st);
    }
  }
  
  //------------------------------------------
  // END HEADER HANDLERS
  //------------------------------------------

  //------------------------------------------
  // SDK HOOKS
  //------------------------------------------

  // Call `connect` on the SDK session. If we get an error back, clear out the client,
  // as we cannot connect.
  connectSession(data=this.state, showLoading=true) {
    const { deviceID, password } = data;
      // Sanity check -- this should never get hit
    if (!deviceID || !password) {
      return this.setError({ msg: "You must provide a deviceID and password. Please refresh and log in again. "});
    } else {
      this.setError(null);
    }
    this.connect(deviceID, password, () => {
      // Create a new session with the deviceID and password provided.
      if (showLoading === true)
        this.wait("Looking for your Lattice");
      this.state.session.connect(deviceID, password, (err, isPaired) => {
        this.unwait();
        if (err) {
          // If we failed to connect, clear out the SDK session. This component will
          // prompt the user for new login data and will try to create one.
          this.setError({ 
            msg: err, 
            cb: () => { this.connectSession(data); } 
          });
        } else {
          // We connected!
          // 1. Save these credentials to localStorage
          window.localStorage.setItem('gridplus_web_wallet_id', deviceID);
          window.localStorage.setItem('gridplus_web_wallet_password', password);
          // 2. Clear errors, alerts, and tick
          this.setError();
          this.setAlertMessage();
          this.tick();
          // 3. Are we already paired?
          // If so, load addresses. If that completes successfully, also fetch updated
          // blockchain state data.
          if (isPaired) {
            this.fetchAddresses(this.fetchData);
          }
        }
      });
    })
  }

  // Fetch up-to-date blockchain state data for the addresses stored in our
  // SDKSession. Called after we load addresses for the first time
  fetchData(cb=null) {
    this.wait("Syncing chain data");
    this.state.session.fetchData(this.state.currency, (err) => {
      this.unwait();
      if (err) {
        // Failed to fetch -- update state and set the alert
        return this.handleStateUpdate({err, currency: this.state.currency, cb});
      } else {
        // Successfully fetched -- update state
        this.handleStateUpdate();
      }
      // If this succeeded and we have a callback, go ahead and use it.
      if (cb) {
        return cb(null);
      }
    });
  }

  // Asynchronously load addresses from the client session using
  // the currently selected currency. Once we have the addresses,
  // attempt to fetch updated blockchain state data.
  // NOTE: If we don't need additional addresses, no request will be
  // made to the Lattice and we will proceed to fetchData immediately.
  fetchAddresses(cb=null) {
    this.wait("Syncing addresses")
    // Load the first BTC address so we can rehydrate the correct set, if applicable
    this.state.session.loadBtcAddrType((err) => {
      if (err)
        return this.setError({ msg: err, cb: () => { this.fetchAddresses(cb) } });
      // Once we've recorded the address type for BTC, we can start fetching as we normally
      // would. This involves rehydrating the localStorage addresses if possible.
      this.state.session.loadAddresses(this.state.currency, (err) => {
        this.unwait();
        // Catch an error if there is one
        if (err) {
          // If we catch an error, do a recursive call (preserving the callback)
          return this.setError({ msg: err, cb: () => { this.fetchAddresses(cb) } });
        } else if (cb) {
          return cb(null);
        }
      });
    })
  }

  refreshWallets() {
    this.wait("Refreshing wallets")
    this.state.session.refreshWallets((err) => {
      this.unwait();
      if (err)
        return this.setError({ msg: err, cb: this.refreshWallets })
      this.fetchAddresses(this.fetchData);
    })
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
  handlePair(data) {
    // If we didn't timeout, submit the secret and hope for success!
    this.wait("Establishing connection with your Lattice");
    this.state.session.pair(data, (err) => {
      this.unwait();
      if (err) {
        // If there was an error here, the user probably entered the wrong secret
        // this.setError({ msg: 'Secret was incorrect. Please try again.', cb: this.connectSession });
        this.setError({ msg: err, cb: this.connectSession });
      } else {
        // Success! Load our addresses from this wallet.
        this.fetchAddresses(this.fetchData);
      }
    })
  }

  //------------------------------------------
  // END SDK CALLBACKS
  //------------------------------------------

  //------------------------------------------
  // RENDERERS
  //------------------------------------------

  renderMenu() {
    return this.isMobile() ? (
      <Menu theme="dark" defaultSelectedKeys={['menu-wallet']} mode="horizontal" onSelect={this.handleMenuChange}>
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
    ) : (
      <Sider collapsed={this.isMobile()}>
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

  renderSidebar() {
    if (this.isConnected()) {
      return this.renderMenu();
    } else {
      return;
    }
  }

  renderHeaderText() {
    return (
      <a href="https://gridplus.io" target={"_blank"}>
        <img  alt="GridPlus" 
              src={'/logo-on-black.png'}
              style={{height: '1em'}}/> 
      </a>
    )
  }

  renderHeader() {
    let extra = [];
    if (!this.isConnected())
      return;
    // Display a tag if there is a SafeCard inserted
    let walletTag = null;
    const size = this.isMobile() ? 'small' : 'default';
    const activeWallet = this.state.session.getActiveWallet()
    if (activeWallet === null) {
      walletTag = ( 
        <Button type="danger" ghost onClick={this.refreshWallets} size={size}>No Active Wallet!</Button>
      )
    } else if (activeWallet.external === true) {
      walletTag = (
        <Button type="primary" ghost onClick={this.refreshWallets} size={size}><Icon type="credit-card"/> SafeCard</Button>
      )
    } else {
      walletTag = (
        <Button type="default" ghost onClick={this.refreshWallets} size={size}><Icon type="check"/> Lattice1</Button>
      )
    }
    if (walletTag) extra.push((
      <Tooltip title="Refresh" key="WalletTagTooltip">{walletTag}</Tooltip>));

    // Add the currency switch
    extra.push(
      (<Select key="currency-select" defaultValue="ETH" onChange={this.handleCurrencyChange} size={size}>
        <Option value="ETH">ETH</Option>
        <Option value="BTC">BTC</Option>
      </Select>)
    );
    extra.push(
      ( <Button key="logout-button" type="primary" onClick={this.handleLogout} size={size}>
        Logout
      </Button>)
    );
    return (
      <PageHeader
        title={this.renderHeaderText()}
        ghost={true}
        extra={extra}
      />
    )
  }

  renderAlert() {
    if (this.state.errMsg) {
      return (
        <Alert message={"Error"} 
               description={this.state.errMsg} 
               type={"error"} 
               showIcon 
               closable 
               onClose={() => { this.setAlertMessage()}}
        />
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
                  isMobile={() => this.isMobile()}
                  session={this.state.session}
                  msgHandler={this.setAlertMessage}
                  refreshData={this.fetchData}
                  tick={this.state.tick}
                  lastUpdated={this.state.lastUpdated}
                  stillSyncingAddresses={this.state.stillSyncingAddresses}
          />
        );
      case 'menu-receive':
        return (
          <Receive currency={this.state.currency}
                   session={this.state.session}
                   tick={this.state.tick}
                   isMobile={() => this.isMobile()}
          />
        );
      case 'menu-send':
        return (
          <Send currency={this.state.currency}
                session={this.state.session}
                tick={this.state.tick}
                isMobile={() => this.isMobile()}
          />
        )
      default:
        return;
    }
  }

  renderContent() {
    const hasError = this.state.error.msg && this.state.error.cb;
    const hasActiveWallet = this.state.session ? this.state.session.getActiveWallet() !== null : false;
    if (this.state.waiting) {
      return (
        <Loading  isMobile={() => this.isMobile()} 
                  msg={this.state.pendingMsg} /> 
      );
    } else if (!this.isConnected()) {
      // Connect to the Lattice via the SDK
      return (
        <Connect  submitCb={this.connectSession} 
                  isMobile={() => this.isMobile()}
                  errMsg={this.state.error.msg}/>
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
        <Pair submit={this.handlePair}
              isMobile={() => this.isMobile()}/>
      );
    } else if (!hasActiveWallet) {
      const retry = this.state.session ? this.refreshWallets : null;
      return (
        <Error msg={"No active wallet present for device!"}
               retryCb={retry} 
        />
      )
    } else {
      return this.renderMenuItem();
    }
  }

  renderFooter() {
    return (
      <Footer style={{ textAlign: 'center' }}>
        ©2020 GridPlus Inc
        {constants.ENV === 'dev' ? <Tag color="blue" style={{margin: "0 0 0 10px"}}>DEV</Tag> : null}
      </Footer>
    )
  }

  render() {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        {this.renderHeader()}
        <Layout id="main-content-outer">
          {this.renderSidebar()}
          <Layout id="main-content-inner">
            <Content style={{ margin: '0 0 0 0' }}>
              {this.renderAlert()}
              <div style={{ margin: '30px 0 0 0'}}>
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