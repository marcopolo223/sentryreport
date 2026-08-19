"use client";

import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";

import { createDraftReport } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus />
      {pending ? "Starting…" : "New report"}
    </Button>
  );
}

export function NewReportButton() {
  return (
    <form action={createDraftReport}>
      <SubmitButton />
    </form>
  );
}
