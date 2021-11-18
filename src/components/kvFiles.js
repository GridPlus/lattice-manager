import React from 'react'
import 'antd/dist/antd.dark.css'
import { Alert, Button, Card, Checkbox, Col, Input, Row, Spin, Table } from 'antd'
import { allChecks } from '../util/sendChecks';
import { LoadingOutlined } from '@ant-design/icons';
import { PageContent } from './index'
const ADDRESS_RECORD_TYPE = 0
const RECORDS_PER_PAGE = 10;
const MAX_RECORD_LEN = 63; // 63 characters max for both key and vlaue

class KVFiles extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 0,
      totalRecords: 0,
      records: [],
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
    this.fetchRecords = this.fetchRecords.bind(this)
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

  recordIsChecked(id) {
    let isChecked = false;
    this.state.records.forEach((_record) => {
      if (_record.id === id) {
        isChecked = _record.isChecked === true;
      }
    })
    return isChecked;
  }

  changeRecordChecked(id) {
    const records = JSON.parse(JSON.stringify(this.state.records));
    if (!records)
      return;
    for (let i = 0; i < records.length; i++) {
      if (records[i].id === id) {
        records[i].isChecked = records[i].isChecked === true ? false : true;
        this.setState({ records });
        return;
      }
    }
  }

  getNumSelected() {
    let selected = 0;
    this.state.records.forEach((record) => {
      if (record.isChecked)
        selected += 1;
    })
    return selected;
  }

  fetchRecords(retries=1) {
    const opts = {
      start: this.state.page * RECORDS_PER_PAGE, 
      n: RECORDS_PER_PAGE
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
          this.setState({ error: err, retryFunc: this.fetchRecords, loading: false })
          return;
        } else {
          return this.fetchRecords(retries-1)
        }
      } else if (!res || !res.records) {
        this.setState({ loading: false, error: 'Failed to fetch tags' });
        return;
      }
      // Update state with the new records. Swap existing records if needed
      // or add new records if the current state doesn't include their indices.
      const _stateRecords = this.state && this.state.records ? this.state.records : [];
      const stateRecords = JSON.parse(JSON.stringify(_stateRecords))
      res.records.forEach((record, idx) => {
        if (idx + opts.start > stateRecords.length) {
          stateRecords.push(record)
        } else {
          stateRecords[idx + opts.start] = record
        }
      })
      const possiblePages = Math.ceil(res.total / RECORDS_PER_PAGE);
      const page =  this.state.page >= possiblePages ? 
                    Math.max(0, possiblePages - 1) :
                    this.state.page;
      this.setState({
        page,
        totalRecords: res.total,
        records: stateRecords,
        loading: false,
        error: null,
      })
    })
  }

  addRecord() {
    let isDupKey = false;
    let isDupVal = false;
    this.state.records.forEach((record) => {
      if (record.key === this.state.recordToAdd.key)
        isDupKey = true;
      if (record.val === this.state.recordToAdd.val)
        isDupVal = true;
    })
    if (isDupKey) {
      this.setState({ error: 'You already have a tag with this address on your device.' });
      return;
    } else if (isDupVal) {
      this.setState({ error: 'You already have a tag with this name on your device.' });
      return;
    }
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

  removeSelected() {
    const ids = [];
    const remainingRecords = [];
    this.state.records.forEach((record) => {
      if (record.isChecked) {
        ids.push(record.id)
      } else {
        remainingRecords.push(record);
      }
    })
    if (ids.length === 0)
      return;
    this.setState({ loading: true })
    this.props.session.client.removeKvRecords({ ids }, (err) => {
      if (err) {
        this.setState({ error: err, loading: false})
        return
      }
      this.setState({ records: remainingRecords}, () => {
        this.fetchRecords();
      })
    })
  }

  renderError() {
    if (this.state.error) {
      return (
        <div>
          <Alert
            message="Error"
            description={this.state.error}
            action={this.state.retryFunc ? (
              <Button type="danger" onClick={() => {
                this.state.retryFunc()
                this.setState({ retryFunc: null, err: null })
              }}>Retry</Button>
            ) : null}
            type="error"
            closable
            onClose={() => { this.setState({ error: null })}}
          />
        </div>
      )
    }
  }

  renderLoading() {
    if (this.state.loading) {
      return (
        <center>
          <Spin tip="Loading..." indicator={<LoadingOutlined/>}/>
        </center>
      )
    }
  }

  shouldDisplaySend() {
    const key = this.state.recordToAdd.key;
    const val = this.state.recordToAdd.val;
    if (!key || !val)
      return false;
    const isValidAddress =  (allChecks.ETH.recipient(key)) || 
                            (allChecks.BTC.recipient(key));
    const isValidLen = (key.length < MAX_RECORD_LEN) && (val.length < MAX_RECORD_LEN);
    return isValidAddress && isValidLen;
  }

  renderAddCard() {
    const extraLink = (
      <Button type="link" onClick={() => { this.setState({ isAdding: false })}}>View Addresses</Button>
    )
    return (
      <Card title={'Save Address Tag'} extra={extraLink} bordered={true}>
        {this.state.loading ? this.renderLoading() : (
          <center>
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
            {this.shouldDisplaySend() ? (
              <Button type="primary" onClick={this.addRecord}>Save</Button>
            ) : (
              <Button type="primary" disabled>Save</Button>
            )}
          </center>
        )}
      </Card>
    )
  }

  renderDisplayCard() {
    const displayPage = this.state.page + 1;
    const totalPages = Math.max(1, Math.ceil(this.state.totalRecords / RECORDS_PER_PAGE));
    const fetchedPages = Math.max(1, Math.ceil(this.state.records.length / RECORDS_PER_PAGE));
    const hasNextPage = totalPages > displayPage;
    const hasPrevPage = displayPage > 1;
    const start = this.state.page * RECORDS_PER_PAGE;
    const end = (1 + this.state.page) * RECORDS_PER_PAGE;
    const data = this.state.records.slice(start, end)
    const extraLink = (
      <Button type="link" onClick={() => { this.setState({ isAdding: true })}}>Add Addresses</Button>
    )
    return (
      <Card title={'Saved Addresses'} extra={extraLink} bordered={true}>
        {this.state.loading ? this.renderLoading() : (
          <div>
            <Table dataSource={data} pagination={false}>
              <Table.Column title="Name" dataIndex="val" key="val"
                render={val => (
                  <div><b>{val}</b></div>
                )}
              />
              <Table.Column title="Address" dataIndex="key" key="key"
                render={key => (
                  <a  className='lattice-a' 
                      href={`https://etherscan.io/address/${key}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                  >
                    {`${key.slice(0, 10)}...${key.slice(key.length-8, key.length)}`}
                  </a>
                )}
              />
              <Table.Column title="" dataIndex="id" key="id"
                render={id => (
                  <Checkbox checked={this.recordIsChecked(id)}
                            onChange={() => {this.changeRecordChecked(id)}}
                            key={id}
                  />
                )}
              />
            </Table>
            <br/>
            <center>
              <Row justify='center'>
                <Col span={3}>
                  <Button disabled={!hasPrevPage} 
                          onClick={() => { this.setState({ page: this.state.page - 1 })}}
                  >
                    Prev
                  </Button>
                </Col>
                <Col span={5} offset={2}>
                  <center><p>Page {displayPage} of {totalPages}</p></center>
                </Col>
                <Col span={3} offset={2}>
                  <Button disabled={!hasNextPage} 
                          onClick={() => { 
                            this.setState(
                              { page: this.state.page + 1 }, 
                              () => { if (fetchedPages < totalPages) this.fetchRecords(); }
                            );
                          }}
                  >
                    Next
                  </Button>
                </Col>
              </Row>
              <Row justify='center'>
                {this.getNumSelected() > 0 ? (
                  <Button type="danger" 
                          onClick={this.removeSelected.bind(this)}
                          style={{ margin: '5px 0 0 0' }}
                  >
                    Remove Selected
                  </Button>
                ) : null}
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
    return (
      <PageContent content={content} isMobile={this.props.isMobile}/>
    )
  }
}

export default KVFiles
