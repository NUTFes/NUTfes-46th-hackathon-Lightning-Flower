import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]">) {
  const { id } = await params;
  return <ScreenPlaceholder code="G05" title={`申請状況（id: ${id}）`} />;
}
