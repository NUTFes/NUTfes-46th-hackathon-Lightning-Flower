import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/staff/found-items/[id]/done">) {
  const { id } = await params;
  return <ScreenPlaceholder code="M03" title={`登録完了（id: ${id}）`} />;
}
