import React, { useState } from "react";
import { constants } from "../util/helpers";
const { Input, Card, Button, Result } = require("antd");

export const SearchCard = ({ session }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [contract, setContract] = useState("");
  const [error, setError] = useState("");
  const [defs, setDefs] = useState([]);

  const resetState = () => {
    setLoading(false);
    setSuccess(false);
    setDefs([]);
  };

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
      setLoading(true);
      setTimeout(() => {
        fetch(`${constants.GET_ABI_URL}${input}`)
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
      }, 5000); // 1 request per 5 seconds with no API key provided
    }
  }

  function addDefs() {
    setLoading(true);
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
        setLoading(false);
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

  return (
    <div>
      <p>
        You can install contract data from any supported contract which has been
        verified by&nbsp;
        <a
          className="lattice-a"
          href="https://etherscan.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          Etherscan
        </a>
        . Search for a verified smart contract:
      </p>
      <Input.Search
        placeholder="Contract address"
        allowClear
        enterButton
        loading={loading && !contract}
        onSearch={fetchContractData}
      />
      {contract && (
        <div>
          <Card title={contract}>
            <p>
              Found <b>{defs.length}</b> functions to add from this contract.
            </p>
            <Button type="primary" onClick={addDefs} loading={loading}>
              {loading ? "Installing..." : "Install"}
            </Button>
            {success && <SuccessAlert />}
          </Card>
        </div>
      )}
      {error && <ErrorAlert />}
    </div>
  );
};
