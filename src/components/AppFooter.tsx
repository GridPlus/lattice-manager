import { Tag } from "antd";
import { Footer } from "antd/lib/layout/layout";
import { constants } from "../util/helpers";
const { ENV } = constants;

export const AppFooter = () => {
  return (
    <Footer style={{ textAlign: "center" }}>
      © {new Date().getFullYear()} GridPlus, Inc.
      {ENV === "dev" ? (
        <Tag color="blue" style={{ margin: "0 0 0 10px" }}>
          DEV
        </Tag>
      ) : null}
    </Footer>
  );
};
