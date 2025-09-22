import React from "react";
import { Button, Layout, Menu, PageHeader, Tag, Tooltip } from "antd";
import {
  HomeOutlined,
  MenuOutlined,
  TagsOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  CreditCardOutlined,
  CheckOutlined,
  SettingOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { default as SDKSession } from "../sdk/sdkSession";
import {
  Connect,
  Error,
  Landing,
  Loading,
  PageContent,
  Pair,
  Send,
  Receive,
  Wallet,
  Settings,
  ValidateSig,
  AddressTagsPage,
} from "./index";
import { constants, getBtcPurpose } from "../util/helpers";
import localStorage from "../util/localStorage";
import { AppContext } from "../store/AppContext";
import ExplorerPage from "./ExplorerPage";
import type { MenuProps } from "antd/es/menu";
import { sendErrorNotification } from "../util/sendErrorNotification";
type MenuItem = Required<MenuProps>["items"][number];
import XpubPage from "./btc-wallet/XpubPage";

const { Content, Footer, Sider } = Layout;
const LOGIN_PARAM = "loginCache";
const PAGE_KEYS = constants.PAGE_KEYS;
const DEFAULT_PAGE = PAGE_KEYS.LANDING;

type MainState = {
  name: string;
  menuItem: string;
  session: any;
  collapsed: boolean;
  error: { msg: string; cb: Function };
  loading: boolean;
  pendingMsg: string;
  waiting: boolean;
  onCancel: Function;
  deviceID: string;
  password: string;
  lastUpdated: Date;
  windowWidth: number;
  walletIsExternal: boolean;
  keyringName: string;
  openedByKeyring: boolean;
  keyringConnectionFailed: boolean;
  hwCheck: string;
};

class Main extends React.Component<any, MainState> {
  static contextType = AppContext;
  context = this.context as any;

  constructor(props) {
    super(props);
    const params = new URLSearchParams(window.location.search);
    const keyringName = params.get("keyring");
    this.state = {
      name: constants.DEFAULT_APP_NAME,
      menuItem: DEFAULT_PAGE,
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
      // Track if keyring connection failed to prevent returning invalid data
      keyringConnectionFailed: false,
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
    window.addEventListener("resize", this.updateWidth);

    if (this.isMobile()) this.setState({ collapsed: true });
    // Consuming libraries connect through a keyring and in these cases we need
    // to utilize window.postMessage once we connect.
    // This pattern can be extended to other apps in the future.
    const params = new URLSearchParams(window.location.search);
    const keyringName = this.state.keyringName;
    const hwCheck = params.get("hwCheck");
    const forceLogin = params.get("forceLogin");

    // Workaround to support Firefox extensions. See `returnKeyringData` below.
    const hasLoggedIn = params.get(LOGIN_PARAM);
    if (hasLoggedIn) {
      this.setState({ waiting: true, pendingMsg: "Connecting..." });
      return;
    }

    if (keyringName) {
      //@ts-expect-error
      window.onload = this.handleKeyringOpener();
      this.setState({ keyringName }, () => {
        // Check if this keyring has already logged in. This login should expire after a period of time.
        const prevKeyringLogin = localStorage.getKeyringItem(keyringName);
        if (!forceLogin && prevKeyringLogin) {
          this.connect(
            prevKeyringLogin.deviceID,
            prevKeyringLogin.password,
            () => this.connectSession(prevKeyringLogin)
          );
        }
      });
    } else if (hwCheck) {
      // Lattice validation check builds this URL and includes a signature + preimage
      this.setState({ hwCheck });
    } else {
      // Lookup deviceID and pw from storage
      const { deviceID, password } = localStorage.getLogin();
      if (deviceID && password)
        this.connect(deviceID, password, () => this.connectSession());
    }
  }

  componentDidUpdate() {
    if (this.context.session) this.syncActiveWalletState();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateWidth);
  }

  updateWidth() {
    this.setState({ windowWidth: window.innerWidth });
    if (this.isMobile() && !this.state.collapsed) {
      this.setState({ collapsed: true });
    } else if (!this.isMobile() && this.state.collapsed) {
      this.setState({ collapsed: false });
    }
  }

  isMobile() {
    return this.context.isMobile;
  }

  connect(deviceID, password, cb) {
    const updates = { deviceID, password };
    const name = this.state.keyringName
      ? this.state.keyringName
      : this.state.name;
    if (!this.context.session) {
      // Create a new session if we don't have one.
      const settings = localStorage.getSettings();
      this.context.setSession(
        new SDKSession(deviceID, this.setError, name, settings)
      );
    }
    this.setState(updates, cb);
  }

  cancelConnect() {
    // Cancel the pairing process if it was started (i.e. if the connection was started with
    // a device that could be discovered). Most of the time this will not be possible because
    // the cancel button that triggers this function will not be displayed once the device
    // responds back that it is ready to pair.
    if (this.context.session && this.context.session.client) {
      this.context.session.client.pair("", () => {});
    }
    // Reset all SDK-related state variables so the user can re-connect to something else.
    this.setState({ deviceID: null, password: null, session: null });
    this.unwait();
  }

  isConnected() {
    if (!this.context.session) return false;
    return this.context.session.isConnected();
  }

  //------------------------------------------
  // KEYRING HANDLERS
  //------------------------------------------

  handleKeyringOpener() {
    this.setState({ openedByKeyring: true });
  }

  returnKeyringData() {
    console.log(`[KEYRING_RETURN] Starting returnKeyringData process`);
    console.log(`[KEYRING_RETURN] State check - openedByKeyring: ${this.state.openedByKeyring}, connectionFailed: ${this.state.keyringConnectionFailed}`);

    if (!this.state.openedByKeyring) {
      console.warn(`[KEYRING_RETURN] ⚠️ Not opened by keyring, aborting return process`);
      return;
    }

    // CRITICAL: Do not return data if the connection failed
    if (this.state.keyringConnectionFailed) {
      console.error(`[KEYRING_RETURN] 🚫 BLOCKED: Connection failed - refusing to return data to consuming library`);
      console.error(`[KEYRING_RETURN] This prevents consuming library from receiving invalid/stale connection data`);
      return;
    }

    console.log(`[KEYRING_RETURN] Saving login data for keyring: ${this.state.keyringName}`);

    // Save the login for later
    const keyringData = {
      deviceID: this.state.deviceID,
      password: this.state.password,
      lastLogin: new Date().getTime(),
    };

    try {
      localStorage.setKeyringItem(this.state.keyringName, keyringData);
      console.log(`[KEYRING_RETURN] Successfully saved keyring data`);
    } catch (err) {
      console.error(`[KEYRING_RETURN] Failed to save keyring data:`, err);
    }

    // Send the data back to the opener
    const data = {
      deviceID: this.state.deviceID,
      password: this.state.password,
      endpoint: constants.BASE_SIGNING_URL,
    };

    console.log(`[KEYRING_RETURN] Preparing response data with endpoint: ${data.endpoint}`);

    // Check if there is a custom endpoint configured
    const settings = localStorage.getSettings();
    if (settings.customEndpoint && settings.customEndpoint !== "") {
      console.log(`[KEYRING_RETURN] Using custom endpoint: ${settings.customEndpoint}`);
      data.endpoint = settings.customEndpoint;
    }

    console.log(`[KEYRING_RETURN] Final response data prepared:`, {
      deviceID: data.deviceID,
      endpoint: data.endpoint,
      hasPassword: !!data.password
    });

    this.handleLogout();

    // Check the window opener situation
    console.log(`[KEYRING_RETURN] Window opener check - exists: ${!!window.opener}`);

    if (window.opener) {
      // If there is a `window.opener` we can just post back
      console.log(`[KEYRING_RETURN] Using window.opener.postMessage method`);

      try {
        const messageData = JSON.stringify(data);
        console.log(`[KEYRING_RETURN] Sending postMessage with data length: ${messageData.length} characters`);

        window.opener.postMessage(messageData, "*");
        console.log(`[KEYRING_RETURN] ✅ PostMessage sent successfully, closing window...`);

        window.close();
      } catch (err) {
        console.error(`[KEYRING_RETURN] ❌ Failed to send postMessage:`, err);
        console.error(`[KEYRING_RETURN] Error details:`, {
          message: err.message,
          stack: err.stack,
          dataSize: JSON.stringify(data).length
        });
      }
    } else {
      // Otherwise we need a workaround to let the originator
      // know we have logged in. We will put the login data
      // into the URL and the requesting app will fetch that.
      // Note that the requesting extension is now responsible for
      // closing this web page.
      console.log(`[KEYRING_RETURN] No window.opener, using URL-based workaround`);

      try {
        const enc = Buffer.from(JSON.stringify(data)).toString("base64");
        const newUrl = `${window.location.href}&${LOGIN_PARAM}=${enc}`;

        console.log(`[KEYRING_RETURN] Encoded data length: ${enc.length} characters`);
        console.log(`[KEYRING_RETURN] Redirecting to URL with login parameter...`);

        window.location.href = newUrl;
        console.log(`[KEYRING_RETURN] ✅ URL redirect initiated`);
      } catch (err) {
        console.error(`[KEYRING_RETURN] ❌ Failed to encode data or redirect:`, err);
        console.error(`[KEYRING_RETURN] Error details:`, {
          message: err.message,
          stack: err.stack,
          currentUrl: window.location.href
        });
      }
    }
  }
  //------------------------------------------
  // END KEYRING HANDLERS
  //------------------------------------------

  //------------------------------------------
  // LOCAL STATE UPDATES
  //------------------------------------------
  wait(msg = null, onCancel = null) {
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
    this.context.session.setPage(page);
  }

  handleMenuChange({ key }) {
    const stateUpdate = { menuItem: key };
    //@ts-expect-error
    if (this.isMobile()) stateUpdate.collapsed = true;
    this.setState(stateUpdate);
  }

  handleLogout(err = null) {
    this.unwait();
    this.context.session.disconnect();
    this.setState({ session: null });
    localStorage.removeLogin();
    localStorage.removeAddresses();
    if (err && err === constants.LOST_PAIRING_MSG)
      //@ts-expect-error
      this.setError({ err });
  }

  setError(data = { msg: null, cb: null }) {
    // Handle case where user deletes pairing on the Lattice
    if (data.msg === constants.LOST_PAIRING_ERR)
      return this.handleLostPairing();
    this.setState({ error: data, loading: false });
  }

  //------------------------------------------
  // END HEADER HANDLERS
  //------------------------------------------

  //------------------------------------------
  // SDK HOOKS
  //------------------------------------------

  // Call `connect` on the SDK session. If we get an error back, clear out the client,
  // as we cannot connect.
  connectSession(data = this.state, showLoading = true) {
    const { deviceID, password } = data;
    const sessionStartTime = Date.now();

    console.log(`[KEYRING_CONNECTION] Starting connectSession for device: ${deviceID}`);
    console.log(`[KEYRING_CONNECTION] Keyring details:`, {
      keyringName: this.state.keyringName,
      openedByKeyring: this.state.openedByKeyring,
      showLoading
    });

    // Sanity check -- this should never get hit
    if (!deviceID || !password) {
      console.error(`[KEYRING_CONNECTION] Missing credentials - deviceID: ${!!deviceID}, password: ${!!password}`);
      //@ts-expect-error
      return this.setError({
        msg: "You must provide a deviceID and password. Please refresh and log in again. ",
      });
    } else {
      this.setError();
    }

    console.log(`[KEYRING_CONNECTION] Credentials validated, proceeding with connection...`);

    // Connect to the device
    this.connect(deviceID, password, () => {
      console.log(`[KEYRING_CONNECTION] Local session setup completed, initiating SDK connection...`);

      // Create a new session with the deviceID and password provided.
      if (showLoading === true) {
        this.wait("Looking for your Lattice", this.cancelConnect);
      }

      this.context.session
        .connect(deviceID, password)
        .then((isPaired) => {
          const sessionDuration = Date.now() - sessionStartTime;
          console.log(`[KEYRING_CONNECTION] ✅ SDK connection successful after ${sessionDuration}ms`);
          console.log(`[KEYRING_CONNECTION] Device paired status: ${isPaired}`);

          this.unwait();

          // If the request was before we got our callback, exit here
          if (!this.context.session || this.state.deviceID !== deviceID) {
            console.warn(`[KEYRING_CONNECTION] Session state mismatch detected, aborting. Session exists: ${!!this.context.session}, DeviceID match: ${this.state.deviceID === deviceID}`);
            return;
          }

          console.log(`[KEYRING_CONNECTION] Processing successful connection...`);

          // We connected!
          // 1. Save these credentials to localStorage if this is NOT a keyring
          if (!this.state.openedByKeyring) {
            console.log(`[KEYRING_CONNECTION] Saving login credentials to localStorage (non-keyring)`);
            localStorage.setLogin({ deviceID, password });
          } else {
            console.log(`[KEYRING_CONNECTION] Skipping localStorage save (keyring mode)`);
          }

          // 2. Clear errors and alerts
          this.setError();

          // 3. Proceed based on state
          if (isPaired && this.state.openedByKeyring) {
            console.log(`[KEYRING_CONNECTION] Device paired and in keyring mode, returning data to consuming library...`);
            return this.returnKeyringData();
          } else {
            console.log(`[KEYRING_CONNECTION] Connection completed. Paired: ${isPaired}, Keyring mode: ${this.state.openedByKeyring}`);
          }
        })
        .catch((err) => {
          const sessionDuration = Date.now() - sessionStartTime;
          console.error(`[KEYRING_CONNECTION] ❌ SDK connection failed after ${sessionDuration}ms`);
          console.error(`[KEYRING_CONNECTION] Error details:`, {
            message: err.message,
            stack: err.stack,
            keyringName: this.state.keyringName,
            openedByKeyring: this.state.openedByKeyring,
            deviceID
          });

          // Mark keyring connection as failed if this was opened by a keyring
          if (this.state.openedByKeyring) {
            console.error(`[KEYRING_CONNECTION] 🚫 Marking keyring connection as failed - no data will be returned to consuming library`);
            this.setState({ keyringConnectionFailed: true });
          }

          if (this.state.keyringName) {
            console.log(`[KEYRING_CONNECTION] Cleaning up keyring data for: ${this.state.keyringName}`);
            localStorage.removeKeyringItem(this.state.keyringName);
          }

          this.setError({
            msg: err.message,
            cb: () => {
              console.log(`[KEYRING_CONNECTION] Retrying connection...`);
              // Reset the failure flag on retry
              if (this.state.openedByKeyring) {
                this.setState({ keyringConnectionFailed: false });
              }
              this.connectSession(data);
            },
          });
        });
    });
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
  fetchBtcData(isRecursion = false) {
    this.unwait();
    this.setError();
    this.wait("Fetching addresses");
    this.context.session.fetchBtcAddresses((err, newAddrCounts) => {
      if (err) {
        console.error("Error fetching BTC addresses", err);
        this.unwait();
        this.setError({
          msg: "Failed to fetch BTC addresses. Please try again.",
          cb: this.fetchBtcData,
        });
        return;
      }
      this.unwait();
      const shouldExit =
        isRecursion &&
        newAddrCounts.regular === 0 &&
        newAddrCounts.change === 0;
      if (shouldExit) {
        // Done syncing
        return;
      }
      // If this is the first time we are calling this function,
      // start by clearing UTXOs to avoid stale balances
      if (!isRecursion) {
        this.context.session.clearUtxos();
      }
      // Sync data now
      this.wait("Syncing chain data");
      const opts = isRecursion ? newAddrCounts : null;
      this.context.session.fetchBtcStateData(opts, (err) => {
        if (err) {
          console.error("Error fetching BTC state data", err);
          this.unwait();
          this.setError({
            msg: "Failed to fetch BTC state data. Please try again.",
            cb: this.fetchBtcData,
          });
          return;
        }
        // Recurse such that we exit if there are no new addresses
        this.fetchBtcData(true);
      });
    });
  }

  handleLostPairing() {
    // If we lost our pairing, we will have discovered that after trying to `connect`.
    // The Lattice will draw a pairing screen, so to tear it down we need to send an
    // invalid pairing code.
    // TODO: This will still draw a pairing failure screen on the Lattice. There is
    //       currently no way around this, but it is something we should address
    //       in the future.
    this.context.session.client.pair("x", () => {
      this.handleLogout(constants.LOST_PAIRING_MSG);
    });
  }

  refreshWallets() {
    if (this.state.waiting === true) return;
    this.wait("Refreshing wallets");
    this.setState({ waiting: true });
    this.context.session.refreshWallets((err) => {
      if (err === constants.LOST_PAIRING_ERR) return this.handleLostPairing();

      this.syncActiveWalletState(true);
      this.unwait();
      if (err) return this.setError({ msg: err, cb: this.refreshWallets });
      this.setError();
      if (constants.BTC_PURPOSE_NONE !== getBtcPurpose()) this.fetchBtcData();
    });
  }

  // If we detect a new active wallet interface, save it and refresh wallet addresses
  syncActiveWalletState(bypassRefresh = false) {
    const activeWallet = this.context.session.getActiveWallet();
    if (!activeWallet) return;
    const isExternal = activeWallet.external;
    if (this.state.walletIsExternal !== isExternal) {
      // We only want to refresh if we know another interface was active before. If this
      // is the first check, just set the flag without calling refresh (it will get called)
      // automatically.
      const shouldRefresh = this.state.walletIsExternal !== null;
      // Set state regardless
      this.setState({ walletIsExternal: isExternal });
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
    if (data[0] === "_" || data[0] === "[") data = data.slice(1);

    // If we didn't timeout, submit the secret and hope for success!
    this.wait("Establishing connection with your Lattice");
    this.context.session.client
      .pair(data)
      .then(() => {
        this.unwait();
        if (this.state.openedByKeyring) {
          this.returnKeyringData();
        }
      })
      .catch((err) => {
        console.error(`[KEYRING_PAIRING] ❌ Pairing failed:`, err);

        // Mark keyring connection as failed if this was opened by a keyring
        if (this.state.openedByKeyring) {
          console.error(`[KEYRING_PAIRING] 🚫 Marking keyring connection as failed due to pairing failure`);
          this.setState({ keyringConnectionFailed: true });
        }

        // If there was an error here, the user probably entered the wrong secret
        sendErrorNotification({
          message: "Failed to pair",
          description:
            "You may have mistyped the pairing code, or this device is already paired and you entered the incorrect password. Please try again.",
          duration: null, // Don't auto-dismiss
        });

        this.setState({ deviceID: null, password: null });
        this.context.session.disconnect();
        localStorage.removeLogin();
        this.unwait();
      });
  }

  //------------------------------------------
  // END SDK CALLBACKS
  //------------------------------------------

  //------------------------------------------
  // RENDERERS
  //------------------------------------------
  renderMenu() {
    const hideWallet = constants.BTC_PURPOSE_NONE === getBtcPurpose();

    const getMenuItems = () => {
      const items: MenuItem[] = [
        {
          key: PAGE_KEYS.LANDING,
          label: "Home",
          icon: <HomeOutlined />,
        },
        {
          key: PAGE_KEYS.ADDRESS_TAGS,
          label: "Address Tags",
          icon: <TagsOutlined />,
        },
        {
          key: PAGE_KEYS.EXPLORER,
          label: "Explorer",
          icon: <FileSearchOutlined />,
        },
        {
          key: PAGE_KEYS.SETTINGS,
          label: "Settings",
          icon: <SettingOutlined />,
        },
      ];
      if (!hideWallet) {
        items.push({
          key: "submenu-wallet",
          label: "BTC Wallet",
          children: [
            {
              key: PAGE_KEYS.WALLET,
              label: "History",
              icon: <WalletOutlined />,
            },
            {
              key: PAGE_KEYS.SEND,
              label: "Send",
              icon: <ArrowUpOutlined />,
            },
            {
              key: PAGE_KEYS.RECEIVE,
              label: "Receive",
              icon: <ArrowDownOutlined />,
            },
            {
              key: PAGE_KEYS.XPUB,
              label: "XPUB",
              icon: <CreditCardOutlined />,
            },
          ],
        });
      }
      return items;
    };

    return (
      <Sider collapsed={this.state.collapsed} collapsedWidth={0}>
        <Menu
          theme="dark"
          mode="inline"
          onSelect={this.handleMenuChange}
          items={getMenuItems()}
          selectedKeys={[this.state.menuItem]}
        />
      </Sider>
    );
  }

  renderSidebar() {
    if (this.state.name !== constants.DEFAULT_APP_NAME) return;
    if (this.isConnected()) return this.renderMenu();
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
          <img
            alt="GridPlus"
            src={"/gridplus-logo.png"}
            style={{ height: "3em" }}
          />
        </a>
      </>
    );
  }

  renderHeader() {
    if (this.state.name !== constants.DEFAULT_APP_NAME) return;
    let extra: any[] = [];
    if (!this.isConnected()) return;

    // Display a tag if there is a SafeCard inserted
    let walletTag = null;
    const size = this.isMobile() ? "small" : "middle";
    const activeWallet = this.context.session.getActiveWallet();

    if (!activeWallet) {
      walletTag = (
        //@ts-expect-error - danger type is missing in antd
        <Button type="danger" ghost onClick={this.refreshWallets} size={size}>
          No Wallet <ReloadOutlined />
        </Button>
      );
    } else {
      walletTag =
        activeWallet.external === true ? (
          <Button
            type="primary"
            ghost
            onClick={this.refreshWallets}
            size={size}
          >
            <CreditCardOutlined /> SafeCard <ReloadOutlined />
          </Button>
        ) : (
          <Button
            type="default"
            ghost
            onClick={this.refreshWallets}
            size={size}
          >
            <CheckOutlined /> Lattice <ReloadOutlined />
          </Button>
        );
    }
    if (walletTag)
      extra.push(
        <Tooltip title="Refresh" key="WalletTagTooltip">
          {walletTag}
        </Tooltip>
      );

    extra.push(
      <Button
        key="logout-button"
        type="primary"
        onClick={this.handleLogout}
        size={size}
      >
        Logout
      </Button>
    );
    return (
      <PageHeader
        title={this.renderHeaderText()}
        ghost={true}
        extra={!this.state.waiting ? extra : null}
      />
    );
  }

  renderErrorHeader() {
    if (this.state.error.msg) {
      return <Error msg={this.state.error.msg} retryCb={this.state.error.cb} />;
    } else {
      return;
    }
  }

  retry(cb) {
    this.setError();
    return cb();
  }

  renderPage() {
    switch (this.state.menuItem) {
      case PAGE_KEYS.WALLET:
        return (
          <Wallet
            session={this.context.session}
            refreshData={this.fetchBtcData}
            lastUpdated={this.state.lastUpdated}
            pageTurnCb={this.handlePageTurn}
          />
        );
      case PAGE_KEYS.RECEIVE:
        return <Receive session={this.context.session} />;
      case PAGE_KEYS.SEND:
        return <Send session={this.context.session} />;
      case PAGE_KEYS.SETTINGS:
        return <Settings />;
      case PAGE_KEYS.ADDRESS_TAGS:
        return <AddressTagsPage />;
      case PAGE_KEYS.EXPLORER:
        return <ExplorerPage />;
      case PAGE_KEYS.XPUB:
        return <XpubPage session={this.context.session} />;
      case DEFAULT_PAGE:
        return <Landing goToPage={(key) => this.handleMenuChange({ key })} />;
      default:
        return;
    }
  }

  renderContent() {
    const hasActiveWallet = this.context.session
      ? this.context.session.getActiveWallet() !== null
      : false;
    if (this.state.waiting) {
      return (
        <Loading msg={this.state.pendingMsg} onCancel={this.state.onCancel} />
      );
    } else if (!this.isConnected()) {
      // Connect to the Lattice via the SDK
      return (
        <Connect
          submitCb={this.connectSession}
          cancelConnect={this.cancelConnect}
          name={this.state.name}
          keyringName={this.state.keyringName}
          setKeyringName={(keyringName) => this.setState({ keyringName })}
          errMsg={this.state.error.msg}
        />
      );
    } else if (!this.context.session.isPaired()) {
      // Automatically try to pair if we have a session but no pairing
      return <Pair submit={this.handlePair} hide={!!this.state.error.msg} />;
    } else if (this.state.openedByKeyring) {
      // The window should close automatically, but just in case something goes wrong...
      return (
        <Loading
          msg={
            "Successfully connected to your Lattice! You may close this window."
          }
          spin={false}
        />
      );
    } else if (!hasActiveWallet) {
      const retry = this.context.session ? this.refreshWallets : null;
      return (
        <Error msg={"No active wallet present for device!"} retryCb={retry} />
      );
    } else {
      return this.renderPage();
    }
  }

  renderFooter() {
    return (
      <Footer style={{ textAlign: "center", color: "#969696" }}>
        © {new Date().getFullYear()} GridPlus, Inc. &nbsp;&nbsp; | &nbsp;&nbsp;
        v{APP_VERSION}
      </Footer>
    );
  }

  renderPageContainer() {
    if (this.state.hwCheck !== null) {
      return <ValidateSig data={this.state.hwCheck} />;
    } else {
      return this.renderContent();
    }
  }

  render() {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        {this.renderHeader()}
        <Layout id="main-content-outer">
          {this.renderSidebar()}
          <Layout id="main-content-inner">
            <Content style={{ margin: "0 0 0 0" }}>
              {this.renderErrorHeader()}
              <div>{this.renderPageContainer()}</div>
            </Content>
            {this.renderFooter()}
          </Layout>
        </Layout>
      </Layout>
    );
  }
}

export default Main;
