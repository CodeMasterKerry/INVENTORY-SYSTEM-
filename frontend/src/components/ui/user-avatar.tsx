import Image from "next/image";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  className: string;
}) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 font-semibold text-brand-700", className)}>
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" fill unoptimized sizes="56px" className="object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
