import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/admin/lost-reports/[id]">) {
  const { id } = await params;
  return <ScreenPlaceholder code="A05" title={`照合画面（id: ${id}）`} />;
}
