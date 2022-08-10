import { Button, notification } from "antd";

export const sendErrorNotification = ({
  message,
  description,
  onClick,
  onClose,
}: {
  message: string;
  description?: string;
  onClick?: () => void;
  onClose?: () => void;
}) => {
  const key = `error-${Date.now()}`;
  const btn = onClick && (
    <Button
      danger
      size="small"
      onClick={() => {
        onClick();
        notification.close(key);
      }}
    >
      Retry
    </Button>
  );
  notification.open({
    message,
    description,
    placement: "top",
    btn,
    key,
    type: "error",
    onClose,
  });
};
