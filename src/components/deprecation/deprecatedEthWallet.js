import React from 'react';
import 'antd/dist/antd.dark.css'

class DeprecatedEthWallet extends React.Component {
  render() {
    return (
      <center>
      <p><i>
        This ETH wallet has been deprecated.<br/>
        Please use one of these fine wallets instead:<br/><br/>

        <a href='https://chrome.google.com/webstore/detail/metamask-gridplus-fork/ginmdlhabcljcbgnmladjeimmkblldle' target='_blank' rel="noopener noreferrer">
          <img 
            src='https://raw.githubusercontent.com/MetaMask/brand-resources/c3c894bb8c460a2e9f47c07f6ef32e234190a7aa/SVG/metamask-fox.svg' 
            height='100px'
            alt="MetaMask"
          />
          <br/>GridPlus MetaMask extension 
        </a>
        <br/><br/><br/>
        <a href='https://frame.sh/' target='_blank' rel='noopener noreferrer'>
          <img 
            src='/frame_logo.jpeg' 
            height='100px'
            alt="Frame"  
          />
          <br/><br/>Frame (Beta)
        </a>
      </i></p>
      </center>
    )
  }
}

export default DeprecatedEthWallet