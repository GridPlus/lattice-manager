import { CheckOutlined, CreditCardOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useCallback, useContext, useState } from "react";
import { useLattice } from "../hooks/useLattice";
import { BitcoinContext } from "../store/BitcoinContext";
import { sendErrorNotification } from "../util/sendErrorNotification";

export const WalletButton = () => {
  const { updateActiveWallet, activeWallet } = useLattice();
  const { session } = useContext(BitcoinContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleOnClick = async () => {
    setIsLoading(true);
    await updateActiveWallet({refetch: true});
    await session.refreshWallets().catch(sendErrorNotification);
    setIsLoading(false);
  };

  const getButtonData = useCallback(() => {
    if (activeWallet) {
      if (activeWallet.external) {
        return {
          type: "primary",
          icon: <CreditCardOutlined />,
          label: "SafeCard",
        };
      } else {
        return {
          type: "default",
          icon: <CheckOutlined />,
          label: "Lattice",
        };
      }
    }
    return {
      type: "danger",
      label: "No Wallet",
      icon: <></>,
    };
  }, [activeWallet]);

  const buttonData = getButtonData();

  return (
    <Tooltip title="Refresh" key="WalletTagTooltip">
      <Button
        //@ts-expect-error
        type={buttonData.type}
        ghost
        onClick={handleOnClick}
        loading={isLoading}
      >
        {buttonData.icon} {buttonData.label}
      </Button>
    </Tooltip>
  );
};
