import { SyncOutlined } from "@ant-design/icons";
import { Alert, Button, Card } from "antd";
import "antd/dist/antd.dark.css";
import React, { useCallback, useEffect, useState } from "react";
import { useRecords } from "../hooks/useRecords";
import SDKSession from "../sdk/sdkSession";
import { constants } from "../util/helpers";
import { AddAddressesButton } from "./AddAddressesButton";
import { AddressTable } from "./AddressTable";
import { PageContent } from "./index";
import { Record } from "../types/records";
const { ADDRESSES_PER_PAGE } = constants;

const AddressTagsPage = ({
  isMobile,
  session,
}: {
  isMobile: () => boolean;
  session: SDKSession;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryFunction, setRetryFunction] = useState(null);
  const [addresses, addAddresses, removeAddresses] = useRecords([]);

  const fetchRecords = useCallback(
    async (fetched = 0, retries = 1) => {
      setIsLoading(true);
      const res: any = await session
        .client
        .getKvRecords({
          start: fetched,
          n: ADDRESSES_PER_PAGE,
        })
        .catch((err) => {
          if (retries > 0) {
            setError(null);
            fetchRecords(fetched, retries - 1);
          } else {
            setError(err);
            setIsLoading(false);
            setRetryFunction(fetchRecords);
          }
        });
      addAddresses(res.records);
      const totalFetched = res.fetched + fetched;
      const remainingToFetch = res.total - totalFetched;
      if (remainingToFetch > 0) {
        fetchRecords(fetched + res.fetched);
      } else {
        setError(null);
        setIsLoading(false);
      }
    },
    [addAddresses, session.client]
  );

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeSelected = (selectedAddresses: Record[]) => {
    const ids = selectedAddresses.map((r) => parseInt(r.id));
    if (ids.length === 0) return;
    setIsLoading(true);
    session
      .client
      .removeKvRecords({ ids, type: undefined })
      .then(() => {
        removeAddresses(selectedAddresses);
        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
        setRetryFunction(removeSelected);
      });
  };

  const onAddAddresses = () => {
    fetchRecords()
  }

  const extra = [
    <Button
      key="sync-button"
      type="link"
      icon={<SyncOutlined />}
      disabled={isLoading}
      onClick={fetchRecords}
    >
      Sync
    </Button>,
    <AddAddressesButton
      key="add-addresses-button"
      records={addresses}
      session={session}
      onAddAddresses={onAddAddresses}
    />,
  ];

  const ErrorAlert = () =>
    error && (
      <Alert
        message="Error"
        description={error}
        action={
          retryFunction ? (
            <Button
              //@ts-expect-error
              type="danger"
              onClick={() => {
                retryFunction();
                setRetryFunction(null);
                setError(null);
              }}
            >
              Retry
            </Button>
          ) : null
        }
        type="error"
        closable
        onClose={() => setError(null)}
      />
    );

  return (
    <PageContent isMobile={isMobile}>
      <ErrorAlert />
      <Card title={"Saved Addresses"} extra={extra} bordered={true}>
        <AddressTable {...{ addresses, isLoading, removeSelected }} />
      </Card>
    </PageContent>
  );
};

export default AddressTagsPage;
