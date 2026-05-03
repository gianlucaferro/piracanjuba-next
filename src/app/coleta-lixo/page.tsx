import { pageMetadata } from "@/lib/seo";
import ColetaLixoClient from "./ColetaLixoClient";

export const metadata = pageMetadata({
  title: "Coleta de Lixo em Piracanjuba GO",
  description:
    "Dias e horários da coleta de lixo comum e seletiva por bairro em Piracanjuba, Goiás. Saiba quando colocar o lixo na rua e qual saco usar.",
  path: "/coleta-lixo",
});

export default function ColetaLixoPage() {
  return <ColetaLixoClient />;
}
