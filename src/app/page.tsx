import { Container, Heading, Text } from "@chakra-ui/react";

export default function Home() {
  return (
    <Container py="10">
      <Heading size="2xl">オトシル</Heading>
      <Text mt="2" color="fg.muted">
        技大祭の落とし物アプリ（開発中）
      </Text>
    </Container>
  );
}
