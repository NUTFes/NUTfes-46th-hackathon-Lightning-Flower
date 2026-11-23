"use client";

import { Input, InputGroup } from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";

export type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  name?: string;
  disabled?: boolean;
  size?: "sm" | "md";
};

export function SearchField({
  value,
  onChange,
  placeholder,
  label = placeholder,
  name,
  disabled,
  size = "sm",
}: SearchFieldProps) {
  return (
    <InputGroup
      w="full"
      startElement={<FiSearch size={14} aria-hidden="true" />}
      startElementProps={{ color: "#64748b" }}
    >
      <Input
        type="search"
        aria-label={label}
        name={name}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        h={size === "sm" ? "44px" : "43px"}
        bg="white"
        color="#0f172a"
        fontSize="13px"
        rounded="8px"
        borderColor="#cbd5e1"
        _placeholder={{ color: "#94a3b8" }}
        _focusVisible={{ outlineColor: "#2563eb", borderColor: "#2563eb" }}
      />
    </InputGroup>
  );
}
