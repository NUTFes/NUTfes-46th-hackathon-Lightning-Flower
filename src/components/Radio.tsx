"use client";

import { RadioGroup } from "@chakra-ui/react";
import type { ReactNode } from "react";

export type RadioOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type RadioProps = {
  options: readonly RadioOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  label?: string;
  disabled?: boolean;
};

export function Radio({
  options,
  value,
  onChange,
  name,
  label,
  disabled,
}: RadioProps) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={({ value }) => {
        if (value !== null) onChange(value);
      }}
      name={name}
      aria-label={label ?? name}
      disabled={disabled}
      // RadioGroup.Root は flex ではないので、縦に並べて gap を効かせる
      display="flex"
      flexDirection="column"
      alignItems="stretch"
      gap="1"
      colorPalette="blue"
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          gap="2"
          // ラベルの行全体を押せるようにし、指で押しやすい高さにする
          minH="40px"
          cursor="pointer"
        >
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemIndicator
            boxSize="20px"
            borderColor="#cbd5e1"
            _checked={{ bg: "#2563eb", borderColor: "#2563eb" }}
          />
          <RadioGroup.ItemText fontSize="14px" color="#0f172a">
            {option.label}
          </RadioGroup.ItemText>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
