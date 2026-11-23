import { Box, Heading, Text, Timeline } from "@chakra-ui/react";
import { StatusBadge, type LostReportStatus } from "./StatusBadge";

const steps = [
  "遺失物申請を受付",
  "一致しそうな物が見つかりました",
  "受け取り方法の確認",
  "受け取り",
];

const reachedStep = {
  searching: 0,
  maybe_found: 1,
  awaiting_handover: 2,
  resolved: 3,
} as const;

const terminalMessages = {
  transferred_to_police: "拾得物は警察へ移管されました。",
  disposed: "拾得物は処分されました。",
  cancelled: "この申請は取り消されました。",
} as const;

export function ReportProgress({ status }: { status: LostReportStatus }) {
  const isTerminal =
    status === "transferred_to_police" ||
    status === "disposed" ||
    status === "cancelled";

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" rounded="lg" p="4">
      <Heading as="h2" size="sm" mb="3">
        現在の状況
      </Heading>
      {isTerminal ? (
        <>
          <StatusBadge kind="lost" status={status} />
          <Text mt="2" fontSize="sm" color="gray.600">
            {terminalMessages[status]}
          </Text>
        </>
      ) : (
        <Timeline.Root as="ol" size="md" variant="plain">
          {steps.map((label, index) => {
            const reached = index <= reachedStep[status];
            return (
              <Timeline.Item
                as="li"
                key={label}
                alignItems="center"
                gap="2"
                py="1"
                aria-current={
                  index === reachedStep[status] ? "step" : undefined
                }
              >
                <Timeline.Connector
                  aria-hidden="true"
                  display="flex"
                  alignItems="center"
                >
                  <Timeline.Indicator
                    boxSize="2.5"
                    bg={reached ? "blue.600" : "white"}
                    borderWidth="1px"
                    borderColor={reached ? "blue.600" : "gray.300"}
                  />
                </Timeline.Connector>
                <Timeline.Content pb="0">
                  <Timeline.Title color={reached ? "gray.900" : "gray.500"}>
                    {label}
                  </Timeline.Title>
                </Timeline.Content>
              </Timeline.Item>
            );
          })}
        </Timeline.Root>
      )}
    </Box>
  );
}
