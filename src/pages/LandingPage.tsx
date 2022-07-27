import {
  DesktopOutlined,
  TagsOutlined
} from "@ant-design/icons";
import { Alert, Card, Divider } from "antd";
import "antd/dist/antd.dark.css";
import PageContent from "../components/PageContent";
import { useFeature } from "../hooks/useFeature";
import { constants } from "../util/helpers";

const Landing = () => {
  const { USES_AUTO_ABI } = useFeature();

  return (
    <PageContent>
      <Card bordered={true} style={{ textAlign: "center" }}>
        <div>
          <h1 className="lattice-h1">
            <DesktopOutlined />
            &nbsp;Lattice Manager
          </h1>
          <p className="lattice-h4">
            Manage secure data on your Lattice hardware wallet device for a
            better web3 experience:
          </p>
        </div>
        <div style={{ margin: "25px" }}>
          <p>
            <a
              href={constants.TAGS_HELP_LINK}
              className="lattice-a"
              target="_blank"
              rel="noopener noreferrer"
            >
              <TagsOutlined />
              &nbsp;
              <b>Address Tags</b>&nbsp;
            </a>
          </p>
        </div>
        <p>
          <i>Give names to your favorite contracts or recipient addresses.</i>
        </p>
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
        <Divider />
        <img
          src="lattice-landing.jpg"
          style={{ maxHeight: "500px", maxWidth: "100%" }}
          alt="lattice-one-device"
        />
      </Card>
    </PageContent>
  );
};

export default Landing;
