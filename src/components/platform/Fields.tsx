"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

const inputClass =
  "mt-2 block min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-950 focus:border-(--primary) focus:outline-2 focus:outline-(--primary)";
const compactInputClass =
  "mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-(--primary) focus:outline-2 focus:outline-(--primary)";
const selectButtonClass =
  "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-base text-slate-950 shadow-sm transition hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const compactSelectButtonClass =
  "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-950 shadow-sm transition hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

type SelectOption = { value: string; label: ReactNode; disabled: boolean };

const optionText = (label: ReactNode) => Children.toArray(label).filter(part => typeof part === "string" || typeof part === "number").join("").toLowerCase();

function readOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      options.push(
        ...readOptions(
          (child.props as { children?: ReactNode }).children,
        ),
      );
      return;
    }
    if (child.type !== "option") return;
    const props = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    };
    const label = props.children;
    options.push({
      value: String(props.value ?? (typeof label === "string" ? label : "")),
      label,
      disabled: props.disabled ?? false,
    });
  });
  return options;
}

export function Field({
  label,
  compact = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; compact?: boolean }) {
  return (
    <label className={`block font-medium text-slate-800 ${compact ? "text-sm" : "text-base"}`}>
      {label}
      <input {...props} className={compact ? compactInputClass : inputClass} />
    </label>
  );
}

export function TextArea({
  label,
  compact = false,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; compact?: boolean }) {
  return (
    <label className={`block font-medium text-slate-800 ${compact ? "text-sm" : "text-base"}`}>
      {label}
      <textarea {...props} className={compact ? compactInputClass : inputClass} />
    </label>
  );
}

