import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]/chat">) {
  const { id } = await params;
  return <ScreenPlaceholder code="G06" title={`チャット（id: ${id}）`} />;
}
