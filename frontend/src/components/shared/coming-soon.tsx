import { EmptyState } from "../ui/empty-state";

export function ComingSoon({
  title,
  description = "This section is not available yet.",
}: {
  title: string;
  description?: string;
}) {
  return <EmptyState title={title} description={description} />;
}
