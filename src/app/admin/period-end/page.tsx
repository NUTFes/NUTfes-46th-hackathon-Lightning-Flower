import { Heading, Stack } from "@chakra-ui/react";
import { PeriodEndScreen } from "./PeriodEndScreen";

// A07 期間終了処理。データは PeriodEndScreen（Client Component）が API から取る
export default function Page() {
  return (
    <Stack gap="6" py="6">
      <Heading as="h1" size="2xl" pb="3" borderBottomWidth="1px">
        期間終了処理
      </Heading>
      <PeriodEndScreen />
    </Stack>
  );
}
