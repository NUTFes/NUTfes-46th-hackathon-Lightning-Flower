import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]/pickup">) {
  const { id } = await params;
  return <ScreenPlaceholder code="G07" title={`受け取り方法（id: ${id}）`} />;
}