export function Select({
  label,
  children,
  compact = false,
  hideLabel = false,
  name,
  id,
  value,
  defaultValue,
  onValueChange,
  required = false,
  disabled = false,
  form,
}: {
  label: string;
  compact?: boolean;
  hideLabel?: boolean;
  children: ReactNode;
  name?: string;
  id?: string;
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  form?: string;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-options`;
  const options = readOptions(children);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(
    String(
      defaultValue ??
        options.find((option) => !option.disabled)?.value ??
        "",
    ),
  );
  const [open, setOpen] = useState(false);
  const [previousDefault, setPreviousDefault] = useState(defaultValue);
  if (defaultValue !== previousDefault) {
    setPreviousDefault(defaultValue);
    if (!isControlled) setInternalValue(String(defaultValue ?? ""));
  }
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showRequiredError, setShowRequiredError] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typed = useRef("");
  const typedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentValue = isControlled ? String(value) : internalValue;
  const selected = options.find((option) => option.value === currentValue);
  const placeholder = options.find((option) => option.value === "");
  const selectedLabel = selected?.label ?? placeholder?.label ?? "Choose an option";
  const selectedIndex = options.findIndex(
    (option) => option.value === currentValue && !option.disabled,
  );

  function setSelected(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setShowRequiredError(false);
    setOpen(false);
    button.current?.focus();
    if (name) root.current?.dispatchEvent(new CustomEvent("abvn-select-change", { bubbles: true, detail: { name, value: nextValue } }));
  }

  function focusOption(index: number, direction: 1 | -1 = 1) {
    const enabled = options
      .map((option, optionIndex) => (option.disabled ? -1 : optionIndex))
      .filter((optionIndex) => optionIndex >= 0);
    if (!enabled.length) return;
    const nextIndex = enabled.includes(index)
      ? index
      : direction === 1
        ? (enabled.find((optionIndex) => optionIndex > index) ?? enabled[0])
        : ([...enabled].reverse().find((optionIndex) => optionIndex < index) ??
          enabled[enabled.length - 1]);
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }

  function openMenu(direction: 1 | -1 = 1) {
    if (disabled) return;
    const enabled = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);
    const initialIndex =
      selectedIndex >= 0
        ? selectedIndex
        : direction === 1
          ? enabled[0]
          : enabled[enabled.length - 1];
    setOpen(true);
    if (initialIndex !== undefined) focusOption(initialIndex, direction);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (isControlled || !name) return;
    const owner = root.current?.closest("form");
    if (!owner) return;
    function onReset() {
      setInternalValue(owner?.classList.contains("workspace-filter-bar") ? "" : String(defaultValue ?? ""));
      setShowRequiredError(false);
      setOpen(false);
    }
    owner.addEventListener("reset", onReset);
    return () => owner.removeEventListener("reset", onReset);
  }, [defaultValue, isControlled, name]);

  useEffect(() => {
    if (!required || !name) return;
    const owner = form
      ? document.getElementById(form)
      : root.current?.closest("form");
    if (!(owner instanceof HTMLFormElement)) return;
    function onSubmit(event: SubmitEvent) {
      if (currentValue) return;
      event.preventDefault();
      setShowRequiredError(true);
      button.current?.focus();
    }
    owner.addEventListener("submit", onSubmit, true);
    return () => owner.removeEventListener("submit", onSubmit, true);
  }, [currentValue, form, name, required]);

  return (
    <div
      ref={root}
      className={`relative block font-medium text-slate-800 ${compact ? "text-sm" : "text-base"}`}
    >
      <span id={`${controlId}-label`} className={hideLabel ? "sr-only" : undefined}>{label}</span>
      {name ? <input type="hidden" name={name} form={form} value={currentValue} /> : null}
      <button
        ref={button}
        id={controlId}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={`${controlId}-label`}
        aria-required={required || undefined}
        aria-invalid={showRequiredError || undefined}
        aria-describedby={showRequiredError ? `${controlId}-error` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(event.key === "ArrowDown" ? 1 : -1);
          }
          if ((event.key === "Enter" || event.key === " ") && open) {
            event.preventDefault();
            focusOption(selectedIndex >= 0 ? selectedIndex : 0);
          }
        }}
        className={compact ? (hideLabel ? compactSelectButtonClass : `mt-1 ${compactSelectButtonClass}`) : selectButtonClass}
      >
        <span className={selected ? "" : "text-slate-500"}>{selectedLabel}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`size-5 shrink-0 text-slate-600 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {showRequiredError ? (
        <span id={`${controlId}-error`} role="alert" className="mt-1 block text-sm font-normal text-red-800">
          Please choose an option.
        </span>
      ) : null}
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={`${controlId}-label`}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
        >
          {options.map((option, index) => (
            <button
              key={`${option.value}:${index}`}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={option.value === currentValue}
              disabled={option.disabled}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => setSelected(option.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  focusOption(
                    index +
                      (event.key === "ArrowDown" ? 1 : -1),
                    event.key === "ArrowDown" ? 1 : -1,
                  );
                } else if (event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  const enabled = options
                    .map((option, optionIndex) =>
                      option.disabled ? -1 : optionIndex,
                    )
                    .filter((optionIndex) => optionIndex >= 0);
                  focusOption(
                    event.key === "Home"
                      ? enabled[0]
                      : enabled[enabled.length - 1],
                  );
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  button.current?.focus();
                } else if (event.key === "Enter" || (event.key === " " && !typed.current)) {
                  event.preventDefault();
                  setSelected(option.value);
                } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                  // Type-ahead: jump to the next option whose text starts with what was typed.
                  event.preventDefault();
                  clearTimeout(typedTimer.current);
                  typed.current += event.key.toLowerCase();
                  typedTimer.current = setTimeout(() => { typed.current = ""; }, 700);
                  const prefix = typed.current;
                  const start = prefix.length === 1 ? index + 1 : index;
                  const order = [...options.keys()].map(offset => (start + offset) % options.length);
                  const match = order.find(candidate => !options[candidate].disabled && optionText(options[candidate].label).startsWith(prefix));
                  if (match !== undefined) focusOption(match);
                }
              }}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                option.value === currentValue
                  ? "bg-green-50 text-green-950"
                  : "text-slate-800 hover:bg-slate-50"
              } focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-green-800`}
            >
              <span>{option.label}</span>
              {option.value === currentValue ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="size-4 shrink-0 text-green-800"
                >
                  <path d="m4 10 4 4 8-8" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
