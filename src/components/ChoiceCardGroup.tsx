"use client";

import { RadioCard as ChakraRadioCard } from "@chakra-ui/react";
import type { RadioProps } from "./Radio";

type ChoiceCardGroupProps = Omit<RadioProps, "options"> & {
  options: readonly {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }[];
};

export function ChoiceCardGroup({
  options,
  value,
  onChange,
  name,
  label,
  disabled,
}: ChoiceCardGroupProps) {
  return (
    <ChakraRadioCard.Root
      value={value}
      onValueChange={({ value }) => {
        if (value !== null) onChange(value);
      }}
      name={name}
      aria-label={label ?? name}
      disabled={disabled}
      gap="3"
      align="start"
      colorPalette="blue"
      w="full"
    >
      {options.map((option) => (
        <ChakraRadioCard.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          w="full"
          rounded="12px"
          bg="white"
          borderColor="#cbd5e1"
          _checked={{
            bg: "#eaf1fe",
            borderColor: "#2563eb",
            boxShadow: "inset 0 0 0 1px #2563eb",
          }}
        >
          <ChakraRadioCard.ItemHiddenInput />
          <ChakraRadioCard.ItemControl
            px="3"
            py="4"
            alignItems="center"
            gap="3"
          >
            <ChakraRadioCard.ItemIndicator
              boxSize="20px"
              borderColor="#cbd5e1"
              _checked={{ bg: "#2563eb", borderColor: "#2563eb" }}
            />
            <ChakraRadioCard.ItemContent gap="1" minW="0">
              <ChakraRadioCard.ItemText
                fontSize="14px"
                lineHeight="22px"
                fontWeight="bold"
                color="#0f172a"
              >
                {option.label}
              </ChakraRadioCard.ItemText>
              {option.description && (
                <ChakraRadioCard.ItemDescription
                  fontSize="11px"
                  lineHeight="15px"
                  opacity={1}
                  color="#64748b"
                >
                  {option.description}
                </ChakraRadioCard.ItemDescription>
              )}
            </ChakraRadioCard.ItemContent>
          </ChakraRadioCard.ItemControl>
        </ChakraRadioCard.Item>
      ))}
    </ChakraRadioCard.Root>
  );
}

export { ChoiceCardGroup as RadioCard };
