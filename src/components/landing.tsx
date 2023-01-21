import {
  CreditCardOutlined,
  TagsOutlined,
  TwitterOutlined,
  YoutubeOutlined,
  InfoCircleOutlined,
  WalletOutlined,
  MailOutlined,
  ReconciliationOutlined,
} from "@ant-design/icons";
import { faBtc } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert, Button, Card } from "antd";
import { constants } from "../util/helpers";
import React from "react";
import { useFeature } from "../hooks/useFeature";
import { PageContent } from "./index";
import { LandingCard } from "./LandingCard";

const Landing = ({ goToPage }) => {
  const { USES_AUTO_ABI } = useFeature();
  const PAGE_KEYS = constants.PAGE_KEYS;

  return (
    <PageContent>
      <Card
        style={{ textAlign: "center" }}
        headStyle={{ fontSize: "32px" }}
        title="Lattice Manager"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2em",
            margin: "15px",
            justifyItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1em",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: "200px" }}>
                <p style={{ fontSize: "1.2em" }}>
                  Manage secure data on your Lattice hardware wallet device for
                  a better web3 experience
                </p>
              </div>
              <img
                src="lattice-landing.png"
                style={{ maxWidth: "250px" }}
                alt="lattice-one-device"
              />
            </div>
          </div>
          <div>
            <h2>Features</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "1em",
              }}
            >
              <LandingCard
                title="Address Tags"
                body="Tag your favorite contracts or addresses"
                icon={<TagsOutlined />}
                link={PAGE_KEYS.ADDRESS_TAGS}
                goToPage={goToPage}
              />
              <LandingCard
                title="Wallet Explorer"
                body="Find and tag addresses by derivation path"
                icon={<WalletOutlined />}
                link={PAGE_KEYS.EXPLORER}
                goToPage={goToPage}
              />
              <LandingCard
                title="Bitcoin Wallet"
                body={"Check balances and send BTC transactions"}
                icon={<FontAwesomeIcon icon={faBtc} />}
                link={PAGE_KEYS.SETTINGS}
                goToPage={goToPage}
              />
            </div>
          </div>
          <div>
            <Card
              bodyStyle={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src="gridpunk.png"
                style={{ maxWidth: "250px" }}
                alt="lattice-one-device"
              />
              <div style={{ width: "200px" }}>
                <h2>Mint your GridPunk</h2>
                <p>
                  GridPunk digital collectibles are a gift from GridPlus to
                  Lattice1 owners.
                </p>
                <Button href="https://gridplus.io/gridpunks">Learn More</Button>
              </div>
            </Card>
          </div>
          <div>
            <h2>Resources</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "1em",
              }}
            >
              <LandingCard
                title="@GridPlus"
                body="Follow GridPlus on Twitter"
                icon={<TwitterOutlined />}
                link="https://twitter.com/GridPlus"
                goToPage={goToPage}
              />
              <LandingCard
                title="GridPlus"
                body="Subscribe to GridPlus on YouTube"
                icon={<YoutubeOutlined />}
                link="https://youtube.com/GridPlus"
                goToPage={goToPage}
              />
              <LandingCard
                title="Documentation"
                body="Learn more about your Lattice"
                icon={<InfoCircleOutlined />}
                link="https://docs.gridplus.io"
                goToPage={goToPage}
              />
              <LandingCard
                title="SafeCards"
                body="Backup or create new wallets"
                icon={<CreditCardOutlined />}
                link="https://gridplus.io/safecards"
                goToPage={goToPage}
              />
              <LandingCard
                title="Newsletter"
                body="Subscribe for the latest from GridPlus"
                icon={<MailOutlined />}
                link="https://gridplus.io/subscribe"
                goToPage={goToPage}
              />
              <LandingCard
                title="Survey"
                body="Help us improve your experience"
                icon={<ReconciliationOutlined />}
                link="https://gridplus.io/survey"
                goToPage={goToPage}
              />
            </div>
          </div>
        </div>
        {!USES_AUTO_ABI ? (
          <Alert
            style={{ maxWidth: "500px", margin: "auto" }}
            message="Lattice firmware is out of date"
            description={
              <div style={{ padding: "0 25px 0 25px" }}>
                <p>
                  Please update immediately to receive automatic contract
                  decoding, which ensures you know what you're signing.
                </p>
                <div
                  style={{ margin: "auto", width: "66%", textAlign: "left" }}
                >
                  <p>To update your firmware:</p>
                  <ol>
                    <li>Unlock your device</li>
                    <li>
                      Tap <strong>Settings</strong>
                    </li>
                    <li>
                      Tap <strong>Software Update</strong>
                    </li>
                    <li>
                      Tap <strong>Update</strong>
                    </li>
                  </ol>
                </div>
              </div>
            }
            type="warning"
            showIcon
          />
        ) : null}
      </Card>
    </PageContent>
  );
};

export default Landing;
