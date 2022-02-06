import React from 'react';
import 'antd/dist/antd.dark.css'
import './styles.css'
import { Button, Layout, Menu, PageHeader, Tag, Tooltip } from 'antd';
import { 
  HomeOutlined, AuditOutlined, MenuOutlined, TagsOutlined, 
  WalletOutlined, ArrowUpOutlined, ArrowDownOutlined, 
  ReloadOutlined, CreditCardOutlined, CheckOutlined, SettingOutlined 
} from '@ant-design/icons';
import { default as SDKSession } from '../sdk/sdkSession';
import { 
  Connect, Error, Landing, Loading, PageContent, Pair, Send, 
  Receive, Wallet, EthContracts, Settings, ValidateSig, AddressTagsPage 
} from './index'
import { constants, getBtcPurpose } from '../util/helpers'
import localStorage from '../util/localStorage';
const { Content, Footer, Sider } = Layout;
const LOGIN_PARAM = 'loginCache';
const DEFAULT_MENU_ITEM = 'menu-landing';

type MainState = {
  name: string,
  menuItem: string,
  session: any,
  collapsed: boolean,
  error: { msg: string, cb: Function },
  loading: boolean,
  pendingMsg: string,
  waiting: boolean, 
  onCancel: Function,
  deviceID: string,
  password: string,
  lastUpdated: Date,
  windowWidth: number,
  walletIsExternal: boolean,
  keyringName: string,
  openedByKeyring: boolean,
  hwCheck: string,
}


class Main extends React.Component<any, MainState> {
  constructor(props) {
    super(props)
    const params = new URLSearchParams(window.location.search);
    const keyringName = params.get('keyring')
    this.state = {
      name: constants.DEFAULT_APP_NAME,
      menuItem: DEFAULT_MENU_ITEM,
      // GridPlusSDK session object
      session: null,
      collapsed: false,
      error: { msg: null, cb: null },
      loading: false,
      pendingMsg: null,
      // Waiting on asynchronous data, usually from the Lattice
      waiting: false, 
      onCancel: null,
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
      keyringName,
      // Was the app opened with a keyring in the url parameters
      openedByKeyring: !!keyringName,
      // Validation check on Lattice hardware. Should draw a separate component
      hwCheck: null,
    };

    // Bind local state updaters
    this.handleMenuChange = this.handleMenuChange.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleKeyringOpener = this.handleKeyringOpener.bind(this);
    this.syncActiveWalletState = this.syncActiveWalletState.bind(this);

    // Bind callbacks whose calls may originate elsewhere
    this.cancelConnect = this.cancelConnect.bind(this);
    this.connectSession = this.connectSession.bind(this);
    this.handlePair = this.handlePair.bind(this);
    this.fetchBtcData = this.fetchBtcData.bind(this);
    this.setError = this.setError.bind(this);
    this.refreshWallets = this.refreshWallets.bind(this);
    this.handlePageTurn = this.handlePageTurn.bind(this);

    // Bind wrappers
    this.retry = this.retry.bind(this);

    // Bind listener callbacks
    this.updateWidth = this.updateWidth.bind(this);
  }

