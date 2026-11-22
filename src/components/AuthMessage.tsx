import { Container, Heading, Text } from "@chakra-ui/react";

// ログインしていない・権限がないときに、画面の代わりに出す
export function AuthMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Container maxW="md" py="16">
      <Heading size="lg">{title}</Heading>
      <Text mt="3" color="fg.muted">
        {description}
      </Text>
    </Container>
  );
}
