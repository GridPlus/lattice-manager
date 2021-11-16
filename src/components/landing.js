import React from 'react';
import 'antd/dist/antd.dark.css'
import { AuditOutlined, TagsOutlined } from '@ant-design/icons';
import { PageContent } from './index'
import { Card, Col, Divider, Row } from 'antd'

class Landing extends React.Component {
  renderCard() {
    return (
      <Card title='Lattice1 Manager' bordered={true}>
        <Row justify='center'>
          <Col span={16}>
            <p>
              Welcome to your Lattice1 Manager! You can use this tool to <b>manage secure data</b>&nbsp;
              on your Lattice1 hardware wallet device for a better web3 experience:
            </p>
          </Col>
        </Row>
        <Row justify='center'>
          <Col span={16}>
            <p>
              <TagsOutlined/>&nbsp;
              <b>Address Tags</b>&nbsp;
              <br/>
              Give names to your favorite contracts or recipient addresses.
            </p>
          </Col>
        </Row>
        <Row justify='center'>
          <Col span={16}>
            <p>
              <AuditOutlined/>&nbsp;
              <b>Contracts</b>&nbsp;
              <br/>
              Add your favorite smart contracts for better transaction request readability.
            </p>
          </Col>
        </Row>
        <Divider/>
        <img src="lattice-landing.jpg" style={{width: '100%'}} alt="loading"/>
      </Card>
    )
  }


  render() {
    const content = (
      <center>
        {this.renderCard()}
      </center>
    )

    return (
      <PageContent content={content} isMobile={this.props.isMobile}/>
    )
  }
}

export default Landing