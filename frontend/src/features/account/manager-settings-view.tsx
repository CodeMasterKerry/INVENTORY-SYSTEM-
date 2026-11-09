import { ProfileView } from "./profile-view";
import { UsersView } from "@/features/users/users-view";

export function ManagerSettingsView() {
  return (
    <div className="space-y-8">
      <ProfileView title="Settings" description="Your account and system information." showSystem />
      <section aria-labelledby="staff-management-heading" className="border-t border-line pt-8">
        <h2 id="staff-management-heading" className="sr-only">Staff management</h2>
        <UsersView />
      </section>
    </div>
  );
}
