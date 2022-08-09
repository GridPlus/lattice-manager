import React from "react";
import "antd/dist/antd.dark.css";
import { Col, Row } from "antd";
import { AppContext } from "../store/AppContext";
const SPAN_WIDTH = 20; // Max 24 for 100% width

class PageContent extends React.Component<any, any> {
  static contextType = AppContext;
  context = this.context as any;

  render() {
    if (!this.props.children && !this.props.content) return; // Content must be passed in
    // Mobile content should be displayed without any padding
    if (this.context.isMobile)
      return this.props.children ? this.props.children : this.props.content;
    // Desktop content has some padding
    return (
      <Row justify="center">
        <Col span={SPAN_WIDTH}>{this.props.children || this.props.content}</Col>
      </Row>
    );
  }
}

export default PageContent;
