import React from "react";
import { Button, Card, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { PageContent } from "./index";

class Loading extends React.Component<any, any> {
  render() {
    const content = (
      <center>
        <Card title="Loading" bordered={true}>
          {this.props.spin !== false ? (
            <Spin indicator={<LoadingOutlined />} />
          ) : null}
          <p>
            {this.props.msg
              ? this.props.msg
              : "Waiting for data from your Lattice"}
          </p>
          {this.props.onCancel ? (
            <Button type="link" onClick={this.props.onCancel}>
              Cancel
            </Button>
          ) : null}
        </Card>
      </center>
    );
    return <PageContent content={content} />;
  }
}

export default Loading;
