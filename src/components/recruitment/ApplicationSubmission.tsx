"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import { submitApplication } from "@/src/app/recruitment/actions";

export default function ApplicationSubmission({ children }: { children: ReactNode }) {
  const [state, dispatch, pending] = useActionState(submitApplication, { ok: false, message: "" });
  const message = useRef<HTMLParagraphElement>(null);
  useEffect(() => { message.current?.focus(); }, [state]);
  return <form onSubmit={event => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => dispatch(form));
  }} className="space-y-6">
    <fieldset disabled={pending || state.ok} className="min-w-0 space-y-6">
      {children}
      <button type="submit" className="inline-flex min-h-12 items-center rounded-lg bg-(--primary) px-5 py-3 font-semibold text-white hover:bg-(--accent) disabled:opacity-50">{pending ? "Submitting..." : "Submit application"}</button>
    </fieldset>
    {state.message ? <p ref={message} tabIndex={-1} role={state.ok ? "status" : "alert"} className={`rounded-lg p-4 text-sm leading-6 ${state.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>{state.message}{!state.ok ? " Your answers and selected files have been kept." : ""}</p> : null}
  </form>;
}
