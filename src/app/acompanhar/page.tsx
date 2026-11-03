import { pageMetadata } from "@/lib/seo";
import FollowingClient from "./FollowingClient";

export const metadata = pageMetadata({ title: "Favoritos e avisos", description: "Acompanhe os serviços e dados públicos de Piracanjuba que interessam a você.", path: "/acompanhar", noIndex: true });

export default function FollowingPage() { return <FollowingClient />; }
