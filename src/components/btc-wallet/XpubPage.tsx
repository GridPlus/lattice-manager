import { CopyOutlined, LoadingOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, Row, Spin } from "antd";
import { QRCodeSVG } from "qrcode.react";
import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../store/AppContext";
import { useFeature } from "../../hooks/useFeature";
import { PageContent } from "../index";
import { constants, getBtcPurpose } from "../../util/helpers";

const { Search, TextArea } = Input;
const SEARCH_ID = "xpub-data";

interface XpubPageProps {
  session: any;
}

const XpubPage: React.FC<XpubPageProps> = ({ session }) => {
  const { isMobile } = useContext(AppContext);
  const { SUPPORTS_XPUB } = useFeature();
  const [xpub, setXpub] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState<number | undefined>(
    document.getElementById("main-content-inner")?.offsetWidth
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateXpubAddress();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const updateWidth = () => {
    setWindowWidth(document.getElementById("main-content-inner")?.offsetWidth);
  };

  const updateXpubAddress = async () => {
    if (!session) return;

    // Get the active BTC purpose (wallet type)
    const btcPurpose = getBtcPurpose();
    if (btcPurpose === constants.BTC_PURPOSE_NONE) {
      setError("BTC Wallet is hidden. Please enable it in settings to view XPUB.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the active wallet's BTC purpose as the derivation path
      const addresses = await session.client?.getAddresses({
        startPath: [btcPurpose, constants.BTC_COIN, 0 + constants.HARDENED_OFFSET],
        flag: 6, // LatticeGetAddressesFlag.secp256k1Xpub
      });

      if (addresses && addresses.length > 0) {
        setXpub(addresses[0]);
      } else {
        setError("No XPUB returned from device");
      }
    } catch (err) {
      console.error("Error fetching XPUB:", err);
      setError("Failed to fetch XPUB from device");
    } finally {
      setLoading(false);
    }
  };

  const copyXpub = () => {
    const copy = document.getElementById(SEARCH_ID);
    if (
      copy instanceof HTMLInputElement ||
      copy instanceof HTMLTextAreaElement
    ) {
      copy.select();
      document.execCommand("copy");
    }
  };

  const getWalletTypeLabel = () => {
    const btcPurpose = getBtcPurpose();
    switch (btcPurpose) {
      case constants.BTC_PURPOSE_LEGACY:
        return "Legacy";
      case constants.BTC_PURPOSE_WRAPPED_SEGWIT:
        return "Wrapped SegWit";
      case constants.BTC_PURPOSE_SEGWIT:
        return "Native SegWit";
      default:
        return "Unknown";
    }
  };

  const renderXpubBox = () => {
    if (isMobile) {
      return (
        <div>
          <TextArea
            id={SEARCH_ID}
            value={xpub}
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ margin: "30px 0 0 0", textAlign: "center" }}
            readOnly
          />
          <Button
            type="primary"
            style={{ margin: "20px 0 0 0" }}
            onClick={copyXpub}
          >
            Copy <CopyOutlined />
          </Button>
        </div>
      );
    }
    return (
      <Search
        type="text"
        id={SEARCH_ID}
        value={xpub}
        enterButton={<CopyOutlined />}
        onSearch={copyXpub}
        style={{ margin: "30px 0 0 0", textAlign: "center" }}
        readOnly
      />
    );
  };

  const renderCard = () => {
    if (!SUPPORTS_XPUB) {
      return (
        <div>
          <p>XPUB feature requires firmware version 0.18.6 or higher</p>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    if (error) {
      return (
        <div>
          <p style={{ color: '#ff4d4f', marginBottom: 16 }}>{error}</p>
          <Button onClick={updateXpubAddress}>
            Retry
          </Button>
        </div>
      );
    }

    if (loading) {
      return (
        <div style={{ padding: "50px 0" }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <p style={{ marginTop: "20px" }}>Fetching XPUB address...</p>
        </div>
      );
    }

    if (xpub) {
      const cardW = document.getElementById("xpub-card")?.offsetWidth;
      const w = Math.min(300, 0.8 * (cardW || 0));
      const xpubUrl = `https://www.blockchain.com/explorer/assets/btc/xpub/${xpub}`;
      return (
        <div>
          <p style={{ marginBottom: 16, fontSize: '14px', color: '#666' }}>
            Wallet Type: <strong>{getWalletTypeLabel()}</strong>
          </p>
          <Row justify="center">
            <QRCodeSVG
              value={xpubUrl}
              size={w}
              style={{ margin: "30px 0 0 0" }}
            />
          </Row>
          <Row justify="center">{renderXpubBox()}</Row>
        </div>
      );
    }

    return (
      <div>
        <p>No XPUB address found</p>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  };

  const content = (
    <center>
      <Card
        title={"BTC Extended Public Key (XPUB)"}
        bordered={true}
        id="xpub-card"
      >
        <center>{renderCard()}</center>
      </Card>
    </center>
  );

  return <PageContent content={content} />;
};

export default XpubPage;