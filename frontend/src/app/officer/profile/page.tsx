import { ProfileView } from "@/features/account/profile-view";

export const instant = false;

export default function Page() {
  return <ProfileView title="My Profile" description="Your account details." />;
}
