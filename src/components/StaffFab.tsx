
import { IconButton } from "@chakra-ui/react";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";

type StaffFabProps = {
  href: string;
  label: string;
};

export function StaffFab({ href, label }: StaffFabProps) {
  return (
    <IconButton
      asChild
      aria-label={label}
      position="fixed"
      bottom="24px"
      right="24px"
      boxSize="66px"
      borderRadius="full"
      bg="blue.500"
      color="white"
      boxShadow="lg"
      zIndex="10"
      _hover={{ bg: "blue.600" }}
    >
      <Link href={href}>
        <FiPlus size={44} strokeWidth={3} />
      </Link>
    </IconButton>
  );
}
