"use client";

import { Checkbox as ChakraCheckbox } from "@chakra-ui/react";
import type { ReactNode } from "react";

type CheckboxProps = {
  children: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  value?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
};

export function Checkbox({
  children,
  checked,
  onChange,
  ...props
}: CheckboxProps) {
  return (
    <ChakraCheckbox.Root
      {...props}
      checked={checked}
      onCheckedChange={({ checked }) => onChange(checked === true)}
      gap="2"
      color="#0f172a"
      colorPalette="blue"
    >
      <ChakraCheckbox.HiddenInput />
      <ChakraCheckbox.Control
        boxSize="20px"
        rounded="6px"
        borderColor="#cbd5e1"
        _checked={{ bg: "#2563eb", borderColor: "#2563eb" }}
      >
        <ChakraCheckbox.Indicator />
      </ChakraCheckbox.Control>
      <ChakraCheckbox.Label fontSize="14px">{children}</ChakraCheckbox.Label>
    </ChakraCheckbox.Root>
  );
}
