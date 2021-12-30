import { DownloadOutlined } from "@ant-design/icons";
import { Button, Card, Input, Result } from "antd";
import throttle from "lodash/throttle";
import React, { useMemo, useState } from "react";
import { constants } from "../util/helpers";
import { SelectNetwork } from "./SelectNetwork";
const defaultNetwork =
  constants.CONTRACT_NETWORKS[constants.DEFAULT_CONTRACT_NETWORK];

export const SearchCard = ({ session }) => {
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [contract, setContract] = useState("");
  const [error, setError] = useState("");
  const [defs, setDefs] = useState([]);
  const [network, setNetwork] = useState(constants.DEFAULT_CONTRACT_NETWORK);

  const resetData = () => {
    setLoading(false);
    setSuccess(false);
    setInstalling(false);
    setContract("");
    setDefs([]);
  };

  const getNetwork = () =>
    constants.CONTRACT_NETWORKS[network] ?? defaultNetwork;

  function fetchContractData(input) {
    if (
      input.slice(0, 2) !== "0x" ||
      false === /^[0-9a-fA-F]+$/.test(input.slice(2)) ||
      input.length !== 42
    ) {
      // Not a valid address
      setError("Invalid Ethereum contract address");
      resetData();
    } else {
      const { label, baseUrl, apiRoute } = getNetwork();
      fetch(`${baseUrl}/${apiRoute}${input}`)
        .then((response) => response.json())
        .then((resp) => {
          // Map confusing error strings to better descriptions
          if (resp.result === "Contract source code not verified") {
            resp.result = `Contract source code not published to ${label} or not verified. Cannot determine data.`;
          }
          if (resp.status === "0") {
            setError(resp.result);
            resetData();
          } else {
            try {
              const result = JSON.parse(resp.result);
              const defs = session.client.parseAbi("etherscan", result, true);
              setDefs(defs);
              setContract(input);
              setError("");
              setSuccess(false);
              setLoading(false);
            } catch (err) {
              setError(err.toString());
              resetData();
            }
          }
        })
        .catch((err) => {
          setError(err.toString());
          resetData();
        });
    }
  }

  const throttledFetch = useMemo(
    () => throttle(fetchContractData, 5100),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  function addDefs() {
    setInstalling(true);
    setError("");
    // Longer timeout for loading these since requests may get dropped
    session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT;
    session.addAbiDefs(defs, (err) => {
      // Reset timeout to default
      session.client.timeout = constants.ASYNC_SDK_TIMEOUT;
      if (err) {
        setError(err.toString());
        resetData();
      } else {
        setSuccess(true);
        setError("");
        setInstalling(false);
      }
    });
  }

  const SuccessAlert = () => (
    <Result
      status="success"
      title="Success"
      subTitle="Successfully sent data to your Lattice. You must confirm all
  functions on your Lattice for them to be saved.
  Please confirm or reject the definitions before continuing."
    />
  );

  const ErrorAlert = () => <Result status="error" subTitle={error} />;

  const NetworkLinkList = () => {
    const networks = Object.entries(constants.CONTRACT_NETWORKS).map(
      ([, value]) => value
    );
    const last = networks.pop();
    const NetworkLink = ({ network }) => (
      <a
        className="lattice-a"
        href={network.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {network.label}
      </a>
    );
    return (
      <>
        {networks.map((network) => (
          <span key={network.label}>
            <NetworkLink network={network} />
            {", "}
          </span>
        ))}
        or <NetworkLink network={last} />
      </>
    );
  };

  return (
    <div>
      <p>
        You can install contract data from any supported contract which has been
        verified by&nbsp;
        <NetworkLinkList />.
      </p>
      <p>Search for a verified smart contract:</p>
      <Input.Group>
        <SelectNetwork setNetwork={setNetwork} />
        <Input.Search
          style={{ maxWidth: "80%" }}
          placeholder="Contract address"
          allowClear
          enterButton
          loading={loading}
          onSearch={(val) => {
            setLoading(true);
            throttledFetch(val);
          }}
        />
      </Input.Group>

      {contract && !success && !error && (
        <Card
          title={contract}
          style={{ marginTop: "20px" }}
          actions={[
            <Button
              type="primary"
              onClick={addDefs}
              loading={installing}
              icon={<DownloadOutlined />}
            >
              {installing ? "Installing..." : "Install"}
            </Button>,
          ]}
        >
          <p>
            Found <b>{defs.length}</b> functions to add from this contract.
          </p>
        </Card>
      )}
      {success && <SuccessAlert />}
      {error && <ErrorAlert />}
    </div>
  );
};
