import React from 'react';
import { Button, Card, Col, Result, Row } from 'antd'
import { decode } from 'bs58'
import { constants } from '../util/helpers';
import { AppContext } from '../store/AppContext';
import { ResultStatusType } from 'antd/lib/result';

const ReactCrypto = require('gridplus-react-crypto').default;
const EC = require('elliptic').ec;

const PREIMAGE_LEN = 32;
const SIG_TEMPLATE_LEN =  74; // Struct containing DER sig
const CERT_TEMPLATE_LEN = 147;  // Struct containing pubkey, permissions, and signature on it

class ValidateSig extends React.Component<any, any> {
  static contextType = AppContext;
  context = this.context as any;
  isLoading: boolean;
  poapToClaim: string;
  isValid: string;
  message: string;

  constructor(props) {
    super(props)
    this.state = {
      isLoading: false,
      poapToClaim: '',
      isValid: '',
      message: '',
    }
  } 

  componentDidMount(): void {
    this.setState({ isValid: this.validateSig() })
    this.setState({message: this.getMessageForPoap()})
  }

  /** Returns the message string reformatted for comparison*/
  getMessageForPoap() {
    return this.getPreimage()
      // forces case insensitivity
      .toLocaleLowerCase()
      // Replaces non-alphanumeric characters with empty string
      .replace(/[^|x00-\x7F]/g, "");
  }

  shouldShowClaimCard() {
    return (
      this.state.isValid &&
      (this.state.message === "poap" || 
      // Easter Egg
      this.state.message === "poop")
    );
  }

  // Validate a signature for a message from a known signer on a known curve
  // * msg - Expected ASCII string
  // * signer - Expected buffer containing 65-byte public key
  // * sig - Expected DER signature (string is best)
  // * curve - Consumable curve for elliptic
  _validate(msg, signer, sig, curve='secp256k1') {
    const crypto = new ReactCrypto();
    const ec = new EC(curve);
    const msgHash = crypto.createHash('sha256').update(msg).digest();
    const key = ec.keyFromPublic(signer, 'hex')
    return key.verify(msgHash, sig);
  }

  getPreimage() {
    return decode(this.props.data).slice(0, PREIMAGE_LEN).toString()
  }

  getCert() {
    const start = PREIMAGE_LEN + SIG_TEMPLATE_LEN;
    const _certData = decode(this.props.data).slice(start, start + CERT_TEMPLATE_LEN);
    const METADATA_LEN = 8;
    const PUBKEY_LEN = 65;
    const preimage = _certData.slice(2, METADATA_LEN + PUBKEY_LEN);
    // When we issue the cert, we are signing metadata + the public key. However, this
    // cert gets packed into a template along with this metadata and the length of the data in
    // that template is variable, depending on the size of the DER sig (which we call a "cert").
    // We sign metadata with 0 length at the outset because we won't know the eventual length.
    // Therefore this byte needs to be reuturned to its initial 0 value in order to validate the "cert".
    // preimage[1] = 0;
    const pubkey = Buffer.from(_certData.slice((METADATA_LEN), (METADATA_LEN + PUBKEY_LEN))).toString('hex');
    const _sig = Buffer.from(_certData.slice((METADATA_LEN + PUBKEY_LEN), (METADATA_LEN + PUBKEY_LEN + SIG_TEMPLATE_LEN)));
    const sig = _sig.slice(0, (2 + _sig[1]));
    return { pubkey, preimage, sig }
  }

  validateCert() {
    const cert = this.getCert();
    return this._validate(cert.preimage, constants.LATTICE_CERT_SIGNER, cert.sig)
  }

  validateSig() {
    try {
      if (!this.validateCert())
        return false;
      const preimage = this.getPreimage();
      const cert = this.getCert();
      const _sig = Buffer.from(decode(this.props.data).slice(PREIMAGE_LEN, PREIMAGE_LEN + SIG_TEMPLATE_LEN));
      const sig = _sig.slice(0, (2 + _sig[1]))
      return this._validate(preimage, cert.pubkey, sig);
    } catch (err) {
      console.error(`Encountered error validating signature: ${err.message}`)
      return false;
    }
  }

  claimPoap () {
    const url = constants.POAP_CLAIM_REMOTE_URL;
    this.setState({ isLoading: true })
    const data = this.props.data

    fetch(url, {
      method: 'POST',
      body: JSON.stringify({ data })
    })
      .then((res => res.json()))
      .then(poapToClaim => {
        this.setState({ poapToClaim })
      })
      .catch(console.error)
      .finally(() => {
        this.setState({ isLoading: false })
      })
  }

  renderResult() {
    let result = {
      status: "warning" as ResultStatusType,
      title: "Could not Verify Authenticity",
      subTitle: "We could not verify the authenticity of this signature or signer."
    };
    if (this.state.isValid) {
      result.status = "success";
      result.title = "Verified";
      result.subTitle = "The signer is authentic!"
    }
    return (
      <Result
        status={result.status}
        title={result.title}
        subTitle={result.subTitle}
      />
    )
  }


  render() {
    const spanLength = this.context.isMobile ? 18 : 10;
    const spanOffset = this.context.isMobile ? 3 : 7; 
    return (
      <Row>
        <Col span={spanLength} offset={spanOffset}>
          <center>
            <Card title="Validate Hardware" bordered={true}>
              {this.renderResult()}
              <p>
                <b>Message:</b> {this.getPreimage()}
              </p>
            </Card>
            {this.shouldShowClaimCard() && (
              <Card
                title="Claim POAP"
                bordered={true}
                style={{ marginTop: "20px" }}
              >
                <p>GridPlus is offering POAPs to all valid Lattice1 owners.</p>
                <Button
                  disabled={this.state.isLoading}
                  loading={this.state.isLoading}
                  onClick={() => {
                    this.claimPoap();
                  }}
                >
                  Claim
                </Button>
                <div style={{ paddingTop: "20px" }}>
                  <a href={this.state.poapToClaim}>{this.state.poapToClaim}</a>
                </div>
              </Card>
            )}
          </center>
        </Col>
      </Row>
    )
  }


}

export default ValidateSig