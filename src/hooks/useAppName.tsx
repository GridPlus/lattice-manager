import { useUrlParams } from "./useUrlParams";
import store from "../store/persistanceStore";
import { constants } from "../util/helpers";
import { useState } from "react";

export const useIntegrationName = () => {
  const { keyring } = useUrlParams();

  const getIntegrationName = () => {
    if (keyring) {
      return keyring;
    }
    if (store.getIntegrationName()) {
      return store.getIntegrationName();
    }
    return constants.DEFAULT_APP_NAME;
  };

  const [integrationName, setIntegrationName] = useState<string>(
    getIntegrationName()
  );

  return { integrationName, setIntegrationName };
};
