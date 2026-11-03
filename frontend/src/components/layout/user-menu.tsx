import { Dropdown } from "../ui/dropdown";

export function UserMenu() {
  return (
    <Dropdown label="Account">
      <p className="px-2 py-1 text-sm text-slate-500">Signed-in user</p>
    </Dropdown>
  );
}