  componentDidMount() {
    // Listen for window resize
    window.addEventListener('resize', this.updateWidth);

    if (this.isMobile()) this.setState({collapsed: true})
    // Metamask connects through a keyring and in these cases we need
    // to utilize window.postMessage once we connect.
    // We can extend this pattern to other apps in the future.
    const params = new URLSearchParams(window.location.search);
    const keyringName = this.state.keyringName
    const hwCheck = params.get('hwCheck')
    const forceLogin = params.get('forceLogin')
    
    // Workaround to support Firefox extensions. See `returnKeyringData` below.
    const hasLoggedIn = params.get(LOGIN_PARAM)
    if (hasLoggedIn) {
      this.setState({ waiting: true, pendingMsg: 'Connecting...' })
      return;
    }
    
    if (keyringName) {
      //@ts-expect-error
      window.onload = this.handleKeyringOpener();
      this.setState({ keyringName }, () => {
        // Check if this keyring has already logged in. This login should expire after a period of time.
        const prevKeyringLogin = localStorage.getKeyringItem(keyringName);
        //@ts-expect-error
        const keyringTimeoutBoundary = new Date().getTime() - constants.KEYRING_LOGOUT_MS;
        if (!forceLogin && prevKeyringLogin && prevKeyringLogin.lastLogin > keyringTimeoutBoundary) {
          this.connect( prevKeyringLogin.deviceID, 
                        prevKeyringLogin.password, 
                        () => this.connectSession(prevKeyringLogin));
        } else {
          // If the login has expired, clear it now.
          localStorage.removeKeyringItem(keyringName)
        }
      })
    } else if (hwCheck) {
      // Lattice validation check builds this URL and includes a signature + preimage
      this.setState({ hwCheck })
    } else {
      // Lookup deviceID and pw from storage
      const { deviceID, password } = localStorage.getLogin()
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
    if (this.isMobile() && !this.state.collapsed) {
      this.setState({ collapsed: true })
    } else if (!this.isMobile() && this.state.collapsed) {
      this.setState({ collapsed: false })
    }
  }

  isMobile() {
    return this.state.windowWidth < 500;
  }

  connect(deviceID, password, cb) {
    const updates = { deviceID, password };
    const name = this.state.keyringName ? this.state.keyringName : this.state.name
    if (!this.state.session) {
      // Create a new session if we don't have one.
      const settings = localStorage.getSettings()
      //@ts-expect-error
      updates.session = new SDKSession(deviceID, this.setError, name, settings);
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

  handleKeyringOpener() {
    this.setState({ openedByKeyring: true })
  }

  returnKeyringData() {
    if (!this.state.openedByKeyring)
      return;
    // Save the login for later
    localStorage.setKeyringItem(this.state.keyringName, {
      deviceID: this.state.deviceID,
      password: this.state.password,
      lastLogin: new Date().getTime()
    })
    // Send the data back to the opener
    const data = {
      deviceID: this.state.deviceID,
      password: this.state.password,
      endpoint: constants.BASE_SIGNING_URL,
    };
    // Check if there is a custom endpoint configured
    const settings = localStorage.getSettings();
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
  wait(msg=null, onCancel=null) {
    this.setState({ pendingMsg: msg, waiting: true, onCancel });
  }

  unwait() {
    this.setState({ pendingMsg: null, waiting: false, onCancel: null });
  }

  //------------------------------------------
  // END LOCAL STATE UPDATES
  //------------------------------------------

  //------------------------------------------
  // HEADER HANDLERS
  //------------------------------------------
  handlePageTurn(page) {
    this.state.session.setPage(page);
  }

  handleMenuChange ({ key }) {
    const stateUpdate = { menuItem: key }
    //@ts-expect-error
    if (this.isMobile()) stateUpdate.collapsed = true
    this.setState(stateUpdate)
  }

  handleLogout(err=null) {
    this.unwait();
    this.state.session.disconnect();
    this.setState({ session: null });
    localStorage.removeLogin()
    if (err && err === constants.LOST_PAIRING_MSG)
      //@ts-expect-error
      this.setError({ err })
  }

  setError(data={msg:null, cb:null}) {
    // Handle case where user deletes pairing on the Lattice
    if (data.msg === constants.LOST_PAIRING_ERR)
      return this.handleLostPairing();
    this.setState({ error: data, loading: false })
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
      //@ts-expect-error
      return this.setError({ 
        msg: 'You must provide a deviceID and password. Please refresh and log in again. '
      });
    } else {
      this.setError();
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
            localStorage.setLogin({ deviceID, password })
          }
          // 2. Clear errors and alerts
          this.setError();
          // 3. Proceed based on state
          if (isPaired && this.state.openedByKeyring) {
            return this.returnKeyringData();
          }
        }
      });
    })
  }

  // Fetch up-to-date blockchain state data for the addresses stored in our
  // SDKSession. Called after we load addresses for the first time
  // Passing `isRecursion=true` means we will attempt to fetch new
  // addresses based on known state data and if we do not yield any new ones
  // we should exit. This is done to avoid naively requesting state data
  // for all known addresses each time we add a new one based on a gap limit.
  // For example, an initial sync will get 20 addrs and fetch state data. It 
  // may then request one address at a time and then state data for that one
  // address until the gap limit is reached.
  fetchBtcData(isRecursion=false) {
    this.unwait();
    this.setError();
    this.wait('Fetching addresses');
    this.state.session.fetchBtcAddresses((err, newAddrCounts) => {
      if (err) {
        console.error('Error fetching BTC addresses', err)
        this.unwait();
        this.setError({ 
          msg: 'Failed to fetch BTC addresses. Please try again.', 
          cb: this.fetchBtcData
        });
        return;
      }
      this.unwait()
      const shouldExit =  isRecursion && 
                          newAddrCounts.regular === 0 && 
                          newAddrCounts.change === 0;
      if (shouldExit) {
        // Done syncing
        return;
      }
      // If this is the first time we are calling this function,
      // start by clearing UTXOs to avoid stale balances
      if (!isRecursion) {
        this.state.session.clearUtxos();
      }
      // Sync data now
      this.wait('Syncing chain data')
      const opts = isRecursion ? newAddrCounts : null;
      this.state.session.fetchBtcStateData(opts, (err) => {
        if (err) {
          console.error('Error fetching BTC state data', err)
          this.unwait();
          this.setError({ 
            msg: 'Failed to fetch BTC state data. Please try again.', 
            cb: this.fetchBtcData 
          });
          return;
        }
        // Recurse such that we exit if there are no new addresses
        this.fetchBtcData(true);
      })
    })
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
    this.setState({ waiting: true })
    this.state.session.refreshWallets((err) => {
      if (err === constants.LOST_PAIRING_ERR)
        return this.handleLostPairing();
      
      this.syncActiveWalletState(true);
      this.unwait();
      if (err)
        return this.setError({ msg: err, cb: this.refreshWallets })
      this.setError();
      if (constants.BTC_PURPOSE_NONE !== getBtcPurpose())
        this.fetchBtcData()
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
      } else if (this.state.openedByKeyring) {
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
    const hideWallet = constants.BTC_PURPOSE_NONE === getBtcPurpose();
    return (
      <Sider
        collapsed={this.state.collapsed}
        collapsedWidth={0}
      >
        <Menu theme="dark" mode="inline" onSelect={this.handleMenuChange}>
          {/* Setting title={null} removes floating tooltip on mobile */}
          <Menu.Item key="menu-landing" title={null}>
            <HomeOutlined/>
            <span>Home</span>
            </Menu.Item>
          <Menu.Item key="menu-kv-records" title={null}>
            <TagsOutlined />
            <span>Address Tags</span>
          </Menu.Item>
          <Menu.Item key="menu-eth-contracts" title={null}>
            <AuditOutlined />
            <span>Contracts</span>
          </Menu.Item>
          {/* <Menu.Item key="menu-permissions">
            <DollarOutlined/>
            <span>Limits</span>
          </Menu.Item> */}
          <Menu.Item key="menu-settings" title={null}>
            <SettingOutlined />
            <span>Settings</span>
          </Menu.Item>
          {!hideWallet ? (
            <Menu.SubMenu title="BTC Wallet" key="submenu-wallet">
              <Menu.Item key="menu-wallet" title={null}>
                <WalletOutlined />
                <span>History</span>
              </Menu.Item>
              <Menu.Item key="menu-send" title={null}>
                <ArrowUpOutlined />
                <span>Send</span>
              </Menu.Item>
              <Menu.Item key="menu-receive" title={null}>
                <ArrowDownOutlined />
                <span>Receive</span>
              </Menu.Item>
            </Menu.SubMenu>
          ) : null}
        </Menu>
      </Sider>
    );
  }

  renderSidebar() {
    if (this.state.name !== constants.DEFAULT_APP_NAME)
      return
    if (this.isConnected())
      return this.renderMenu();
  }

  renderHeaderText() {
    return (
      <>
        {this.isMobile() ? (
          <Button
            onClick={() => this.setState({ collapsed: !this.state.collapsed })}
            type="text"
            size="large"
            icon={<MenuOutlined />}
            style={{ backgroundColor: "transparent", marginRight: "5px" }}
          />
        ) : null}
        <a
          className="lattice-a"
          href="https://gridplus.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img  alt="GridPlus" 
                src={'/gridplus-logo.png'}
                style={{height: '1em'}}/>
        </a>
      </>
    );
  }

  renderHeader() {
    if (this.state.name !== constants.DEFAULT_APP_NAME)
      return
    let extra: any[] = [];
    if (!this.isConnected())
      return;

    // Display a tag if there is a SafeCard inserted
    let walletTag = null;
    const size = this.isMobile() ? 'small' : 'middle';
    const activeWallet = this.state.session.getActiveWallet();

    if (activeWallet === null) {
      walletTag = ( 
        //@ts-expect-error
        <Button type="danger" ghost onClick={this.refreshWallets} size={size}>No Wallet <ReloadOutlined/></Button>
      )
    } else {
      walletTag = activeWallet.external === true ?  (
        <Button type="primary" ghost onClick={this.refreshWallets} size={size}><CreditCardOutlined/> SafeCard <ReloadOutlined/></Button>
      ) : (
        <Button type="default" ghost onClick={this.refreshWallets} size={size}><CheckOutlined/> Lattice <ReloadOutlined/></Button>
      )
    }
    if (walletTag) extra.push((
      <Tooltip title="Refresh" key="WalletTagTooltip">{walletTag}</Tooltip>));

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

  renderErrorHeader() {
    if (this.state.error.msg) {
      const err = (
        <Error  msg={this.state.error.msg} 
                retryCb={this.state.error.cb}
        />
      )
      return (
        <PageContent content={err} isMobile={() => this.isMobile()}/>
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
          <Wallet isMobile={() => this.isMobile()}
                  session={this.state.session}
                  refreshData={this.fetchBtcData}
                  lastUpdated={this.state.lastUpdated}
                  pageTurnCb={this.handlePageTurn}
          />
        );
      case 'menu-receive':
        return (
          <Receive session={this.state.session}
                   isMobile={() => this.isMobile()}
          />
        );
      case 'menu-send':
        return (
          <Send session={this.state.session}
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
          <AddressTagsPage
            session={this.state.session}
            isMobile={() => this.isMobile()}
          />
        )
      case DEFAULT_MENU_ITEM:
        return (
          <Landing isMobile={() => this.isMobile()}/>
        );
      default:
        return;
    }
  }

  renderContent() {
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
                  keyringName={this.state.keyringName}
                  setKeyringName={(keyringName) => this.setState({ keyringName })}
                  isMobile={() => this.isMobile()}
                  errMsg={this.state.error.msg}/>
      );
    } else if (!this.state.session.isPaired()) {
      // Automatically try to pair if we have a session but no pairing  
      return (
        <Pair submit={this.handlePair}
              isMobile={() => this.isMobile()}
              hide={!!this.state.error.msg} />
      );
    } else if (this.state.openedByKeyring) {
      // The window should close automatically, but just in case something goes wrong...
      return (
        <Loading isMobile={() => { this.isMobile() }}
                  msg={"Successfully connected to your Lattice! You may close this window."}
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
              {this.renderErrorHeader()}
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