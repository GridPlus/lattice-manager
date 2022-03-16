import { Alert, Button } from "antd";
import React from "react";

export const ErrorAlert = ({ error, retryFunction }) => {
  return error ? (
    <Alert
      message="Error"
      description={error}
      type="error"
      closable
      action={
        <Button
          //@ts-expect-error
          type="danger"
          onClick={() => {
            retryFunction && retryFunction();
          }}
        >
          Retry
        </Button>
      }
    />
  ) : null;
};
