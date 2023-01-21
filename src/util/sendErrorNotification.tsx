import { Button, notification } from "antd";

export const sendErrorNotification = ({
  message,
  description,
  onClick,
  onClose,
  duration = 4.5,
}: {
  message: string;
  description?: string;
  onClick?: () => void;
  onClose?: () => void;
  duration?: number; // in seconds
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
    duration,
    placement: "top",
    btn,
    key,
    type: "error",
    onClose,
  });
};
