import { Modal } from "antd";
import { constants } from "../util/helpers";

export const NewUserModal = ({
  isNewUserModalVisible,
  setIsNewUserModalVisible,
  name,
}) => (
  <Modal
    title={name === constants.DEFAULT_APP_NAME ? name : "Lattice Connector 🔗"}
    footer={null}
    visible={isNewUserModalVisible}
    onOk={() => setIsNewUserModalVisible(false)}
    onCancel={() => setIsNewUserModalVisible(false)}
  >
    <div>
      <center>
        <h3>
          <b>New User Setup</b>
        </h3>
      </center>
      <p>
        You can use this page to establish a connection between <b>{name}</b>
        &nbsp; and your Lattice hardware wallet device.&nbsp;
        <i>
          For more general device setup information, please see the&nbsp;
          <a
            className="lattice-a"
            href="https://gridplus.io/setup"
            target={"_blank"}
            rel={"noopener noreferrer"}
          >
            Lattice setup page
          </a>
          .
        </i>
      </p>
      <h3>
        <b>Step 1:</b>
      </h3>
      <p>
        Unlock your Lattice and find its <b>Device ID</b> on the main menu. This
        is a six-character code.
      </p>
      <h3>
        <b>Step 2:</b>
      </h3>
      <p>
        Once you have your Device ID, specify a <b>password</b>. This does{" "}
        <i>not</i> secure any value and is <i>not</i> associated with your
        wallet seed - it is only used to send secure requests to your device. If
        you lose your password, you can remove the permission on your device and
        re-connect with a new one.
      </p>
      <h3>
        <b>Step 3:</b>
      </h3>
      <p>
        Please ensure your Lattice is <b>online</b> and click "Connect". Your
        device is online if there is a single wifi signal icon on the top-right
        of the screen.
      </p>
    </div>
  </Modal>
);
