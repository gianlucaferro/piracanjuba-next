import {
  Briefcase, Car, Cpu, Dog, Dumbbell, Flame, Gift, GraduationCap, HardHat, Heart,
  Home, Hotel, Palette, PawPrint, Pill, Scale, Shirt, ShoppingBag, ShoppingCart,
  Sofa, Sparkles, Store, Ticket, Tractor, UtensilsCrossed, Wrench, type LucideIcon,
} from "lucide-react";

type Estilo = {
  cor: string;
  Icone: LucideIcon;
  composicao: "editorial" | "atelier" | "tecnica" | "natural";
  pergunta?: string;
};

const produtos = "Olá! Vi a página no Piracanjuba.ai. Quais produtos estão disponíveis?";
const agenda = "Olá! Vi a página no Piracanjuba.ai. Como posso consultar os horários de atendimento?";
const servicos = "Olá! Vi a página no Piracanjuba.ai e gostaria de saber mais sobre os serviços.";
const categorias: Record<string, Estilo> = {
  Alimentação: { cor: "#742d21", Icone: UtensilsCrossed, composicao: "editorial" },
  Supermercados: { cor: "#274c37", Icone: ShoppingCart, composicao: "natural", pergunta: produtos },
  Saúde: { cor: "#245359", Icone: Heart, composicao: "natural" },
  "Beleza e Estética": { cor: "#71374c", Icone: Sparkles, composicao: "atelier" },
  "Farmácia e Drogaria": { cor: "#185952", Icone: Pill, composicao: "natural" },
  Advogados: { cor: "#3b3c53", Icone: Scale, composicao: "editorial" },
  Educação: { cor: "#3d4272", Icone: GraduationCap, composicao: "editorial" },
  Esportes: { cor: "#264d3c", Icone: Dumbbell, composicao: "tecnica" },
  Automotivo: { cor: "#283e50", Icone: Car, composicao: "tecnica" },
  Agro: { cor: "#334829", Icone: Tractor, composicao: "natural" },
  "Moda e Vestuário": { cor: "#593449", Icone: Shirt, composicao: "atelier", pergunta: produtos },
  "Materiais de Construção": { cor: "#70432b", Icone: HardHat, composicao: "tecnica" },
  "Móveis e Decoração": { cor: "#5f493a", Icone: Sofa, composicao: "editorial" },
  "Pet Shop": { cor: "#735034", Icone: PawPrint, composicao: "natural" },
  Veterinários: { cor: "#265253", Icone: Dog, composicao: "natural", pergunta: agenda },
  "Personal Trainer": { cor: "#384d2b", Icone: Dumbbell, composicao: "tecnica", pergunta: agenda },
  Imobiliário: { cor: "#4d453b", Icone: Home, composicao: "editorial" },
  "Hospedagem e Turismo": { cor: "#295286", Icone: Hotel, composicao: "editorial" },
  "Papelaria e Presentes": { cor: "#714434", Icone: Gift, composicao: "atelier", pergunta: produtos },
  Artesanato: { cor: "#73533a", Icone: Palette, composicao: "atelier" },
  "Serviços Gerais": { cor: "#324953", Icone: Wrench, composicao: "tecnica", pergunta: servicos },
  "Serviços Especializados": { cor: "#35495b", Icone: Briefcase, composicao: "tecnica", pergunta: servicos },
  Tecnologia: { cor: "#37456a", Icone: Cpu, composicao: "tecnica" },
  Bazar: { cor: "#66463a", Icone: ShoppingBag, composicao: "atelier", pergunta: produtos },
  Lotérica: { cor: "#265448", Icone: Ticket, composicao: "tecnica" },
  "Distribuição de gás": { cor: "#69462e", Icone: Flame, composicao: "tecnica" },
  "Comércio local": { cor: "#394e52", Icone: Store, composicao: "editorial" },
  "Artigos esportivos": { cor: "#315647", Icone: Dumbbell, composicao: "tecnica", pergunta: produtos },
};

const padrao: Estilo = { cor: "#26483e", Icone: Store, composicao: "editorial" };

export function estiloDaCategoria(categoria: string): Estilo {
  return categorias[categoria] ?? padrao;
}
