"use client";

import { Flex, Stack, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
import type { Photo } from "./ItemThumbnail";
import { PhotoUploadTile } from "./PhotoUploadTile";

type UploadPhoto = Photo | File;

type PhotoUploaderProps = {
  value: readonly UploadPhoto[];
  onChange: (value: UploadPhoto[]) => void;
  max?: number;
  required: boolean;
  requiredHint?: string;
  uploading?: boolean;
  error?: string;
  disabled?: boolean;
};

export function PhotoUploader({
  value,
  onChange,
  max,
  required,
  requiredHint,
  uploading = false,
  error,
  disabled = false,
}: PhotoUploaderProps) {
  const input = useRef<HTMLInputElement>(null);
  const [selectionError, setSelectionError] = useState<string>();
  const busy = disabled || uploading;
  const remaining =
    max === undefined ? Infinity : Math.max(0, max - value.length);
  const visibleError = error ?? selectionError;

  function addPhotos(files: File[]) {
    if (busy || files.length === 0) return;
    const images = files.filter((file) => file.type.startsWith("image/"));
    setSelectionError(
      images.length !== files.length
        ? "画像ファイルを選択してください。"
        : images.length > remaining
          ? `写真は最大${max}枚まで追加できます。`
          : undefined,
    );
    const added = images.slice(0, remaining);
    if (added.length > 0) onChange([...value, ...added]);
  }

  return (
    <Stack
      gap="2"
      role="group"
      aria-label={required ? "写真（必須）" : "写真"}
      aria-busy={uploading}
    >
      <Text fontSize="13px" color="#0f172a" fontWeight="bold">
        写真{" "}
        {required && (
          <Text as="span" color="#dc2626">
            必須
          </Text>
        )}
      </Text>
      {requiredHint && (
        <Text fontSize="xs" color="#64748b">
          {requiredHint}
        </Text>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        disabled={busy || remaining === 0}
        hidden
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          addPhotos(files);
        }}
      />
      <Flex gap="3" wrap="wrap">
        {value.map((photo, index) => (
          <PhotoUploadTile
            key={`${"id" in photo ? photo.id : photo.name}-${index}`}
            photo={photo}
            index={index}
            disabled={busy}
            onRemove={() => {
              setSelectionError(undefined);
              onChange(value.filter((_, candidate) => candidate !== index));
            }}
          />
        ))}
        {remaining > 0 && (
          <PhotoUploadTile
            onAdd={() => input.current?.click()}
            disabled={busy}
          />
        )}
      </Flex>
      {uploading && (
        <Text role="status" fontSize="xs">
          アップロード中…
        </Text>
      )}
      {visibleError && (
        <Text role="alert" color="#b42318" fontSize="xs">
          {visibleError}
        </Text>
      )}
    </Stack>
  );
}
