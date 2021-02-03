import React from 'react';
import 'antd/dist/antd.css'
import { Button, Card, Col, Icon, Input, Row, Switch } from 'antd'
import './styles.css'
import { constants, } from '../util/helpers';
const settingsPath = `${constants.ROOT_STORE}/settings`

class Settings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      settings: {},
      local: {}
    }

    this.getSettings();
  }

  componentDidMount() {
    this.getSettings();
  }

  getSettings() {
    const storage = JSON.parse(window.localStorage.getItem(constants.ROOT_STORE) || '{}');
    const settings = storage.settings ? storage.settings : {};
    this.setState({ settings })
  }

  submit() {
    // Save the settings to local storage
    const storage = JSON.parse(window.localStorage.getItem(constants.ROOT_STORE) || '{}');
    storage.settings = this.state.settings
    window.localStorage.setItem(constants.ROOT_STORE, JSON.stringify(storage));
    // Reload the page for the changes to take effect
    window.location.reload();
  }

  updateUseCustomEndpoint(value) {
    const settings = JSON.parse(JSON.stringify(this.state.settings));
    const local = this.state.local;
    local.useCustomEndpoint = value;
    if (value !== true) {
      // Reset the custom endpoint if this value is false
      settings.customEndpoint = '';
    }
    this.setState({ settings, local });
  }

  updateCustomEndpoint(evt) {
    const settings = JSON.parse(JSON.stringify(this.state.settings));
    settings.customEndpoint = evt.target.value;
    this.setState({ settings });
  }

  renderCard() {
    const { customEndpoint='' } = this.state.settings;
    let { useCustomEndpoint=false } = this.state.local;
    if (customEndpoint !== '')
      useCustomEndpoint = true;
    return (
      <div>
        <Card>
          <h3>(Advanced) Connection Endpoint:</h3>
          <p><i>
            If you wish to route messages and connections through your own endpoint, you may specify it here. 
            See <a href="https://github.com/GridPlus/lattice-connect" target="_blank">this</a> for more information.
          </i></p>
          <Row>
            <Col>
              <p><b>Use Custom:</b></p>
              <Switch checked={useCustomEndpoint} onChange={this.updateUseCustomEndpoint.bind(this)}/>
              {useCustomEndpoint === true ? (
                <div>
                  <br/>
                  <p><b>Custom Endpoint:</b></p>
                  <Input  placeholder="host:port" 
                          defaultValue={customEndpoint} 
                          onChange={this.updateCustomEndpoint.bind(this)}/>
                </div>
              ) : null}
            </Col>
          </Row>
          <br/>
        </Card>
        <br/>
        <Button type="primary" onClick={this.submit.bind(this)}>
          Update and Reload
        </Button>
      </div>
    )
  }

  render() {
    const content = (
      <center>
        <Card title={'Settings'} bordered={true}>
          {this.renderCard()}
        </Card>
      </center>      
    )
    return (this.props.isMobile() || this.props.inModal) ? content : (
      <Row justify={'center'}>
        <Col span={14} offset={5} style={{maxWidth: '600px'}}>
          {content}
        </Col>
      </Row>
    )
  }
}

export default Settings