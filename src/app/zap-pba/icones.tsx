import type { ComponentType } from "react";
import {
  Briefcase,
  Car,
  ChevronRight,
  Cpu,
  Dog,
  Dumbbell,
  Flame,
  Gift,
  GraduationCap,
  HardHat,
  Heart,
  Home,
  Hotel,
  MessageSquare,
  MoreHorizontal,
  Palette,
  PawPrint,
  PersonStanding,
  Pill,
  Scale,
  Share2,
  Shirt,
  ShoppingCart,
  Sofa,
  Sparkles,
  Store,
  Tractor,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

// Os ícones que se repetem em cada cartão do Zap PBA são declarados uma vez, como
// <symbol>, e reaproveitados por <use>. Desenhados inline, eles somavam cerca de
// 3 KB por cartão (1,3 MB dos 2,47 MB da página em 2026-11-19).

export const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Alimentação: UtensilsCrossed,
  Supermercados: ShoppingCart,
  Saúde: Heart,
  "Beleza e Estética": Sparkles,
  "Farmácia e Drogaria": Pill,
  Advogados: Scale,
  Educação: GraduationCap,
  Esportes: Dumbbell,
  Automotivo: Car,
  Agro: Tractor,
  "Moda e Vestuário": Shirt,
  "Serviços Especializados": Briefcase,
  "Materiais de Construção": HardHat,
  "Móveis e Decoração": Sofa,
  "Pet Shop": PawPrint,
  Veterinários: Dog,
  "Personal Trainer": PersonStanding,
  Imobiliário: Home,
  "Hospedagem e Turismo": Hotel,
  "Papelaria e Presentes": Gift,
  Artesanato: Palette,
  "Serviços Gerais": Wrench,
  Tecnologia: Cpu,
  Outros: MoreHorizontal,
};

const CATEGORIAS_COM_ICONE = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICONS[category] || Store;
  return <Icon className={className} />;
}

export const ICONE_ZAP = {
  whatsapp: "zap-i-wa",
  compartilhar: "zap-i-compartilhar",
  sugerir: "zap-i-sugerir",
  contatos: "zap-i-contatos",
  detalhes: "zap-i-detalhes",
} as const;

const ICONE_SEM_CATEGORIA = "zap-c-loja";

export function idIconeCategoria(categoria: string): string {
  const indice = CATEGORIAS_COM_ICONE.indexOf(categoria);
  return indice === -1 ? ICONE_SEM_CATEGORIA : `zap-c-${indice}`;
}

export function UsoIcone({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}

// O desenho fica num <svg> aninhado dentro do <symbol>: o stroke="currentColor" do
// lucide passa a usar a cor de quem faz o <use>, como antes.
export function SpriteZap({ categorias }: { categorias: readonly string[] }) {
  const ids = new Set(categorias.map(idIconeCategoria));
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
    >
      <symbol id={ICONE_ZAP.whatsapp} viewBox="0 0 24 24">
        <WhatsAppIcon />
      </symbol>
      <symbol id={ICONE_ZAP.compartilhar} viewBox="0 0 24 24">
        <Share2 />
      </symbol>
      <symbol id={ICONE_ZAP.sugerir} viewBox="0 0 24 24">
        <MessageSquare />
      </symbol>
      <symbol id={ICONE_ZAP.contatos} viewBox="0 0 24 24">
        <Flame />
      </symbol>
      <symbol id={ICONE_ZAP.detalhes} viewBox="0 0 24 24">
        <ChevronRight />
      </symbol>
      {CATEGORIAS_COM_ICONE.map((categoria) => {
        const id = idIconeCategoria(categoria);
        if (!ids.has(id)) return null;
        const Icon = CATEGORY_ICONS[categoria];
        return (
          <symbol key={id} id={id} viewBox="0 0 24 24">
            <Icon />
          </symbol>
        );
      })}
      {ids.has(ICONE_SEM_CATEGORIA) && (
        <symbol id={ICONE_SEM_CATEGORIA} viewBox="0 0 24 24">
          <Store />
        </symbol>
      )}
    </svg>
  );
}
