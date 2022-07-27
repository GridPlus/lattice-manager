import { Button } from "antd";
import { useLattice } from "../hooks/useLattice";

export const LogoutButton = () => {
  const { handleLogout } = useLattice();

  return (
    <Button key="logout-button" type="primary" onClick={handleLogout}>
      Logout
    </Button>
  );
};
