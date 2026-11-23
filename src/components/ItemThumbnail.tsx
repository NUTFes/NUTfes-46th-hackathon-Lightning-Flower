import { Box, Center, Icon, Text } from "@chakra-ui/react";
import Image from "next/image";
import { FiImage } from "react-icons/fi";

export type Photo = { id: string; url: string; alt?: string };

const sizes = { sm: 48, md: 80, lg: 112 };
type ItemThumbnailProps = {
  photo?: Photo;
  size: keyof typeof sizes;
  alt: string;
};

export function ItemThumbnail({ photo, size, alt }: ItemThumbnailProps) {
  const pixels = sizes[size];

  return (
    <Box
      position="relative"
      boxSize={`${pixels}px`}
      flexShrink={0}
      overflow="hidden"
      rounded="md"
      bg="gray.100"
    >
      {photo?.url ? (
        <Image
          src={photo.url}
          alt={photo.alt ?? alt}
          fill
          sizes={`${pixels}px`}
          unoptimized
          style={{ objectFit: "cover" }}
        />
      ) : (
        <Center h="full" flexDirection="column" gap="0.5" color="gray.500">
          <Icon boxSize="4">
            <FiImage />
          </Icon>
          <Text fontSize="xs">写真なし</Text>
        </Center>
      )}
    </Box>
  );
}
