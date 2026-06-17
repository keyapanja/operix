"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSubcategories } from "@/lib/org/actions";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "@/components/ui/toast";

/** Add many sub-categories under one category at once (category stays selected). */
export function BulkSubcategoryForm({ categories }: { categories: { value: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [category, setCategory] = useState("");
  const [text, setText] = useState("");

  function add() {
    if (!category) return toast.error("Pick a category first");
    const names = text.split("\n").map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return toast.error("Enter at least one sub-category");
    start(async () => {
      const res = await addSubcategories(category, names);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const created = res.created ?? 0;
      const skipped = res.skipped ?? 0;
      toast.success(
        `Added ${created} sub-categor${created === 1 ? "y" : "ies"}` +
          (skipped ? ` · ${skipped} skipped (already exist)` : ""),
      );
      setText(""); // keep the category selected so you can add another batch
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Category" className="max-w-xs">
        <Combobox value={category} onChange={setCategory} options={categories} placeholder="Select category" />
      </Field>
      <Field label="Sub-categories" htmlFor="bulk-subs" hint="One per line — add as many as you like">
        <Textarea
          id="bulk-subs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"e.g.\nLanding Page\nBlog Post\nProduct Page"}
          className="min-h-24"
        />
      </Field>
      <div>
        <button
          onClick={add}
          disabled={pending || !category || !text.trim()}
          className="gradient-brand-strong rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add sub-categories"}
        </button>
      </div>
    </div>
  );
}
