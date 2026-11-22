import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]/done">) {
  const { id } = await params;
  return <ScreenPlaceholder code="G04" title={`申請完了（id: ${id}）`} />;
}
