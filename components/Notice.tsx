import AppNotification, {
  type NotificationTone,
} from "@/components/AppNotification";

type NoticeProps = {
  children: React.ReactNode;
  tone?: NotificationTone;
  title?: string;
};

export default function Notice({
  children,
  tone = "success",
  title,
}: NoticeProps) {
  return (
    <AppNotification tone={tone} title={title}>
      {children}
    </AppNotification>
  );
}
