import { MatchingScreen } from "./MatchingScreen";

export default async function Page({
  params,
}: PageProps<"/admin/lost-reports/[id]">) {
  const { id } = await params;
  return <MatchingScreen key={id} id={id} />;
}
