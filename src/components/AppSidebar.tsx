import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  HomeOutlined,
  SettingOutlined,
  TagsOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Menu, MenuProps } from "antd";
import Sider from "antd/lib/layout/Sider";
import { useNavigate } from "react-router-dom";
import { constants, getBtcPurpose } from "../util/helpers";
const { BTC_PURPOSE_NONE } = constants;

type MenuItem = Required<MenuProps>["items"][number];

export const AppSidebar = () => {
  const navigate = useNavigate();
  const hideWallet = BTC_PURPOSE_NONE === getBtcPurpose();

  const getMenuItems = () => {
    const items: MenuItem[] = [
      {
        key: "",
        label: "Home",
        icon: <HomeOutlined />,
      },
      {
        key: "records",
        label: "Address Tags",
        icon: <TagsOutlined />,
      },
      {
        key: "settings",
        label: "Settings",
        icon: <SettingOutlined />,
      },
    ];
    if (!hideWallet) {
      items.push({
        key: "subwallet",
        label: "BTC Wallet",
        children: [
          {
            key: "wallet",
            label: "History",
            icon: <WalletOutlined />,
          },
          {
            key: "send",
            label: "Send",
            icon: <ArrowUpOutlined />,
          },
          {
            key: "receive",
            label: "Receive",
            icon: <ArrowDownOutlined />,
          },
        ],
      });
    }
    return items;
  };

  const handleMenuSelect = ({ key }) => {
    navigate(`${key}`);
  };

  return (
    <Sider collapsedWidth={0} breakpoint="lg">
      <a
        className="lattice-a"
        href="https://gridplus.io"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          alt="GridPlus"
          src={"/gridplus-logo.png"}
          style={{ width: "100%" }}
        />
      </a>
      <Menu
        theme="dark"
        mode="inline"
        onSelect={handleMenuSelect}
        items={getMenuItems()}
      />
    </Sider>
  );
};
