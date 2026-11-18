import {
  Briefcase, Car, Cpu, Dog, Dumbbell, Gift, GraduationCap, HardHat, Heart,
  Home, Hotel, Palette, PawPrint, Pill, Scale, Shirt, ShoppingCart, Sofa,
  Sparkles, Store, Tractor, UtensilsCrossed, Wrench, type LucideIcon,
} from "lucide-react";

type Estilo = { cor: string; Icone: LucideIcon; acao: string; pergunta: string };

const conversar = {
  acao: "Conversar no WhatsApp",
  pergunta: "Olá! Encontrei seu contato no Piracanjuba.ai e gostaria de mais informações.",
};
const produtos = {
  acao: "Consultar produtos",
  pergunta: "Olá! Vi a página no Piracanjuba.ai. Quais produtos estão disponíveis?",
};
const agenda = {
  acao: "Consultar horários",
  pergunta: "Olá! Vi a página no Piracanjuba.ai. Como posso consultar os horários de atendimento?",
};
const servico = {
  acao: "Consultar serviços",
  pergunta: "Olá! Vi a página no Piracanjuba.ai e gostaria de saber mais sobre os serviços.",
};
const categorias: Record<string, Estilo> = {
  Alimentação: { cor: "#742d21", Icone: UtensilsCrossed, ...conversar },
  Supermercados: { cor: "#274c37", Icone: ShoppingCart, ...produtos },
  Saúde: { cor: "#245359", Icone: Heart, ...conversar },
  "Beleza e Estética": { cor: "#71374c", Icone: Sparkles, ...conversar },
  "Farmácia e Drogaria": { cor: "#185952", Icone: Pill, ...conversar },
  Advogados: { cor: "#3b3c53", Icone: Scale, ...conversar },
  Educação: { cor: "#3d4272", Icone: GraduationCap, ...conversar },
  Esportes: { cor: "#264d3c", Icone: Dumbbell, ...conversar },
  Automotivo: { cor: "#283e50", Icone: Car, ...conversar },
  Agro: { cor: "#334829", Icone: Tractor, ...conversar },
  "Moda e Vestuário": { cor: "#593449", Icone: Shirt, ...produtos },
  "Materiais de Construção": { cor: "#70432b", Icone: HardHat, ...conversar },
  "Móveis e Decoração": { cor: "#5f493a", Icone: Sofa, ...conversar },
  "Pet Shop": { cor: "#735034", Icone: PawPrint, ...conversar },
  Veterinários: { cor: "#265253", Icone: Dog, ...agenda },
  "Personal Trainer": { cor: "#384d2b", Icone: Dumbbell, ...agenda },
  Imobiliário: { cor: "#4d453b", Icone: Home, ...conversar },
  "Hospedagem e Turismo": { cor: "#295286", Icone: Hotel, ...conversar },
  "Papelaria e Presentes": { cor: "#714434", Icone: Gift, ...produtos },
  Artesanato: { cor: "#73533a", Icone: Palette, ...conversar },
  "Serviços Gerais": { cor: "#324953", Icone: Wrench, ...servico },
  "Serviços Especializados": { cor: "#35495b", Icone: Briefcase, ...servico },
  Tecnologia: { cor: "#37456a", Icone: Cpu, ...conversar },
};
const padrao: Estilo = { cor: "#26483e", Icone: Store, ...conversar };
export function estiloDaCategoria(categoria: string): Estilo {
  return categorias[categoria] ?? padrao;
}
