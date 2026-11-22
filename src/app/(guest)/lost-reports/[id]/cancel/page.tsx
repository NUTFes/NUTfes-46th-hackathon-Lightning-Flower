import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]/cancel">) {
  const { id } = await params;
  return <ScreenPlaceholder code="G08" title={`申請取り消し（id: ${id}）`} />;
}
