import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/admin/found-items/[id]">) {
  const { id } = await params;
  return (
    <ScreenPlaceholder code="A03" title={`拾得物詳細・直接返却（id: ${id}）`} />
  );
}
