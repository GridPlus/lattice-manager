import { CheckOutlined, CreditCardOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useCallback, useContext, useState } from "react";
import { useLattice } from "../hooks/useLattice";
import { BitcoinContext } from "../store/BitcoinContext";
import { sendErrorNotification } from "../util/sendErrorNotification";

/**
 * # TODO
 *
 * - [ ] Handle LOST_PAIRING_ERR
 */

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

  // const handleLostPairing = () => {
  //   // If we lost our pairing, we will have discovered that after trying to `connect`.
  //   // The Lattice will draw a pairing screen, so to tear it down we need to send an
  //   // invalid pairing code.
  //   // TODO: This will still draw a pairing failure screen on the Lattice. There is
  //   //       currently no way around this, but it is something we should address
  //   //       in the future.
  //   client.pair("x").then(() => {
  //     // handleLogout(LOST_PAIRING_MSG);
  //   });
  // };

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
