import { Heading, Stack } from "@chakra-ui/react";
import { SettingsScreen } from "./SettingsScreen";

// A08 設定。ログインしている人の情報は SettingsScreen（Client Component）が API から取る
export default function Page() {
  return (
    <Stack gap="6" py="6">
      <Heading as="h1" size="2xl" pb="3" borderBottomWidth="1px">
        設定
      </Heading>
      <SettingsScreen />
    </Stack>
  );
}
