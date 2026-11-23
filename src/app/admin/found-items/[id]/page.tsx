import { FoundItemDetail } from "./FoundItemDetail";

export default async function Page({
  params,
}: PageProps<"/admin/found-items/[id]">) {
  const { id } = await params;
  return <FoundItemDetail key={id} id={id} />;
}
