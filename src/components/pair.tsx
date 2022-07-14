import React from 'react';
import { Card, Input } from 'antd'
import { PageContent } from './index'
import 'antd/dist/antd.dark.css'
import { AppContext } from '../store/AppContext';
const SUBMIT_LEN = 8; // 8 characters in a code

class Pair extends React.Component<any, any> {
  static contextType = AppContext;
  context = this.context as any;

  constructor(props) {
    super(props);
    this.state = {
      code: '',
    }
  }

  componentDidMount() {
    this.setState({ code: '' })
    //@ts-expect-error
    if (this.input) {
      //@ts-expect-error
      this.input.focus();
    }
  }

  componentWillUnmount() {
    this.setState({ code: '' })
  }

  handleUpdate(e) {
    try {
      this.setState({ code: e.target.value.toUpperCase() }, () => {
        if (this.state.code.length >= SUBMIT_LEN) {
          this.props.submit(this.state.code)
        }
      })
    } catch (err) {
      ;
    }
  }

  getBoxWidth() {
    const e = document.getElementById('secret-card')
    if (!e)
      return
    return 0.8 * e.clientWidth
  }

  getBoxFontHeight() {
    const w = this.getBoxWidth();
    if (!w)
      return;
    return 0.6 * (w / SUBMIT_LEN);
  }

  render() {
    if (this.props.hide) {
      return null;
    }
    const size = this.context.isMobile ? 'small' : 'large';
    const width = this.getBoxWidth();
    const fontSize = this.getBoxFontHeight();
    const content = (
      <center>
        <Card title="Enter Secret" bordered={true} id='secret-card'>
          <p></p>
          <p>Please enter the pairing secret displayed on your Lattice screen:</p>
          <Input
            className='lattice-pairing-box'
            size={size}
            id="secret"
            //@ts-expect-error
            ref={i => {this.input = i}}
            onChange={this.handleUpdate.bind(this)}
            style={{width, fontSize}}
            value={this.state.code}
          />
        </Card>
      </center>
    )
    return (
      <PageContent content={content} />
    )
  }
}

export default Pair