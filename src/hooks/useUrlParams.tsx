import { constants } from "../util/helpers";

export const useUrlParams = () => {
  // Metamask connects through a keyring and in these cases we need
  // to utilize window.postMessage once we connect.
  // We can extend this pattern to other apps in the future.
  const params = new URLSearchParams(window.location.search);
  const keyring = params.get("keyring");
  // Validation check on Lattice hardware. Should draw a separate component
  const hwCheck = params.get("hwCheck");
  const forceLogin = params.get("forceLogin");
  // Workaround to support Firefox extensions. See `returnKeyringData`
  const isLoggedIn = params.get(constants.LOGIN_PARAM);

  return { keyring, forceLogin, hwCheck, isLoggedIn };
};
