"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionResult } from "@/src/lib/platform/types";

export default function ActionForm({
  action,
  children,
  submitLabel,
  className = "",
  disabled = false,
  preserveOnError = false,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children?: ReactNode;
  submitLabel: string;
  className?: string;
  disabled?: boolean;
  preserveOnError?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {
    ok: false,
    message: "",
  });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (preserveOnError && state.ok) form.current?.reset();
  }, [preserveOnError, state]);
  return (
    <form ref={form} action={formAction} className={className} onSubmit={preserveOnError ? event => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(() => formAction(data));
    } : undefined}>
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
