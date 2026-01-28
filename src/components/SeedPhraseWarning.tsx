import React, { useState } from "react";
import { Alert } from "antd";
import localStorage from "../util/localStorage";

const WARNING_MESSAGE =
  "GridPlus will never ask for your seed phrase, private keys, or recovery words. If asked, you may be on a phishing site.";

export const SeedPhraseWarning = ({ style }: { style?: React.CSSProperties }) => {
  const [visible, setVisible] = useState(
    !localStorage.getSeedWarningAcknowledged()
  );

  if (!visible) return null;

  return (
    <Alert
      message={WARNING_MESSAGE}
      type="warning"
      showIcon
      closable
      afterClose={() => {
        localStorage.setSeedWarningAcknowledged();
        setVisible(false);
      }}
      style={{ marginBottom: "16px", textAlign: "left", ...style }}
    />
  );
};
