import { redirect } from "next/navigation";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string }>;
}) {
  const { slug, groupSlug } = await params;
  redirect(`/t/${slug}/groups/${groupSlug}/chat`);
}
