import { AdminTournament } from "@/components/admin-tournament";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminTournament id={id} />; }
