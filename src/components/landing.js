import React from 'react';
import 'antd/dist/antd.dark.css'
import { AuditOutlined, DesktopOutlined, TagsOutlined } from '@ant-design/icons';
import { PageContent } from './index'
import { constants } from '../util/helpers';
import { Card, Col, Divider, Row } from 'antd'

class Landing extends React.Component {
  renderCard() {
    return (
      <Card bordered={true}>
        <Row justify='center'>
          <Col span={20}>
            <p className='lattice-h1'><DesktopOutlined/>&nbsp;Lattice1 Manager</p>
            <p className='lattice-h4'>
              Manage secure data on your Lattice1 hardware wallet device for a better web3 experience:
            </p>
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
          </Col>
        </Row>
        <Row justify='center'>
          <Col span={20}>
            <p>
              <a  href={constants.CONTRACTS_HELP_LINK}
                  className='lattice-a'
                  target='_blank'
                  rel='noopener noreferrer'
              >
                <AuditOutlined/>&nbsp;
                <b>Contracts</b>&nbsp;
              </a>
              <br/>
              <i>Add your favorite smart contracts for better transaction request readability.</i>
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