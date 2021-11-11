import React from 'react';
import 'antd/dist/antd.css'
import { Card, Col, Row } from 'antd'

class Landing extends React.Component {
  render() {
    const innerWidth = document.getElementById('main-content-inner').offsetWidth;
    return (
      <div style={{width: innerWidth - 10}}>
        <center>
          <h2 style={{size: '40px', color: 'white'}}>Lattice1 Manager</h2>
          <h3 style={{color: 'white'}}>Manage secure data on your Lattice1 hardware wallet device using the menu options.</h3>
          <img src="lattice-landing.jpg" style={{width: '100%'}}/>
        </center>
      </div>
    )
  }
}

export default Landing