import { CopyOutlined, LoadingOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, Row, Spin } from "antd";
import { QRCodeSVG } from "qrcode.react";
import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../store/AppContext";
import { useFeature } from "../../hooks/useFeature";
import { PageContent } from "../index";
const { Search, TextArea } = Input;
const SEARCH_ID = "xpub-data";

interface XpubPageProps {
  session: any;
}

const XpubPage: React.FC<XpubPageProps> = ({ session }) => {
  const context = useContext(AppContext);
  const { SUPPORTS_XPUB } = useFeature();
  const [xpub, setXpub] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState<number | undefined>(
    document.getElementById("main-content-inner")?.offsetWidth
  );
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const addresses = await session.client?.getAddresses({
        startPath: [44 + 0x80000000, 0 + 0x80000000, 0 + 0x80000000],
        flag: 6,
      });
      if (addresses && addresses.length > 0) {
        setXpub(addresses[0]);
      }
    } catch (err) {
      console.error("Error fetching XPUB:", err);
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

  const renderXpubBox = () => {
    if (context.isMobile) {
      return (
        <div>
          <TextArea
            id={SEARCH_ID}
            value={xpub}
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ margin: "30px 0 0 0", textAlign: "center" }}
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
