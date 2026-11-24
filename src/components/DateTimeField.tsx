"use client";

import { useEffect, useRef } from "react";
import { toLocalInputValue } from "@/lib/constants";
import { Field } from "./Field";

type DateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  name?: string;
  defaultNow?: boolean;
  defaultNowTimeZone?: "Asia/Tokyo";
  lang?: string;
  helperText?: string;
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  errorText?: string;
};

export function DateTimeField({
  value,
  onChange,
  name,
  defaultNow,
  defaultNowTimeZone,
  lang,
  ...fieldProps
}: DateTimeFieldProps) {
  const initialized = useRef(false);
  useEffect(() => {
    if (!defaultNow || initialized.current) return;
    initialized.current = true;
    if (value !== "") return;

    const now = new Date();
    if (defaultNowTimeZone === "Asia/Tokyo") {
      onChange(toLocalInputValue(now.toISOString()));
      return;
    }
    const localTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60_000,
    );
    onChange(localTime.toISOString().slice(0, 16));
  }, [defaultNow, defaultNowTimeZone, onChange, value]);

  return (
    <Field
      {...fieldProps}
      control={{
        type: "datetime-local",
        name,
        lang,
        value,
        onChange: (event) => onChange(event.currentTarget.value),
      }}
    />
  );
}
