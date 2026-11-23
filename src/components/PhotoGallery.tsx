"use client";

import { Box, Center, Flex, Icon, IconButton, Text } from "@chakra-ui/react";
import Image from "next/image";
import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiImage } from "react-icons/fi";
import type { Photo } from "./ItemThumbnail";

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const index = Math.min(currentIndex, Math.max(0, photos.length - 1));
  const photo = photos[index];

  return (
    <Box
      position="relative"
      h="200px"
      overflow="hidden"
      rounded="lg"
      bg="gray.100"
    >
      {photo?.url ? (
        <Image
          src={photo.url}
          alt={photo.alt ?? `登録写真 ${index + 1}`}
          fill
          sizes="(max-width: 480px) 100vw, 50vw"
          unoptimized
          style={{ objectFit: "contain" }}
        />
      ) : (
        <Center h="full" flexDirection="column" gap="2" color="gray.500">
          <Icon boxSize="6">
            <FiImage />
          </Icon>
          <Text fontSize="sm">写真なし</Text>
        </Center>
      )}
      {photo && (
        <Flex
          position="absolute"
          bottom="3"
          insetInline="3"
          align="center"
          justify="center"
          gap="2"
        >
          {photos.length > 1 && (
            <IconButton
              aria-label="前の写真"
              size="sm"
              variant="solid"
              colorPalette="gray"
              disabled={index === 0}
              onClick={() => setCurrentIndex(index - 1)}
            >
              <FiChevronLeft />
            </IconButton>
          )}
          <Text
            role="status"
            bg="white"
            color="gray.700"
            rounded="full"
            px="3"
            py="1"
            fontSize="xs"
          >
            登録写真 ({index + 1}/{photos.length})
          </Text>
          {photos.length > 1 && (
            <IconButton
              aria-label="次の写真"
              size="sm"
              variant="solid"
              colorPalette="gray"
              disabled={index === photos.length - 1}
              onClick={() => setCurrentIndex(index + 1)}
            >
              <FiChevronRight />
            </IconButton>
          )}
        </Flex>
      )}
    </Box>
  );
}
