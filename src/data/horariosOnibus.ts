export type BusSource = { name: string; url: string };
export type BusDestination = {
  id: string;
  name: string;
  state: string;
  clickbusSlug: string;
  mobifacilSlug?: string;
};
export type BusOperator = {
  id: string;
  name: string;
  website: string;
  phones: { label: string; number: string }[];
  note?: string;
};
export type BusDeparture = {
  id: string;
  date: string;
  destinationId: string;
  operatorId: string;
  departure: string;
  arrival: string;
  arrivalDate: string;
  durationMinutes: number;
  serviceClasses: string[];
  boarding: { name: string; address?: string; verified: boolean };
  stops: { name: string; time: string }[];
  alighting?: { name: string; address?: string };
  connections?: { city: string; arrival: string; departure: string; operator: string }[];
  sources: BusSource[];
  checkedAt: string;
};

export const BUS_CHECKED_AT = "2026-09-08";
export const BUS_SNAPSHOT_DATE = "2026-09-10";
export const BUS_TIME_ZONE = "America/Sao_Paulo";
export const BUS_DESTINATIONS: BusDestination[] = [
  { id: "goiania", name: "Goiânia", state: "GO", clickbusSlug: "goiania-go", mobifacilSlug: "goiania-go" },
  { id: "caldas-novas", name: "Caldas Novas", state: "GO", clickbusSlug: "caldas-novas-go" },
  { id: "araguari", name: "Araguari", state: "MG", clickbusSlug: "araguari-menegon-mg" },
  { id: "uberlandia", name: "Uberlândia", state: "MG", clickbusSlug: "uberlandia-mg" },
];
export const BUS_OPERATORS: BusOperator[] = [
  { id: "uniao", name: "Expresso União", website: "https://www.expressouniao.com.br/", phones: [{label: "Agência de Piracanjuba", number: "6434051306"}, {label: "Agência de Piracanjuba", number: "6434055803"}], note: "Contatos publicados pela própria transportadora. Confirme o ponto de embarque da sua viagem." },
  { id: "real", name: "Real Expresso", website: "https://viajeguanabara.com.br/viacao/real-expresso/", phones: [{label: "Atendimento Guanabara", number: "08007281992"}], note: "Guichê cadastrado na Rua Cônego Olinto, s/n. Atendimento das 08:00 às 18:00, de segunda a domingo." },
  { id: "marly", name: "Expresso Marly", website: "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go", phones: [], note: "Consulte os detalhes da empresa e da viagem no canal de venda." },
  { id: "roderotas", name: "RodeRotas", website: "https://www.roderotas.com/", phones: [{label: "Atendimento RodeRotas",number:"08009408090"}], note: "Marca comercial que inclui Rotas de Viação do Triângulo. Confira destino e ponto de embarque na consulta." },
];

export function isBusDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getBrazilDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function getInitialBusDate(now: Date): string {
  const today = getBrazilDate(now);
  return today > BUS_SNAPSHOT_DATE ? today : BUS_SNAPSHOT_DATE;
}

export function getBusSearchUrl(destinationId: string, date: string, provider: "clickbus" | "mobifacil" = "clickbus"): string | null {
  const destination = BUS_DESTINATIONS.find((item) => item.id === destinationId);
  if (!destination || !isBusDate(date)) return null;
  if (provider === "mobifacil") {
    if (!destination.mobifacilSlug) return null;
    const [year, month, day] = date.split("-");
    return `https://www.mobifacil.com.br/passagem-de-onibus/piracanjuba-go/${destination.mobifacilSlug}?date=${day}-${month}-${year}`;
  }
  return `https://www.clickbus.com.br/onibus/piracanjuba-go/${destination.clickbusSlug}?departureDate=${date}`;
}

export function isBusDeparturePast(departure: BusDeparture, now: Date): boolean {
  return new Date(`${departure.date}T${departure.departure}:00-03:00`).getTime() <= now.getTime();
}

export function getBusDepartures(date: string, destinationId = "all", operatorId = "all"): BusDeparture[] {
  if (!isBusDate(date)) return [];
  return BUS_DEPARTURES.filter((item) => item.date === date && (destinationId === "all" || item.destinationId === destinationId) && (operatorId === "all" || item.operatorId === operatorId)).sort((a, b) => a.departure.localeCompare(b.departure) || a.destinationId.localeCompare(b.destinationId));
}

