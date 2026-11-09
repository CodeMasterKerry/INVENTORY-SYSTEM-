"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { BusinessSettings as BusinessSettingsType, NotificationPreferences, User } from "@/types";
import { useAuthStore } from "@/store/auth-store";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AvatarCropModal } from "./avatar-crop-modal";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const defaultPreferences: NotificationPreferences = {
  pendingSales: true,
  productRequests: true,
  lowStock: true,
  rejectedSales: true,
};
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function ProfileView({ title, description, showSystem }: { title: string; description: string; showSystem?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const avatarInput = useRef<HTMLInputElement>(null);
  const avatarSelectionId = useRef(0);
  const [avatarSelection, setAvatarSelection] = useState<{ file: File; previewUrl: string; id: number } | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    const previewUrl = avatarSelection?.previewUrl;
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarSelection?.previewUrl]);

  useEffect(() => {
    let active = true;
    api<{ user: User }>("/account/profile")
      .then(({ user: latestUser }) => {
        if (!active) return;
        setName(latestUser.name);
        setEmail(latestUser.email);
        setPreferences(latestUser.notificationPreferences ?? defaultPreferences);
        updateUser(latestUser);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load profile"));
    return () => { active = false; };
  }, [updateUser]);

  if (!user) return null;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const { user: updated } = await api<{ user: User }>("/account/profile", {
        method: "PATCH",
        body: { name, email },
      });
      updateUser(updated);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveAvatar(avatarUrl: string) {
    if (!user) return false;
    setAvatarSaving(true);
    try {
      const { user: updated } = await api<{ user: User }>("/account/profile", {
        method: "PATCH",
        body: { avatarUrl, avatarShape: "CIRCLE" },
      });
      updateUser(updated);
      toast.success("Profile picture updated");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile picture");
      return false;
    } finally {
      setAvatarSaving(false);
    }
  }

  function closeAvatarSelection() {
    setAvatarSelection(null);
    if (avatarInput.current) avatarInput.current.value = "";
  }

  async function removeAvatar() {
    if (!user) return;
    setAvatarSaving(true);
    try {
      const { user: updated } = await api<{ user: User }>("/account/profile", {
        method: "PATCH",
        body: { avatarUrl: null, avatarShape: "CIRCLE" },
      });
      updateUser(updated);
      toast.success("Profile picture removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove profile picture");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function savePreferences(event: FormEvent) {
    event.preventDefault();
    setPreferencesSaving(true);
    try {
      const response = await api<{ preferences: NotificationPreferences }>("/account/notifications", {
        method: "PATCH",
        body: preferences,
      });
      setPreferences(response.preferences);
      toast.success("Notification preferences saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save preferences");
    } finally {
      setPreferencesSaving(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) return toast.error("New passwords do not match");
    if (newPassword.length < 8) return toast.error("New password must be at least 8 characters");
    setPasswordSaving(true);
    try {
      await api("/account/password", {
        method: "PATCH",
        body: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  const preferenceLabels: { key: keyof NotificationPreferences; label: string }[] = [
    { key: "pendingSales", label: "Sales awaiting approval" },
    { key: "productRequests", label: "Product requests to review" },
    { key: "lowStock", label: "Low-stock alerts" },
    { key: "rejectedSales", label: "Rejected sales" },
  ];

  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" />
          <div className="flex items-center gap-4 px-5 pt-5">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-14 text-lg" />
            <div className="min-w-0"><p className="text-base font-semibold text-slate-900">{user.name}</p><p className="text-[13px] text-slate-500">{user.email}</p></div>
          </div>
          <div className="flex flex-wrap gap-2 px-5 pt-4">
            <input
              ref={avatarInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Choose a profile picture"
              disabled={avatarSaving}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setAvatarSelection({
                  file,
                  previewUrl: URL.createObjectURL(file),
                  id: ++avatarSelectionId.current,
                });
              }}
            />
            <Button type="button" variant="secondary" size="sm" loading={avatarSaving} onClick={() => avatarInput.current?.click()}>
              <ImagePlus className="size-4" /> Upload photo
            </Button>
            {user.avatarUrl && (
              <Button type="button" variant="secondary" size="sm" disabled={avatarSaving} onClick={() => void removeAvatar()}>
                <Trash2 className="size-4" /> Remove
              </Button>
            )}
            <p className="w-full text-xs text-slate-500">Choose any-size JPEG, PNG, or WebP; crop and shape it before saving.</p>
          </div>
          <dl className="mt-4 divide-y divide-line border-t border-line">
            <Row label="Role"><Badge tone="info" dot={false}>{user.role === "MANAGER" ? "Manager" : "Sales Officer"}</Badge></Row>
            <Row label="Status"><Badge tone={user.isActive === false ? "danger" : "success"}>{user.isActive === false ? "Inactive" : "Active"}</Badge></Row>
            <Row label="User ID"><span className="font-mono">{user.id}</span></Row>
          </dl>
          <form onSubmit={saveProfile} className="space-y-4 border-t border-line p-5">
            <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
            <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
            <Button type="submit" loading={profileSaving}>Save profile</Button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Change password" />
            <form onSubmit={changePassword} className="space-y-4 p-5">
              <Input label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
              <Input label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
              <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
              <Button type="submit" loading={passwordSaving}>Update password</Button>
            </form>
          </Card>
          <Card>
            <CardHeader title="Notification preferences" />
            <form onSubmit={savePreferences} className="space-y-3 p-5">
              {preferenceLabels.map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-700">
                  {label}
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))}
                    className="size-4 rounded border-line accent-brand-600"
                  />
                </label>
              ))}
              <Button type="submit" loading={preferencesSaving}>Save preferences</Button>
            </form>
          </Card>
        </div>
        {showSystem && <BusinessSettingsCard />}
      </div>
      <AvatarCropModal
        key={avatarSelection?.id ?? "closed"}
        file={avatarSelection?.file ?? null}
        previewUrl={avatarSelection?.previewUrl ?? ""}
        onClose={closeAvatarSelection}
        onSave={async (avatarUrl) => {
          if (await saveAvatar(avatarUrl)) closeAvatarSelection();
        }}
      />
    </>
  );
}

function BusinessSettingsCard() {
  const [settings, setSettings] = useState<BusinessSettingsType | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [lowStockLevel, setLowStockLevel] = useState("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api<BusinessSettingsType>("/settings/business")
      .then((value) => {
        if (!active) return;
        setSettings(value);
        setBusinessName(value.businessName);
        setTaxRate(String(value.taxRate));
        setLowStockLevel(String(value.defaultLowStockLevel));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load business settings"))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    const tax = Number(taxRate);
    const stockLevel = Number(lowStockLevel);
    if (!businessName.trim()) return toast.error("Business name is required");
    if (!Number.isFinite(tax) || tax < 0 || tax > 100 || !/^\d+(?:\.\d{1,2})?$/.test(taxRate)) {
      return toast.error("Tax rate must be between 0 and 100 with at most 2 decimal places");
    }
    if (!Number.isInteger(stockLevel) || stockLevel < 0) return toast.error("Default low-stock level must be a whole number at or above 0");
    setSaving(true);
    try {
      const updated = await api<BusinessSettingsType>("/settings/business", {
        method: "PATCH",
        body: { businessName: businessName.trim(), taxRate: tax, defaultLowStockLevel: stockLevel },
      });
      setSettings(updated);
      toast.success("Business settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save business settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Business settings" description="New sales use the configured tax rate; existing sales keep their original tax snapshot." />
      {loading ? (
        <p className="p-5 text-sm text-slate-500">Loading settings…</p>
      ) : settings ? (
        <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-3">
          <Input label="Business name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={160} required />
          <Input label="Tax rate (%)" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} required />
          <Input label="Default low-stock level" type="number" min="0" step="1" value={lowStockLevel} onChange={(event) => setLowStockLevel(event.target.value)} required />
          <div className="sm:col-span-3"><Button type="submit" loading={saving}>Save business settings</Button></div>
        </form>
      ) : (
        <p className="p-5 text-sm text-red-600">Business settings could not be loaded. Refresh and try again.</p>
      )}
      {settings && <p className="border-t border-line px-5 py-3 text-xs text-slate-500">Last saved {new Date(settings.updatedAt).toLocaleString()}</p>}
    </Card>
  );
}
