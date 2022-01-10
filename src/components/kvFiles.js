import { LoadingOutlined, SyncOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  Row,
  Spin,
  Table,
} from "antd";
import "antd/dist/antd.dark.css";
import differenceBy from "lodash/differenceBy";
import unionBy from "lodash/unionBy";
import React from "react";
import { allChecks } from "../util/sendChecks";
import { AddAddressesButton } from "./AddAddressesButton";
import { PageContent } from "./index";
const ADDRESS_RECORD_TYPE = 0;
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
      },
    };

    this.updateAddKey = this.updateAddKey.bind(this);
    this.updateAddVal = this.updateAddVal.bind(this);
    this.addToRecordsInState = this.addToRecordsInState.bind(this);
    this.fetchRecords = this.fetchRecords.bind(this);
  }

  componentDidMount() {
    this.fetchRecords();
  }

  updateAddKey(evt) {
    const recordToAdd = JSON.parse(JSON.stringify(this.state.recordToAdd));
    recordToAdd.key = evt.target.value;
    this.setState({ recordToAdd });
  }

  updateAddVal(evt) {
    const recordToAdd = JSON.parse(JSON.stringify(this.state.recordToAdd));
    recordToAdd.val = evt.target.value;
    this.setState({ recordToAdd });
  }

  recordIsChecked(id) {
    let isChecked = false;
    this.state.records.forEach((_record) => {
      if (_record.id === id) {
        isChecked = _record.isChecked === true;
      }
    });
    return isChecked;
  }

  changeRecordChecked(id) {
    const records = JSON.parse(JSON.stringify(this.state.records));
    if (!records) return;
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
      if (record.isChecked) selected += 1;
    });
    return selected;
  }

  addToRecordsInState(recordsToAdd) {
    // Combines passed in array of records and records in state by comparing ids
    this.setState({ records: unionBy(this.state.records, recordsToAdd, "id") });
  }

  removeFromRecordsInState(recordsToRemove) {
    // Removes passed in array of records from records in state by comparing ids
    this.setState({
      records: differenceBy(this.state.records, recordsToRemove, "id"),
    });
  }

  fetchRecords(page = 0, retries = 1) {
    const opts = {
      start: page * RECORDS_PER_PAGE,
      n: RECORDS_PER_PAGE,
    };
    // Sanity check to make sure we didn't overrun the current page
    if (opts.start > this.state.records.length) {
      return this.setState({ error: "Mismatch fetching records." });
    }
    this.setState({ loading: true });
    this.props.session.client.getKvRecords(opts, (err, res) => {
      if (err) {
        if (retries === 0) {
          return this.setState({
            error: err,
            retryFunc: this.fetchRecords,
            loading: false,
          });
        } else {
          return this.fetchRecords(page, retries - 1);
        }
      } else if (res) {
        this.addToRecordsInState(res.records);
        const recordsToFetch = res.total - this.state.records.length;
        if (recordsToFetch > 0) {
          return this.fetchRecords(page + 1);
        } else {
          return this.setState({ loading: false, error: null });
        }
      }
      return this.setState({ loading: false, error: "Failed to fetch tags" });
    });
  }

  removeSelected() {
    const recordsToRemove = this.state.records.filter((r) => r.isChecked);
    const ids = recordsToRemove.map((r) => r.id);
    if (ids.length === 0) return;
    this.setState({ loading: true });
    this.props.session.client.removeKvRecords({ ids }, (err) => {
      if (err) return this.setState({ error: err, loading: false });
      this.removeFromRecordsInState(recordsToRemove);
      this.setState({ error: null, loading: false });
    });
  }

  renderError() {
    if (this.state.error) {
      return (
        <div>
          <Alert
            message="Error"
            description={this.state.error}
            action={
              this.state.retryFunc ? (
                <Button
                  type="danger"
                  onClick={() => {
                    this.state.retryFunc();
                    this.setState({ retryFunc: null, err: null });
                  }}
                >
                  Retry
                </Button>
              ) : null
            }
            type="error"
            closable
            onClose={() => {
              this.setState({ error: null });
            }}
          />
        </div>
      );
    }
  }

  renderLoading() {
    if (this.state.loading) {
      return (
        <center>
          <Spin tip="Loading..." indicator={<LoadingOutlined />} />
        </center>
      );
    }
  }

  shouldDisplaySend() {
    const key = this.state.recordToAdd.key;
    const val = this.state.recordToAdd.val;
    if (!key || !val) return false;
    const isValidAddress =
      allChecks.ETH.recipient(key) || allChecks.BTC.recipient(key);
    const isValidLen =
      key.length < MAX_RECORD_LEN && val.length < MAX_RECORD_LEN;
    return isValidAddress && isValidLen;
  }

  renderAddCard() {
    const extraLink = (
      <Button
        type="ghost"
        onClick={() => {
          this.setState({ isAdding: false });
        }}
      >
        View Addresses
      </Button>
    );
    return (
      <Card title={"Save Address Tag"} extra={extraLink} bordered={true}>
        {this.state.loading ? (
          this.renderLoading()
        ) : (
          <center>
            <Row>
              <Col span={18} offset={3}>
                <Input placeholder={"Address"} onChange={this.updateAddKey} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col span={18} offset={3}>
                <Input
                  placeholder={"Display Name"}
                  onChange={this.updateAddVal}
                />
              </Col>
            </Row>
            <br />
            {this.shouldDisplaySend() ? (
              <Button type="primary" onClick={this.addRecord}>
                Save
              </Button>
            ) : (
              <Button type="primary" disabled>
                Save
              </Button>
            )}
          </center>
        )}
      </Card>
    );
  }

  renderDisplayCard() {
    const displayPage = this.state.page + 1;
    const extra = [
      <Button
        type="link"
        icon={<SyncOutlined />}
        disabled={this.state.loading}
        onClick={() => {
          this.fetchRecords();
        }}
      >
        Sync
      </Button>,
      <AddAddressesButton
        records={this.state.records}
        session={this.props.session}
        addToRecordsInState={this.addToRecordsInState}
      />,
    ];
    return (
      <Card title={"Saved Addresses"} extra={extra} bordered={true}>
        {this.state.loading ? (
          this.renderLoading()
        ) : (
          <div>
            <Table
              dataSource={this.state.records}
              pagination={{
                position: ["bottomCenter"],
                pageSize: RECORDS_PER_PAGE,
                defaultCurrent: displayPage,
              }}
            >
              <Table.Column
                title="Name"
                dataIndex="val"
                key="val"
                render={(val) => (
                  <div>
                    <b>{val}</b>
                  </div>
                )}
              />
              <Table.Column
                title="Address"
                dataIndex="key"
                key="key"
                render={(key) => (
                  <a
                    className="lattice-a"
                    href={`https://etherscan.io/address/${key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {`${key.slice(0, 10)}...${key.slice(
                      key.length - 8,
                      key.length
                    )}`}
                  </a>
                )}
              />
              <Table.Column
                title=""
                dataIndex="id"
                key="id"
                render={(id) => (
                  <Checkbox
                    checked={this.recordIsChecked(id)}
                    onChange={() => {
                      this.changeRecordChecked(id);
                    }}
                    key={id}
                  />
                )}
              />
            </Table>
            <Row justify="center">
              {this.getNumSelected() > 0 ? (
                <Button
                  type="danger"
                  onClick={this.removeSelected.bind(this)}
                  style={{ margin: "5px 0 0 0" }}
                >
                  Remove Selected
                </Button>
              ) : null}
            </Row>
          </div>
        )}
      </Card>
    );
  }

  renderCard() {
    if (this.state.isAdding) {
      return this.renderAddCard();
    } else {
      return this.renderDisplayCard();
    }
  }

  render() {
    const content = (
      <div>
        {this.renderError()}
        {this.renderCard()}
      </div>
    );
    return <PageContent content={content} isMobile={this.props.isMobile} />;
  }
}

export default KVFiles;
