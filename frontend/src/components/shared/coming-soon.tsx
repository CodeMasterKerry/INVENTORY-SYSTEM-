"use client";
import { usePathname } from "next/navigation";
import { Hammer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export function ComingSoon() {
  const last = usePathname().split("/").filter(Boolean).pop() ?? "";
  const title = last.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={Hammer} title="This page is being built" description="It will appear here in an upcoming phase." />
      </Card>
    </>
  );
}