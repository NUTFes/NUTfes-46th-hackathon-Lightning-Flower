"use client";

import { Box, Button, IconButton, Image, Text } from "@chakra-ui/react";
import { useCallback } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import type { Photo } from "./ItemThumbnail";

type PhotoUploadTileProps =
  | { photo?: undefined; onAdd: () => void; disabled?: boolean }
  | {
      photo: Photo | File;
      index: number;
      onRemove: () => void;
      disabled?: boolean;
    };

export function PhotoUploadTile(props: PhotoUploadTileProps) {
  const file = props.photo && "name" in props.photo ? props.photo : undefined;
  const setPreview = useCallback(
    (image: HTMLImageElement | null) => {
      if (!image || !file) return;
      const url = URL.createObjectURL(file);
      image.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [file],
  );

  if (!props.photo) {
    return (
      <Button
        type="button"
        onClick={props.onAdd}
        disabled={props.disabled}
        variant="outline"
        display="flex"
        flexDirection="column"
        gap="0.5"
        w="112px"
        maxW="full"
        h="95px"
        borderStyle="dashed"
        borderWidth="1.5px"
        borderColor="#cbd5e1"
        rounded="8px"
        bg="#eef1f5"
        color="#64748b"
        _hover={{ bg: "#e2e8f0" }}
      >
        <FiPlus size={22} aria-hidden="true" />
        <Text as="span" fontSize="11px" fontWeight="normal">
          写真を追加
        </Text>
      </Button>
    );
  }

  const label = `写真 ${props.index + 1}`;
  const saved = "url" in props.photo ? props.photo : undefined;

  return (
    <Box
      position="relative"
      overflow="hidden"
      w="112px"
      maxW="full"
      h="95px"
      rounded="8px"
      bg="#e2e8f0"
    >
      <Image
        ref={setPreview}
        src={saved?.url}
        alt={saved?.alt ?? label}
        boxSize="full"
        objectFit="cover"
      />
      <IconButton
        type="button"
        aria-label={`${label}を削除`}
        title={`${label}を削除`}
        onClick={props.onRemove}
        disabled={props.disabled}
        position="absolute"
        top="6px"
        right="6px"
        minW="0"
        boxSize="22px"
        rounded="full"
        bg="#0f172a"
        color="white"
        _hover={{ bg: "#334155" }}
      >
        <FiX size={14} />
      </IconButton>
    </Box>
  );
}
