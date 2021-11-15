import React from 'react';
import 'antd/dist/antd.dark.css'
import './styles.css'
import { Alert, Button, Layout, Menu, Select, PageHeader, Tag, Tooltip } from 'antd';
import { 
  HomeOutlined, AuditOutlined, DollarOutlined, TagsOutlined, 
  WalletOutlined, ArrowUpOutlined, ArrowDownOutlined, 
  ReloadOutlined, CreditCardOutlined, CheckOutlined, SettingOutlined 
} from '@ant-design/icons';
import { default as SDKSession } from '../sdk/sdkSession';
import { 
  Connect, Error, Landing, Loading, Pair, Permissions, Send, Receive, Wallet, EthContracts, Settings, ValidateSig, KvFiles 
} from './index'
import { constants, getCurrencyText, setEthersProvider, getLocalStorageSettings } from '../util/helpers'
const { Content, Footer, Sider } = Layout;
const { Option } = Select;
const LOGIN_PARAM = 'loginCache';

class Main extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      name: constants.DEFAULT_APP_NAME,
      currency: 'BTC',
      menuItem: 'menu-landing',
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
      // Track changes in the active wallet so we can refresh addresses when we detect one
      walletIsExternal: null,
      // Window params
      keyringName: null,
      // Validation check on Lattice hardware. Should draw a separate component
      hwCheck: null,
    };

    // Bind local state updaters
    this.setAlertMessage = this.setAlertMessage.bind(this);
    this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
    this.handleMenuChange = this.handleMenuChange.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleKeyringOpener = this.handleKeyringOpener.bind(this);
    this.syncActiveWalletState = this.syncActiveWalletState.bind(this);

    // Bind callbacks whose calls may originate elsewhere
    this.cancelConnect = this.cancelConnect.bind(this);
    this.connectSession = this.connectSession.bind(this);
    this.handlePair = this.handlePair.bind(this);
    this.fetchAddresses = this.fetchAddresses.bind(this);
    this.fetchData = this.fetchData.bind(this);
    this.handleStateUpdate = this.handleStateUpdate.bind(this);
    this.refreshWallets = this.refreshWallets.bind(this);
    this.handlePageTurn = this.handlePageTurn.bind(this);

    // Bind wrappers
    this.retry = this.retry.bind(this);

    // Bind listener callbacks
    this.updateWidth = this.updateWidth.bind(this);
  }

  componentDidMount() {
    // Set the ethers provider for ENS support
    setEthersProvider();

    // Listen for window resize
    window.addEventListener('resize', this.updateWidth);

    // Metamask connects through a keyring and in these cases we need
    // to utilize window.postMessage once we connect.
    // We can extend this pattern to other apps in the future.
    const params = new URLSearchParams(window.location.search);
    const keyringName = params.get('keyring')
    const hwCheck = params.get('hwCheck')
    const forceLogin = params.get('forceLogin')
    
    // Workaround to support Firefox extensions. See `returnKeyringData` below.
    const hasLoggedIn = params.get(LOGIN_PARAM)
    if (hasLoggedIn) {
      this.setState({ waiting: true, pendingMsg: 'Connecting...' })
      return;
    }
    
    if (keyringName) {
      window.onload = this.handleKeyringOpener();
      this.setState({ name: keyringName }, () => {
        // Check if this keyring has already logged in. This login should expire after a period of time.
        const prevKeyringLogin = this.getPrevKeyringLogin();
        const keyringTimeoutBoundary = new Date().getTime() - constants.KEYRING_LOGOUT_MS;
        if (!forceLogin && prevKeyringLogin && prevKeyringLogin.lastLogin > keyringTimeoutBoundary) {
          this.connect( prevKeyringLogin.deviceID, 
                        prevKeyringLogin.password, 
                        () => this.connectSession(prevKeyringLogin));
        } else {
          // If the login has expired, clear it now.
          this.clearPrevKeyringLogin();
        }
      })
    } else if (hwCheck) {
      // Lattice validation check builds this URL and includes a signature + preimage
      this.setState({ hwCheck })
    } else {
      // Lookup deviceID and pw from storage
      const deviceID = window.localStorage.getItem('gridplus_web_wallet_id');
      const password = window.localStorage.getItem('gridplus_web_wallet_password');
      if (deviceID && password)
        this.connect(deviceID, password, () => this.connectSession())
    }
  }

  componentDidUpdate() {
    if (this.state.session)
      this.syncActiveWalletState();
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
      const settings = JSON.parse(window.localStorage.getItem(constants.ROOT_STORE) || '{}').settings || {};
      updates.session = new SDKSession(deviceID, this.handleStateUpdate, this.state.name, settings);
    }
    this.setState(updates, cb);
  }

  cancelConnect() {
    // Cancel the pairing process if it was started (i.e. if the connection was started with
    // a device that could be discovered). Most of the time this will not be possible because
    // the cancel button that triggers this function will not be displayed once the device
    // responds back that it is ready to pair.
    if (this.state.session && this.state.session.client) {
      this.state.session.pair('', () => {});
    }
    // Reset all SDK-related state variables so the user can re-connect to something else.
    this.setState({ deviceID: null, password: null, session: null })
    this.unwait()
  }

  isConnected() {
    if (!this.state.session) return false;
    return this.state.session.isConnected();
  }

  //------------------------------------------
  // KEYRING HANDLERS
  //------------------------------------------

  saveKeyringLogin() {
    if (this.state.name) {
      const _storage = window.localStorage.getItem(constants.ROOT_STORE) || JSON.stringify({});
      try {
        const storage = JSON.parse(_storage);
        if (!storage.settings)
          storage.settings = {};
        if (!storage.settings.keyringLogins)
          storage.settings.keyringLogins = {};
        storage.settings.keyringLogins[this.state.name] = {
          deviceID: this.state.deviceID,
          password: this.state.password,
          lastLogin: new Date().getTime()
        }
        window.localStorage.setItem(constants.ROOT_STORE, JSON.stringify(storage));
      } catch (err) {
        console.error(`Error saving keyring login: ${err.toString()}`)
      }
    }
  }

  getPrevKeyringLogin() {
    if (this.state.name) {
      const _storage = window.localStorage.getItem(constants.ROOT_STORE);
      try {
        const storage = JSON.parse(_storage);
        return storage.settings.keyringLogins[this.state.name];
      } catch (e) {
        return {};
      }
    }
  }

  clearPrevKeyringLogin() {
    if (this.state.name) {
      const _storage = window.localStorage.getItem(constants.ROOT_STORE);
      try {
        const storage = JSON.parse(_storage);
        delete storage.settings.keyringLogins[this.state.name];
      } catch (err) {
        console.error(`Error clearing keyring login: ${err.toString()}`)
      }
    }
  }

  handleKeyringOpener() {
    this.setState({ openedByKeyring: true })
  }

  returnKeyringData() {
    if (!this.state.openedByKeyring)
      return;
    // Save the login for later
    this.saveKeyringLogin();
    // Send the data back to the opener
    const data = {
      deviceID: this.state.deviceID,
      password: this.state.password,
      endpoint: constants.BASE_SIGNING_URL,
    };
    // Check if there is a custom endpoint configured
    const settings = getLocalStorageSettings();
    if (settings.customEndpoint && settings.customEndpoint !== '') {
      data.endpoint = settings.customEndpoint;
    }
    this.handleLogout();
    if (window.opener) {
      // If there is a `window.opener` we can just post back
      window.opener.postMessage(JSON.stringify(data), "*");
      window.close();
    } else {
      // Otherwise we need a workaround to let the originator
      // know we have logged in. We will put the login data
      // into the URL and the requesting app will fetch that.
      // Note that the requesting extension is now responsible for
      // closing this web page.
      const enc = Buffer.from(JSON.stringify(data)).toString('base64');
      window.location.href = `${window.location.href}&${LOGIN_PARAM}=${enc}`;
    }
  }
  //------------------------------------------
  // END KEYRING HANDLERS
  //------------------------------------------

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
    if (msg) {
      const { errMsg, pendingMsg } = msg;
      this.setState({
        errMsg: errMsg ? String(errMsg) : null,
        pendingMsg: pendingMsg ? String(pendingMsg) : null,
      })
    }
  }

  wait(msg=null, onCancel=null) {
    this.setState({ pendingMsg: msg, waiting: true, onCancel });
  }

  unwait() {
    this.setState({ pendingMsg: null, waiting: false, onCancel: null });
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
    this.setState({ currency: value, error: { msg: null, cb: null } }, function() {
      // Load addresses for new currency once it is updated
      // If we get a callback, this worked (i.e. we either already)
      // had the necessary addresses or we fetched them properly.
      if (this.isConnected()) {
        this.setAlertMessage();
        this.fetchAddresses(this.fetchData);
      }
    })
  }

  handlePageTurn(page) {
    this.state.session.setPage(page);
    this.fetchData();
  }

  handleMenuChange({key}) {
    this.setState({ menuItem: key })
  }

  handleLogout(err=null) {
    this.unwait();
    this.state.session.disconnect();
    this.setState({ session: null, currency: 'ETH' });
    window.localStorage.removeItem('gridplus_web_wallet_id');
    window.localStorage.removeItem('gridplus_web_wallet_password');
    if (err && err === constants.LOST_PAIRING_MSG)
      this.setError({msg: err})
  }

  handleStateUpdate(data={err:null, currency:null, cb:null}) {
    // Handle case where user deletes pairing on the Lattice
    if (data.err === constants.LOST_PAIRING_ERR)
      return this.handleLostPairing();

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
    // Connect to the device
    this.connect(deviceID, password, () => {
      // Create a new session with the deviceID and password provided.
      if (showLoading === true) {
        this.wait("Looking for your Lattice", this.cancelConnect);
      }
      this.state.session.connect(deviceID, password, (err, isPaired) => {
        this.unwait();
        // If the request was before we got our callback, exit here
        if (!this.state.session || this.state.deviceID !== deviceID)
          return;
        if (err) {
          // If we failed to connect, clear out the SDK session. This component will
          // prompt the user for new login data and will try to create one.
          this.setError({ 
            msg: err, 
            cb: () => { this.connectSession(data); } 
          });
        } else {
          // We connected!
          // 1. Save these credentials to localStorage if this is NOT a keyring
          if (!this.state.openedByKeyring) {
            window.localStorage.setItem('gridplus_web_wallet_id', deviceID);
            window.localStorage.setItem('gridplus_web_wallet_password', password);
          }
          // 2. Clear errors, alerts, and tick
          this.setError();
          this.setAlertMessage();
          this.tick();
          // 3. Proceed based on state
          if (isPaired && this.state.openedByKeyring) {
            return this.returnKeyringData();
          } else if (isPaired) {
            return this.fetchAddresses(this.fetchData)
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
    if (this.state.waiting === true)
      return;
    this.wait("Syncing addresses")
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
  }

  handleLostPairing() {
    // If we lost our pairing, we will have discovered that after trying to `connect`.
    // The Lattice will draw a pairing screen, so to tear it down we need to send an
    // invalid pairing code.
    // TODO: This will still draw a pairing failure screen on the Lattice. There is
    //       currently no way around this, but it is something we should address
    //       in the future.
    this.state.session.pair('x', () => {
      this.handleLogout(constants.LOST_PAIRING_MSG);
    });
  }

  refreshWallets() {
    if (this.state.waiting === true)
      return;
    this.wait("Refreshing wallets")
    this.state.session.refreshWallets((err) => {
      if (err === constants.LOST_PAIRING_ERR)
        return this.handleLostPairing();
      
      this.syncActiveWalletState(true);
      this.unwait();
      if (err)
        return this.setError({ msg: err, cb: this.refreshWallets })
      // If no error was returned, clear out the error and fetch addresses.
      // Note that if this app auto-switches wallet interface, it will not immediately
      // switch the walletUID and will catch an error, which we need to clear out here
      // so that the user doesn't see it once we successfully fetch addresses. 
      this.setError();
      this.fetchAddresses(this.fetchData);
    })
  }

  // If we detect a new active wallet interface, save it and refresh wallet addresses
  syncActiveWalletState(bypassRefresh=false) {
    const activeWallet = this.state.session.getActiveWallet();
    if (!activeWallet)
      return;
    const isExternal = activeWallet.external;
    if (this.state.walletIsExternal !== isExternal) {
      // We only want to refresh if we know another interface was active before. If this
      // is the first check, just set the flag without calling refresh (it will get called)
      // automatically.
      const shouldRefresh = this.state.walletIsExternal !== null;
      // Set state regardless
      this.setState({ walletIsExternal: isExternal })
      // Refresh if needed
      if (shouldRefresh === true && bypassRefresh !== true)
        this.refreshWallets();
    }
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
    // Hack to circumvent a weird screen artifact we are seeing in firmware
    // NOTHING TO SEE HERE
    if (data[0] === '_' || data[0] === '[') data = data.slice(1)

    // If we didn't timeout, submit the secret and hope for success!
    this.wait("Establishing connection with your Lattice");
    this.state.session.pair(data, (err) => {
      this.unwait();
      if (err) {
        // If there was an error here, the user probably entered the wrong secret
        const pairErr = 'Failed to pair. You either entered the wrong code or have already connected to this app.'
        this.setError({ msg: pairErr, cb: this.connectSession });
      } else if (!this.state.openedByKeyring) {
        // Success! Load our addresses from this wallet.
        this.fetchAddresses(this.fetchData);
      } else {
        this.returnKeyringData();
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
    const collapsed = this.isMobile();
    const mode = collapsed ? 'horizontal' : 'inline';
    return (
      <Sider collapsed={collapsed}>
        <Menu theme="dark" mode={mode} onSelect={this.handleMenuChange}>
          <Menu.Item key="menu-landing">
            <HomeOutlined/>
            <span>Home</span>
          </Menu.Item>          
          <Menu.Item key="menu-kv-records">
            <TagsOutlined/>
            <span>Address Tags</span>
          </Menu.Item>
          <Menu.Item key="menu-eth-contracts">
            <AuditOutlined/>
            <span>Contracts</span>
          </Menu.Item>
          {/* <Menu.Item key="menu-permissions">
            <DollarOutlined/>
            <span>Limits</span>
          </Menu.Item> */}
          <Menu.Item key="menu-settings">
            <SettingOutlined/>
            <span>Settings</span>
          </Menu.Item>
          <Menu.SubMenu title="Wallet" key="submenu-wallet">
            <Menu.Item key="menu-wallet">
              <WalletOutlined/>
              <span>Wallet</span>
            </Menu.Item>
            <Menu.Item key="menu-send">
              <ArrowUpOutlined/>
              <span>Send</span>
            </Menu.Item>
            <Menu.Item key="menu-receive">
              <ArrowDownOutlined/>
              <span>Receive</span>
            </Menu.Item>
          </Menu.SubMenu>
        </Menu>
      </Sider>
    )
  }

  renderSidebar() {
    if (this.state.name !== constants.DEFAULT_APP_NAME)
      return
    if (this.isConnected())
      return this.renderMenu();
  }

  renderHeaderText() {
    return (
      <a href="https://gridplus.io" target='_blank' rel='noopener noreferrer'>
        <img  alt="GridPlus" 
              src={'/logo-on-black.png'}
              style={{height: '1em'}}/>
      </a>
    )
  }

  renderHeader() {
    if (this.state.name !== constants.DEFAULT_APP_NAME)
      return
    let extra = [];
    if (!this.isConnected())
      return;

    // Display a tag if there is a SafeCard inserted
    let walletTag = null;
    const size = this.isMobile() ? 'small' : 'default';
    const activeWallet = this.state.session.getActiveWallet();

    if (activeWallet === null) {
      walletTag = ( 
        <Button type="danger" ghost onClick={this.refreshWallets} size={size}>No Wallet <ReloadOutlined/></Button>
      )
    } else {
      walletTag = activeWallet.external === true ?  (
        <Button type="primary" ghost onClick={this.refreshWallets} size={size}><CreditCardOutlined/> SafeCard <ReloadOutlined/></Button>
      ) : (
        <Button type="default" ghost onClick={this.refreshWallets} size={size}><CheckOutlined/> Lattice1 <ReloadOutlined/></Button>
      )
    }
    if (walletTag) extra.push((
      <Tooltip title="Refresh" key="WalletTagTooltip">{walletTag}</Tooltip>));

    // Add the currency switch
    // extra.push((
    //   <Menu onClick={this.handleCurrencyChange}>
    //     <Menu.Item key="BTC">
    //       BTC
    //     </Menu.Item>
    //     <Menu.Item key="ETH">
    //       ETH
    //     </Menu.Item>
    //   </Menu>
    // ))

    extra.push(
      ( <Button key="logout-button" type="primary" onClick={this.handleLogout} size={size}>
        Logout
      </Button>)
    );
    return (
      <PageHeader
        title={this.renderHeaderText()}
        ghost={true}
        extra={!this.state.waiting ? extra : null}
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
                  pageTurnCb={this.handlePageTurn}
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
      case 'menu-eth-contracts':
        return (
          <EthContracts
            session={this.state.session}
            isMobile={() => this.isMobile()}
          />
        )
      // case 'menu-permissions':
      //   return (
      //     <Permissions
      //       session={this.state.session}
      //       isMobile={() => this.isMobile()}
      //     />
      //   )   
      case 'menu-settings':
        return (
          <Settings
            isMobile={() => this.isMobile()}
          />
        )
      case 'menu-kv-records':
        return (
          <KvFiles
            session={this.state.session}
            isMobile={() => this.isMobile()}
          />
        )
      case 'menu-landing':
        return (
          <Landing isMobile={() => { this.isMobile() }}/>
        );
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
                  msg={this.state.pendingMsg}
                  onCancel={this.state.onCancel}/> 
      );
    } else if (!this.isConnected()) {
      // Connect to the Lattice via the SDK
      return (
        <Connect  submitCb={this.connectSession}
                  cancelConnect={this.cancelConnect}
                  name={this.state.name}
                  isMobile={() => this.isMobile()}
                  errMsg={this.state.error.msg}/>
      );
    } else if (hasError) {
      return (
        <Error  cb={this.state.error.cb}
                isMobile={() => this.isMobile()}
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
    } else if (this.state.openedByKeyring) {
      // The window should close automatically, but just in case something goes wrong...
      return (
        <Loading isMobile={() => { this.isMobile() }}
                  msg={"Successfully connected to your Lattice1! You may close this window."}
                  spin={false}/>
      )
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
        ©2021 GridPlus Inc
        {constants.ENV === 'dev' ? <Tag color="blue" style={{margin: "0 0 0 10px"}}>DEV</Tag> : null}
      </Footer>
    )
  }

  renderPage() {
    if (this.state.hwCheck !== null) {
      return <ValidateSig data={this.state.hwCheck} isMobile={() => this.isMobile()}/>
    } else {
      return this.renderContent();
    }
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
                {this.renderPage()}        
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