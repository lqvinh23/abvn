"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionResult } from "@/src/lib/platform/types";

export default function ActionForm({
  action,
  children,
  submitLabel,
  className = "",
  disabled = false,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children?: ReactNode;
  submitLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {
    ok: false,
    message: "",
  });
  return (
    <form action={formAction} className={className}>
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {children}
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-(--primary) px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </fieldset>
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`mt-4 rounded-lg p-3 text-base leading-6 ${state.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
