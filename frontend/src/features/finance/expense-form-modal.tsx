"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { Expense } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

function dateInputValue(value?: string) {
  if (value) return value.slice(0, 10);
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export function ExpenseFormModal({
  open,
  expense,
  onClose,
  onDone,
}: {
  open: boolean;
  expense: Expense | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [category, setCategory] = useState(expense?.category ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [date, setDate] = useState(() => dateInputValue(expense?.expenseDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api<Expense>(expense ? `/finance/expenses/${expense.id}` : "/finance/expenses", {
        method: expense ? "PUT" : "POST",
        body: { category, description, amount, date },
      });
      toast.success(expense ? "Expense updated" : "Expense recorded");
      await onDone();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? "Edit expense" : "Record expense"}
      description="Enter the expense details for your business records."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="expense-form" loading={saving}>{expense ? "Save changes" : "Record expense"}</Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={(event) => void submit(event)} className="space-y-4">
        <Input label="Category" name="category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} placeholder="e.g. Rent, Utilities, Supplies" required />
        <Input label="Description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="What was this expense for?" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Amount" name="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          <Input label="Date" name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
