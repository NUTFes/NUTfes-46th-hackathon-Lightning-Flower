"use client";

import { Box, NativeSelect, Text } from "@chakra-ui/react";

export type FilterOption = { value: string; label: string };

type FilterDropdownProps = {
  label: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
};

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  disabled,
  size = "md",
}: FilterDropdownProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <NativeSelect.Root
      w="auto"
      maxW="full"
      disabled={disabled}
      position="relative"
      rounded="8px"
      borderWidth="1px"
      borderColor={selected ? "#2563eb" : "#cbd5e1"}
      bg={selected ? "#eaf1fe" : "white"}
      color={selected ? "#2563eb" : "#0f172a"}
      h={size === "sm" ? "34px" : "43px"}
      _focusWithin={{ outline: "2px solid #2563eb", outlineOffset: "2px" }}
      _disabled={{ opacity: 0.5 }}
    >
      <Box
        aria-hidden="true"
        display="flex"
        alignItems="center"
        minW="0"
        gap="1"
        ps="3"
        pe="8"
        fontSize="13px"
      >
        <Text flexShrink={0}>{label}</Text>
        {selected && (
          <Text truncate fontWeight="bold">
            {selected.label}
          </Text>
        )}
      </Box>
      <NativeSelect.Field
        aria-label={label}
        value={selected ? value : ""}
        onChange={(event) => onChange(event.currentTarget.value)}
        position="absolute"
        inset="0"
        h="full"
        opacity={0}
        cursor={disabled ? "not-allowed" : "pointer"}
      >
        <option value="">すべて</option>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator color="currentColor" />
    </NativeSelect.Root>
  );
}
