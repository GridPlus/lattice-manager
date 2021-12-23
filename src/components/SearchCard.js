import throttle from "lodash/throttle";
import React, { useMemo, useState } from "react";
import { constants } from "../util/helpers";
const { Input, Card, Button, Result, Select } = require("antd");
const { Option } = Select;
const defaultNetwork = constants.CONTRACT_NETWORKS[0];

export const SearchCard = ({ session }) => {
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [contract, setContract] = useState("");
  const [error, setError] = useState("");
  const [defs, setDefs] = useState([]);
  const [network, setNetwork] = useState(defaultNetwork.value);

  const resetState = () => {
    setLoading(false);
    setSuccess(false);
    setInstalling(false);
    setContract("");
    setDefs([]);
  };

  function onChange(value) {
    setNetwork(value);
  }

  // TEMPORARY FUNCTION TO REMOVE FUNCTIONS WITH ZERO LENGTH PARAM NAMES
  // SEE: https://github.com/GridPlus/gridplus-sdk/issues/1540xfDcC959b0AA82E288E4154cB1C770C6c4e958a91
  function TMP_REMOVE_ZERO_LEN_PARAMS(defs) {
    const newDefs = [];
    defs.forEach((def) => {
      let shouldAdd = true;
      if (def.name.length === 0) {
        shouldAdd = false;
      } else {
        def.params.forEach((param) => {
          if (param.name.length === 0) shouldAdd = false;
        });
      }
      if (shouldAdd === true) newDefs.push(def);
    });
    return newDefs;
  }

  const getNetworkApiUrl = () =>
    constants.CONTRACT_NETWORKS.find((cn) => cn.value === network).api;

  function fetchContractData(input) {
    if (
      input.slice(0, 2) !== "0x" ||
      false === /^[0-9a-fA-F]+$/.test(input.slice(2)) ||
      input.length !== 42
    ) {
      // Not a valid address
      setError("Invalid Ethereum contract address");
      resetState();
    } else {
      fetch(`${getNetworkApiUrl()}${input}`)
        .then((response) => response.json())
        .then((resp) => {
          // Map confusing error strings to better descriptions
          if (resp.result === "Contract source code not verified") {
            resp.result =
              "Contract source code not published to Etherscan or not verified. Cannot determine data.";
          }
          if (resp.status === "0") {
            setError(resp.result);
            resetState();
          } else {
            try {
              const result = JSON.parse(resp.result);
              const defs = TMP_REMOVE_ZERO_LEN_PARAMS(
                session.client.parseAbi("etherscan", result, true)
              );
              setDefs(defs);
              setContract(input);
              setError("");
              setSuccess(false);
              setLoading(false);
            } catch (err) {
              setError(err.toString());
              resetState();
            }
          }
        })
        .catch((err) => {
          setError(err.toString());
          resetState();
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
    session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT;
    session.addAbiDefs(defs, (err) => {
      session.client.timeout = constants.ASYNC_SDK_TIMEOUT;
      if (err) {
        setError(err.toString());
        resetState();
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

  const ErrorAlert = () => (
    <Result status="error" title="Error" subTitle={error} />
  );

  const ListOfNetworkLinks = () => {
    const networks = [...constants.CONTRACT_NETWORKS];
    const last = networks.pop();
    return (
      <>
        {networks.map((_network) => (
          <>
            <a
              className="lattice-a"
              href={_network.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {_network.label}
            </a>
            <span>, </span>
          </>
        ))}
        or{" "}
        <a
          className="lattice-a"
          href={last.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {last.label}
        </a>
      </>
    );
  };

  return (
    <div>
      <p>
        You can install contract data from any supported contract which has been
        verified by&nbsp;
        <ListOfNetworkLinks />.
      </p>
      <p>Search for a verified smart contract:</p>
      <Input.Group>
        <Select
          style={{ width: "20%" }}
          showSearch
          defaultValue={defaultNetwork.value}
          optionFilterProp="children"
          onChange={onChange}
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {constants.CONTRACT_NETWORKS.map(({ value, label }) => (
            <Option key={value} value={value}>
              {label}
            </Option>
          ))}
        </Select>
        <Input.Search
          style={{ width: "80%" }}
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

      {contract && (
        <Card title={contract} style={{ marginTop: "20px" }}>
          <p>
            Found <b>{defs.length}</b> functions to add from this contract.
          </p>
          <Button type="primary" onClick={addDefs} loading={installing}>
            {installing ? "Installing..." : "Install"}
          </Button>
          {success && <SuccessAlert />}
        </Card>
      )}
      {error && <ErrorAlert />}
    </div>
  );
};
