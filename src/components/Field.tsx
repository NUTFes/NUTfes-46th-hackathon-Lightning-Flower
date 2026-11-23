"use client";

import {
  Field as ChakraField,
  Input,
  NativeSelect,
  Textarea,
  type InputProps,
  type NativeSelectFieldProps,
  type TextareaProps,
} from "@chakra-ui/react";
import type { ReactNode } from "react";

type FieldProps = {
  label: ReactNode;
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  helperText?: ReactNode;
  errorText?: ReactNode;
} & (
  | { kind?: "input"; control: InputProps }
  | { kind: "select"; control: NativeSelectFieldProps }
  | { kind: "textarea"; control: TextareaProps }
);

const controlStyle = {
  bg: "white",
  color: "#0f172a",
  borderColor: "#cbd5e1",
  rounded: "8px",
  fontSize: "14px",
  px: "3",
  _placeholder: { color: "#94a3b8" },
  _focusVisible: { borderColor: "#2563eb", outlineColor: "#2563eb" },
  _invalid: { borderColor: "#dc2626" },
  _disabled: { bg: "#eef1f5", color: "#64748b" },
} as const;

export function Field(props: FieldProps) {
  const { label, required, invalid, disabled, helperText, errorText } = props;

  return (
    <ChakraField.Root
      required={required}
      invalid={invalid}
      disabled={disabled}
      gap="1"
      fontFamily='"Noto Sans JP", sans-serif'
    >
      <ChakraField.Label fontSize="13px" fontWeight="bold" color="#0f172a">
        {label}
        <ChakraField.RequiredIndicator />
      </ChakraField.Label>
      {props.kind === "select" ? (
        <NativeSelect.Root invalid={invalid} disabled={disabled}>
          <NativeSelect.Field
            {...controlStyle}
            h="45px"
            pe="9"
            {...props.control}
          />
          <NativeSelect.Indicator color="#64748b" />
        </NativeSelect.Root>
      ) : props.kind === "textarea" ? (
        <Textarea {...controlStyle} minH="78px" py="3" {...props.control} />
      ) : (
        <Input {...controlStyle} h="45px" {...props.control} />
      )}
      {helperText != null && (
        <ChakraField.HelperText>{helperText}</ChakraField.HelperText>
      )}
      {errorText != null && (
        <ChakraField.ErrorText>{errorText}</ChakraField.ErrorText>
      )}
    </ChakraField.Root>
  );
}
