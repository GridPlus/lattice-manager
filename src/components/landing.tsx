import React from 'react';
import 'antd/dist/antd.dark.css'
import { DesktopOutlined, TagsOutlined } from '@ant-design/icons';
import { PageContent } from './index'
import { constants } from '../util/helpers';
import { Card, Col, Divider, Row } from 'antd'

class Landing extends React.Component<any, any> {
  renderCard() {
    return (
      <Card bordered={true} style={{textAlign: "center"}}>
        <Row justify='center'>
          <Col span={20}>
            <p className='lattice-h1'><DesktopOutlined/>&nbsp;Lattice Manager</p>
            <p className='lattice-h4'>
              Manage secure data on your Lattice hardware wallet device for a better web3 experience:
            </p>
            <br/>
          </Col>
        </Row>
        <Row justify='center'>
          <Col span={20}>
            <p>
              <a  href={constants.TAGS_HELP_LINK}
                  className='lattice-a'
                  target='_blank'
                  rel='noopener noreferrer'
              >
                <TagsOutlined/>&nbsp;
                <b>Address Tags</b>&nbsp;
              </a>
              <br/>
              <i>Give names to your favorite contracts or recipient addresses.</i>
            </p>
            <br/>
          </Col>
        </Row>
        <Divider/>
        <img
          src="lattice-landing.jpg"
          style={{ maxHeight: "500px", maxWidth: "100%" }}
          alt="lattice-one-device"
        />
      </Card>
    )
  }


  render() {
    return (
      <PageContent content={this.renderCard()}/>
    )
  }
}

export default Landing