// Consulta pontual. Cada registro vale somente para a data indicada.
// Classes com a mesma empresa, destino e horários foram agrupadas.
export const BUS_DEPARTURES: BusDeparture[] = [
  {
    "id": "marly-goiania-20260910-0800",
    "date": "2026-09-10",
    "destinationId": "goiania",
    "operatorId": "marly",
    "departure": "08:00",
    "arrival": "09:30",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 90,
    "serviceClasses": [
      "Convencional",
      "Leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "marly-goiania-20260910-1100",
    "date": "2026-09-10",
    "destinationId": "goiania",
    "operatorId": "marly",
    "departure": "11:00",
    "arrival": "12:30",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 90,
    "serviceClasses": [
      "Convencional",
      "Leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "uniao-goiania-20260910-1315",
    "date": "2026-09-10",
    "destinationId": "goiania",
    "operatorId": "uniao",
    "departure": "13:15",
    "arrival": "15:00",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 105,
    "serviceClasses": [
      "Convencional"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-10"
      },
      {
        "name": "Mobifácil / Expresso União",
        "url": "https://www.mobifacil.com.br/passagem-de-onibus/piracanjuba-go/goiania-go?date=10-09-2026&institutionSource=expresso-uniao"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "marly-goiania-20260910-1330",
    "date": "2026-09-10",
    "destinationId": "goiania",
    "operatorId": "marly",
    "departure": "13:30",
    "arrival": "15:00",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 90,
    "serviceClasses": [
      "Convencional",
      "Leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "real-goiania-20260910-1550",
    "date": "2026-09-10",
    "destinationId": "goiania",
    "operatorId": "real",
    "departure": "15:50",
    "arrival": "17:30",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 100,
    "serviceClasses": [
      "Convencional"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "address": "Rua Cônego Olinto, Piracanjuba, GO, CEP 75640-000",
      "verified": true
    },
    "stops": [
      {
        "name": "Hidrolândia",
        "time": "16:35"
      },
      {
        "name": "Aparecida de Goiânia",
        "time": "17:00"
      }
    ],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08",
    "alighting": {
      "name": "Rodoviária de Goiânia",
      "address": "Rua 44, 399, Goiânia, GO"
    }
  },
  {
    "id": "marly-goiania-20260910-1930",
    "date": "2026-09-10",
    "destinationId": "goiania",
    "operatorId": "marly",
    "departure": "19:30",
    "arrival": "21:00",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 90,
    "serviceClasses": [
      "Convencional",
      "Leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "marly-caldas-novas-20260910-0815",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "marly",
    "departure": "08:15",
    "arrival": "09:40",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 85,
    "serviceClasses": [
      "Convencional"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "marly-caldas-novas-20260910-0820",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "marly",
    "departure": "08:20",
    "arrival": "09:40",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 80,
    "serviceClasses": [
      "Leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "uniao-caldas-novas-20260910-0915",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "uniao",
    "departure": "09:15",
    "arrival": "10:30",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 75,
    "serviceClasses": [
      "Convencional"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "real-caldas-novas-20260910-1215",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "real",
    "departure": "12:15",
    "arrival": "13:30",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 75,
    "serviceClasses": [
      "Convencional"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "address": "Rua Cônego Olinto, Piracanjuba, GO, CEP 75640-000",
      "verified": true
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08",
    "alighting": {
      "name": "Rodoviária de Caldas Novas",
      "address": "Rua Ernesto Shinona, 1, Caldas Novas, GO"
    }
  },
  {
    "id": "marly-caldas-novas-20260910-1300",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "marly",
    "departure": "13:00",
    "arrival": "14:25",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 85,
    "serviceClasses": [
      "Convencional"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "marly-caldas-novas-20260910-1305",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "marly",
    "departure": "13:05",
    "arrival": "14:25",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 80,
    "serviceClasses": [
      "Leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "marly-caldas-novas-20260910-1600",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "marly",
    "departure": "16:00",
    "arrival": "17:25",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 85,
    "serviceClasses": [
      "Convencional"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "marly-caldas-novas-20260910-1605",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "marly",
    "departure": "16:05",
    "arrival": "17:25",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 80,
    "serviceClasses": [
      "Leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "marly-caldas-novas-20260910-1900",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "marly",
    "departure": "19:00",
    "arrival": "20:25",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 85,
    "serviceClasses": [
      "Convencional"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "marly-caldas-novas-20260910-1905",
    "date": "2026-09-10",
    "destinationId": "caldas-novas",
    "operatorId": "marly",
    "departure": "19:05",
    "arrival": "20:25",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 80,
    "serviceClasses": [
      "Leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "roderotas-uberlandia-20260910-1130",
    "date": "2026-09-10",
    "destinationId": "uberlandia",
    "operatorId": "roderotas",
    "departure": "11:30",
    "arrival": "17:50",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 380,
    "serviceClasses": [
      "Semi-leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/uberlandia-mg?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  },
  {
    "id": "uniao-araguari-20260910-0915",
    "date": "2026-09-10",
    "destinationId": "araguari",
    "operatorId": "uniao",
    "departure": "09:15",
    "arrival": "13:55",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 280,
    "serviceClasses": [
      "Convencional (1º trecho)",
      "2º trecho: confirmar categoria"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "address": "Rua Cônego Olinto, Piracanjuba, GO, CEP 75640-000",
      "verified": true
    },
    "stops": [],
    "alighting": {
      "name": "Churrascaria Menegon",
      "address": "BR-050, km 41, Araguari, MG, CEP 38446-392"
    },
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/araguari-menegon-mg?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08",
    "connections": [
      {
        "city": "Caldas Novas",
        "arrival": "10:30",
        "departure": "11:30",
        "operator": "Expresso União"
      }
    ]
  },
  {
    "id": "roderotas-araguari-20260910-1130",
    "date": "2026-09-10",
    "destinationId": "araguari",
    "operatorId": "roderotas",
    "departure": "11:30",
    "arrival": "16:50",
    "arrivalDate": "2026-09-10",
    "durationMinutes": 320,
    "serviceClasses": [
      "Semi-leito"
    ],
    "boarding": {
      "name": "Embarque em Piracanjuba",
      "verified": false
    },
    "stops": [],
    "alighting": {
      "name": "Churrascaria Menegon",
      "address": "BR-050, km 41, Araguari, MG, CEP 38446-392"
    },
    "sources": [
      {
        "name": "ClickBus",
        "url": "https://www.clickbus.com.br/onibus/piracanjuba-go/araguari-menegon-mg?departureDate=2026-09-10"
      }
    ],
    "checkedAt": "2026-09-08"
  }
];
