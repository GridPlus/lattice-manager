import { Card } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageContent from "../components/PageContent";
import { PairForm } from "../components/PairForm";
import { useLattice } from "../hooks/useLattice"; // 8 characters in a code
import { useUrlParams } from "../hooks/useUrlParams";
import { sendErrorNotification } from "../util/sendErrorNotification";

export const PairPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { client, returnKeyringData, deviceId, password } =
    useLattice();
  const { keyring } = useUrlParams();
  const wasOpenedByKeyring = !!keyring; // Was the app opened with a keyring in the url parameters

  // Handle a `finalizePairing` response. There are three states:
  // 1. Wrong secret: draw a new screen (try again) automatically
  // 2. Timed out: display error screen and wait for user to try again
  // 3. Success: load addresses
  const handlePair = (data) => {
    // Hack to circumvent a weird screen artifact we are seeing in firmware
    // NOTHING TO SEE HERE
    if (data[0] === "_" || data[0] === "[") data = data.slice(1);

    setIsLoading(true);

    // If we didn't timeout, submit the secret and hope for success!
    return client
      .pair(data)
      .then(() => {
        if (wasOpenedByKeyring) {
          return returnKeyringData(deviceId, password);
        }
        navigate("/manage");
      })
      .catch((err) => {
        err.message = err.message
          ? err.message
          : "Failed to pair. You either entered the wrong code or have already connected to this app.";
        sendErrorNotification(err);
        setIsLoading(false);
      });
  };

  const onCancel = () => {
    navigate("/");
  };

  return (
    <PageContent>
      <Card title="Enter Pairing Code" bordered={true}>
        <p>Please enter the pairing code displayed on your Lattice screen:</p>
        {isLoading && <p>Establishing connection with your Lattice</p>}
        <PairForm
          handlePair={handlePair}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      </Card>
    </PageContent>
  );
};
