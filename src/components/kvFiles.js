import React from 'react'
import 'antd/dist/antd.css'
import { Alert, Button, Card, Col, Icon, Input, Row, Spin, Table } from 'antd'
const ADDRESS_RECORD_TYPE = 0

class KVFiles extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 0,
      totalRecords: 0,
      records: [],
      recordsPerPage: 10,
      error: null,
      retryFunc: null,
      loading: false,
      isAdding: false,
      recordToAdd: {
        key: null,
        val: null,
      }
    }

    this.updateAddKey = this.updateAddKey.bind(this)
    this.updateAddVal = this.updateAddVal.bind(this)
    this.addRecord = this.addRecord.bind(this)
  }

  componentDidMount() {
    this.fetchRecords()
  }

  updateAddKey(evt) {
    const recordToAdd = JSON.parse(JSON.stringify(this.state.recordToAdd))
    recordToAdd.key = evt.target.value;
    this.setState({ recordToAdd })
  }

  updateAddVal(evt) {
      const recordToAdd = JSON.parse(JSON.stringify(this.state.recordToAdd))
    recordToAdd.val = evt.target.value;
    this.setState({ recordToAdd })
  }

  fetchRecords(retries=1) {
    const opts = { 
      start: this.state.page * this.state.recordsPerPage, 
      n: this.state.recordsPerPage 
    }
    // Sanity check to make sure we didn't overrun the current page
    if (opts.start > this.state.records.length) {
      this.setState({ error: 'Mismatch fetching records.' })
      return;
    }
    this.setState({ loading: true })
    this.props.session.client.getKvRecords(opts, (err, res) => {
      if (err) {
        if (retries === 0) {
          this.setState({ error: err, retryFunc: this.fetchRecords })
        } else {
          return this.fetchRecords(retries-1)
        }
      }
      // Update state with the new records. Swap existing records if needed
      // or add new records if the current state doesn't include their indices.
      const stateRecords = JSON.parse(JSON.stringify(this.state.records))
      res.records.forEach((record, idx) => {
        if (idx + opts.start > stateRecords.length) {
          stateRecords.push(record)
        } else {
          stateRecords[idx + opts.start] = record
        }
      })
      this.setState({
        totalRecords: res.total,
        records: stateRecords,
        loading: false,
        error: null,
      })
    })
  }

  addRecord() {
    const opts = {
      caseSensitive: false,
      type: ADDRESS_RECORD_TYPE,
      records: {
        [this.state.recordToAdd.key]: this.state.recordToAdd.val
      }
    }
    this.setState({ loading: true })
    this.props.session.client.addKvRecords(opts, (err) => {
      if (err) {
        this.setState({ error: err, loading: false })
        return
      }
      this.setState({ 
        recordToAdd: { key: '' , val: '' }
      })
      this.fetchRecords()
    })
  }

  removeRecord(id) {
    const records = JSON.parse(JSON.stringify(this.state.records))
    // Make sure this id exists in our state
    this.state.records.forEach((record, idx) => {
      if (record.id === id) {
        records.splice(idx, 1)
      }
    })
    // If we found a match we can tell the lattice to remove the record
    if (records.length < this.state.records.length) {
      this.setState({ loading: true })
      this.props.session.client.removeKvRecords({ ids: [id] }, (err) => {
        if (err) {
          this.setState({ error: err, loading: false})
          return
        }
        this.setState({ records, loading: false})
      })
    }

  }

  renderError() {
    if (this.state.error) {
      return (
        <div>
          <Alert
            message="Error"
            description={this.state.error}
            type="error"
            closable
            onClose={() => { this.setState({ error: null })}}
          />
          {this.retryFunc ? (
            <Button type="danger" onClick={() => {
              this.state.retryFunc()
              this.setState({ retryFunc: null, err: null })
            }}>Retry</Button>
          ) : null}
        </div>
      )
    }
  }

  renderLoading() {
    if (this.state.loading) {
      return (
        <center>
          <Spin tip="Loading..." indicator={<Icon type="loading"/>}/>
        </center>
      )
    }
  }

  renderAddCard() {
    const extraLink = (
      <Button type="link" onClick={() => { this.setState({ isAdding: false })}}>View Addresses</Button>
    )
    return (
      <Card title={'Save Address'} extra={extraLink} bordered={true}>
        {this.state.loading ? this.renderLoading() : (
          <center>
            <p>Add a new address name. If this address is used in future transactions your Lattice will display the name you save below.</p>
            <Row>
              <Col span={18} offset={3}>
                <Input placeholder={"Address"} onChange={this.updateAddKey} />
              </Col>
            </Row>
            <br/>
            <Row>
              <Col span={18} offset={3}>
                <Input placeholder={"Display Name"} onChange={this.updateAddVal} />
              </Col>
            </Row>
            <br/>
            <Button type="primary" onClick={this.addRecord}>Save</Button>
          </center>
        )}
      </Card>
    )
  }

  renderDisplayCard() {
    const thisPage = this.state.page + 1;
    const totalPages = Math.floor(this.state.totalRecords / this.state.recordsPerPage) + 1;
    const hasNextPage = totalPages > thisPage;
    const hasPrevPage = thisPage > 1;
    const extraLink = (
        <Button type="link" onClick={() => { this.setState({ isAdding: true })}}>Add Addresses</Button>
    )
    return (
      <Card title={'Saved Addresses'} extra={extraLink} bordered={true}>
        {this.state.loading ? this.renderLoading() : (
          <div>
            <Table dataSource={this.state.records} pagination={false}>
              <Table.Column title="Name" dataIndex="val" key="val"
                render={val => (
                  <div><b>{val}</b></div>
                )}
              />
              <Table.Column title="Address" dataIndex="key" key="key"
                render={key => (
                  <a href={`https://etherscan.io/address/${key}`} target="_blank" rel="noopener noreferrer">
                    {`${key.slice(0, 10)}...${key.slice(key.length-8, key.length)}`}
                  </a>
                )}
              />
              <Table.Column title="" dataIndex="id" key="id"
                render={id => (
                  <Button type="danger" onClick={() => { this.removeRecord(id) }}>Delete</Button>
                )}
              />
            </Table>
            <br/>
            <center>
              <Row>
                <Col span={3} offset={4}>
                  <Button disabled={!hasPrevPage}>Prev</Button>
                </Col>
                <Col span={5} offset={2}>
                  <center><p>Page {thisPage} of {totalPages}</p></center>
                </Col>
                <Col span={3} offset={2}>
                  <Button disabled={!hasNextPage}>Next</Button>
                </Col>
              </Row>
            </center>
          </div>
        )}
      </Card>
    )
  }

  renderCard() {
    if (this.state.isAdding) {
      return this.renderAddCard()
    } else {
      return this.renderDisplayCard()
    }
  }

  render() {
    const content = (
      <div>
        {this.renderError()}
        {this.renderCard()}
      </div>      
    )
    return this.props.isMobile() ? content : (
      <Row justify={'center'}>
        <Col span={14} offset={5} style={{maxWidth: '600px'}}>
          {content}
        </Col>
      </Row>
    )
  }
}

export default KVFiles
