"use client";
import { useMemo, useState } from "react";
import { Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useAuthStore } from "@/store/auth-store";
import { formatDate, initials } from "@/lib/utils";
import type { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { toast } from "@/components/ui/toast";
import { AwaitingNotice } from "@/components/ui/awaiting-backend";

const fetchUsers = () => api<User[]>("/users");

export function UsersView() {
  const me = useAuthStore((state) => state.user);
  const { data, error, loading, reload } = useFetch(fetchUsers);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [toggling, setToggling] = useState<User | null>(null);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data ?? []).filter((user) => user.role === "SALES_OFFICER" && (!term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)));
  }, [data, query]);
  const actionClass = "rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800";

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      sortValue: (user) => user.name.toLowerCase(),
      render: (user) => (
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{initials(user.name)}</span>
          <div><p className="font-medium text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (user) => <Badge tone={user.role === "MANAGER" ? "info" : "neutral"} dot={false}>{user.role === "MANAGER" ? "Manager" : "Sales Officer"}</Badge> },
    { key: "status", header: "Status", render: (user) => <Badge tone={user.isActive ? "success" : "neutral"}>{user.isActive ? "Active" : "Deactivated"}</Badge> },
    { key: "created", header: "Created", hideOnMobile: true, sortValue: (user) => new Date(user.createdAt ?? 0).getTime(), render: (user) => formatDate(user.createdAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (user) => (
        <div className="flex justify-end gap-0.5">
          <button className={actionClass} title="Rename" aria-label={`Rename ${user.name}`} onClick={() => setEditing(user)}><Pencil className="size-4" /></button>
          {user.id !== me?.id && (
            <button className={actionClass} title={user.isActive ? "Deactivate" : "Activate"} aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${user.name}`} onClick={() => setToggling(user)}>
              {user.isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
            </button>
          )}
        </div>
      ),
    },
  ];

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <>
      <PageHeader title="Staff Management" description="View sales officers, create accounts and manage access." actions={<Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />Add sales officer</Button>} />
      <AwaitingNotice title="Password reset, role change and delete are not available yet">
        The backend supports creating sales officers, renaming users and activating or deactivating accounts. Deactivated users cannot sign in.
      </AwaitingNotice>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(user) => user.id}
        loading={loading && !data}
        toolbar={<SearchInput value={query} onChange={setQuery} placeholder="Search name or email…" />}
        emptyTitle="No users found"
      />
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onDone={reload} />
      <RenameModal user={editing} onClose={() => setEditing(null)} onDone={reload} />
      <ToggleModal user={toggling} onClose={() => setToggling(null)} onDone={reload} />
    </>
  );
}

function CreateUserModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  return open ? <CreateUserForm onClose={onClose} onDone={onDone} /> : null;
}

function CreateUserForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Required";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email";
    if (form.password.length < 6) nextErrors.password = "At least 6 characters";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      await api("/users", { method: "POST", body: { name: form.name.trim(), email: form.email.trim(), password: form.password } });
      toast.success("Sales officer created");
      onDone();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="New sales officer"
      description="They can sign in with the temporary password you set."
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" form="user-form" loading={busy}>Create account</Button></>}
    >
      <form id="user-form" onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Full name" value={form.name} onChange={update("name")} error={errors.name} autoFocus />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={update("email")} error={errors.email} />
        <Input label="Temporary password" type="password" autoComplete="new-password" value={form.password} onChange={update("password")} error={errors.password} hint="Share it with the officer securely." />
      </form>
    </Modal>
  );
}

function RenameModal({ user, onClose, onDone }: { user: User | null; onClose: () => void; onDone: () => void }) {
  return user ? <RenameForm user={user} onClose={onClose} onDone={onDone} /> : null;
}

function RenameForm({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    setBusy(true);
    try {
      await api(`/users/${user.id}`, { method: "PATCH", body: { name: name.trim() } });
      toast.success("Name updated");
      onDone();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Rename user"
      description={user.email}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" form="rename-form" loading={busy}>Save</Button></>}
    >
      <form id="rename-form" onSubmit={submit}><Input label="Full name" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></form>
    </Modal>
  );
}

function ToggleModal({ user, onClose, onDone }: { user: User | null; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const targetUser = user;
  const deactivate = !!targetUser.isActive;

  async function confirm() {
    setBusy(true);
    try {
      await api(`/users/${targetUser.id}`, { method: "PATCH", body: { isActive: !deactivate } });
      toast.success(deactivate ? "Account deactivated" : "Account activated");
      onDone();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={deactivate ? "Deactivate account?" : "Activate account?"}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button variant={deactivate ? "danger" : "primary"} loading={busy} onClick={confirm}>{deactivate ? "Deactivate" : "Activate"}</Button></>}
    >
      <p className="text-sm text-slate-600">
        {deactivate ? `${targetUser.name} will no longer be able to sign in. Their sales history stays intact.` : `${targetUser.name} will be able to sign in again.`}
      </p>
    </Modal>
  );
}
