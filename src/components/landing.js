import React from 'react';
import 'antd/dist/antd.dark.css'

class Landing extends React.Component {
  render() {
    return (
      <center>
        <h2 style={{size: '40px', color: 'white'}}>Lattice1 Manager</h2>
        <h3 style={{color: 'white'}}>Manage secure data on your Lattice1 hardware wallet device using the menu options.</h3>
        <img src="lattice-landing.jpg" style={{width: '100%'}} alt="loading"/>
      </center>
    )
  }
}

export default Landing