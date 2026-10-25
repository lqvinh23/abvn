"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import type { ActionResult } from "@/src/lib/platform/types";
import ActionIcon from "./ActionIcon";

export default function ActionForm({
  action,
  children,
  submitLabel,
  className = "",
  disabled = false,
  preserveOnError = false,
  icon,
  beforeSubmit,
  iconAndText = false,
  submitButtonClassName = "",
  id,
  hideSubmitButton = false,
  toastNotice = false,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children?: ReactNode;
  submitLabel: string;
  className?: string;
  disabled?: boolean;
  preserveOnError?: boolean;
  icon?: Parameters<typeof ActionIcon>[0]["name"];
  beforeSubmit?: (form: HTMLFormElement) => boolean;
  iconAndText?: boolean;
  submitButtonClassName?: string;
  id?: string;
  hideSubmitButton?: boolean;
  toastNotice?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {
    ok: false,
    message: "",
  });
  const form = useRef<HTMLFormElement>(null);
  const [dismissedState, setDismissedState] = useState<ActionResult | null>(null);
  useEffect(() => {
    if (preserveOnError && state.ok) form.current?.reset();
  }, [preserveOnError, state]);
  const noticeDismissed = dismissedState === state;
  return (
    <form id={id} ref={form} action={formAction} className={className} onSubmit={beforeSubmit || preserveOnError ? event => {
      if (event.defaultPrevented) return;
      if (beforeSubmit && !beforeSubmit(event.currentTarget)) {
        event.preventDefault();
        return;
      }
      if (preserveOnError) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }
    } : undefined}>
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {children}
        {!hideSubmitButton ? <button
          type="submit"
          disabled={disabled}
          title={pending ? "Saving..." : submitLabel}
          aria-label={pending ? "Saving..." : submitLabel}
          className={submitButtonClassName || (icon && !iconAndText ? "workspace-icon-action" : "button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50")}
        >
          {icon ? <ActionIcon name={icon} /> : null}
          {icon && !iconAndText ? null : pending ? "Saving..." : submitLabel}
        </button> : null}
      </fieldset>
      {state.message ? toastNotice
        ? noticeDismissed ? null : <div className="pointer-events-none fixed inset-0 z-[100] flex justify-end p-4 sm:p-6">
          <div role={state.ok ? "status" : "alert"} className={`pointer-events-auto flex h-fit max-w-[min(28rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border p-4 text-sm leading-6 shadow-lg ${state.ok ? "border-green-200 bg-green-50 text-green-900" : "border-red-200 bg-red-50 text-red-900"}`}>
            <p className="min-w-0 flex-1">{state.message}</p>
            <button type="button" aria-label="Close notification" title="Close notification" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-black/5" onClick={() => setDismissedState(state)}><ActionIcon name="close" /></button>
          </div>
        </div>
        : <p role={state.ok ? "status" : "alert"} className={`mt-4 rounded-lg p-3 text-base leading-6 ${state.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>{state.message}</p>
        : null}
    </form>
  );
}
