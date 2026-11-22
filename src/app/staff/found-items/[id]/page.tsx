import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/staff/found-items/[id]">) {
  const { id } = await params;
  return <ScreenPlaceholder code="M04" title={`拾得物詳細（id: ${id}）`} />;
}
