import { Card } from "antd";
import { constants, getBtcPurpose } from "../util/helpers";

const isBtcWalletActive = () => constants.BTC_PURPOSE_NONE !== getBtcPurpose();
const PAGE_KEYS = constants.PAGE_KEYS;

export const LandingCard = ({
  icon,
  title,
  body,
  link,
  goToPage,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  link: string;
  goToPage: (key: string) => void;
}) => (
  <div style={{ flexGrow: 1, flexBasis: 0 }}>
    <a
      onClick={(event) => {
        if (link === "settings") {
          event.preventDefault();
          if (isBtcWalletActive()) {
            goToPage(PAGE_KEYS.WALLET);
          } else {
            goToPage(PAGE_KEYS.SETTINGS);
          }
        }
        if (link === "address-tags") {
          event.preventDefault();
          goToPage(PAGE_KEYS.ADDRESS_TAGS);
        }
      }}
      href={link}
      className="lattice-a"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card
        style={{
          height: "100%",
          width: "100%",
        }}
        hoverable
      >
        <b style={{ color: "#94B3FD" }}>
          {icon}&nbsp;{title}
        </b>
        <p>
          <i>{body}</i>
        </p>
      </Card>
    </a>
  </div>
);
