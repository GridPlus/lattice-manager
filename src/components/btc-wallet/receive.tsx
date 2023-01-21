import { CopyOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, Row } from "antd";
import { QRCodeSVG } from "qrcode.react";
import React from "react";
import { AppContext } from "../../store/AppContext";
import { validateBtcAddr } from "../../util/helpers";
import { PageContent } from "../index";
const { Search, TextArea } = Input;
const SEARCH_ID = "address-data";

class Receive extends React.Component<any, any> {
  static contextType = AppContext;
  context = this.context as any;
  constructor(props) {
    super(props);

    this.state = {
      address: null,
      windowWidth: document.getElementById("main-content-inner")?.offsetWidth,
    };

    this.updateWidth = this.updateWidth.bind(this);
  }

  componentDidMount() {
    this.updateDisplayAddress();
    if (this.props.session) {
      this.props.session.getBtcWalletData();
    }
    window.addEventListener("resize", this.updateWidth);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateWidth);
  }

  updateWidth() {
    this.setState({
      windowWidth: document.getElementById("main-content-inner")?.offsetWidth,
    });
  }

  updateDisplayAddress() {
    const displayAddr = this.props.session.getBtcDisplayAddress();
    if (displayAddr) this.setState({ address: displayAddr });
  }

  copyAddress() {
    const copy = document.getElementById(SEARCH_ID);
    //@ts-expect-error
    copy.select();
    document.execCommand("copy");
  }

  renderAddrBox() {
    if (this.context.isMobile) {
      return (
        <div>
          <TextArea
            id={SEARCH_ID}
            value={this.state.address}
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ margin: "30px 0 0 0", textAlign: "center" }}
          />
          <Button
            type="primary"
            style={{ margin: "20px 0 0 0" }}
            onClick={this.copyAddress}
          >
            Copy <CopyOutlined />
          </Button>
        </div>
      );
    } else {
      return (
        <Search
          type="text"
          id={SEARCH_ID}
          value={this.state.address}
          enterButton={<CopyOutlined />}
          onSearch={this.copyAddress}
          style={{ margin: "30px 0 0 0", textAlign: "center" }}
        />
      );
    }
  }

  renderCard() {
    if (this.state.address) {
      // Sanity check on BTC address checksum
      if (!validateBtcAddr(this.state.address)) return;
      const cardW = document.getElementById("receive-card")?.offsetWidth;
      const w = Math.min(300, 0.8 * cardW);
      return (
        <div>
          <Row justify="center">
            <QRCodeSVG
              value={this.state.address}
              size={w}
              style={{ margin: "30px 0 0 0" }}
            />
          </Row>
          <Row justify="center">{this.renderAddrBox()}</Row>
        </div>
      );
    } else {
      return (
        <div>
          <p>No addresses found</p>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }
  }

  render() {
    const content = (
      <center>
        <Card title={"Receive BTC"} bordered={true} id="receive-card">
          <center>{this.renderCard()}</center>
        </Card>
      </center>
    );
    return <PageContent content={content} />;
  }
}

export default Receive;
