// Gerado do dataset oficial PNTP 2025 (ATRICON): dados_pntp_2025.zip -> avaliacoes_pntp_2025.xlsx. Atualizar anualmente.

export interface PoderNota { indice: number; nivel: string; essenciais: number | null; posicao: number; total: number }
export interface RankingItem { pos: number; mun: string; idx: number; niv: string }

export const NOTA_PNTP = {
  "ano": 2025,
  "executivo": {
    "indice": 0.5424,
    "nivel": "Intermediário",
    "essenciais": 0.6061,
    "posicao": 231,
    "total": 246
  },
  "legislativo": {
    "indice": 0.6564,
    "nivel": "Intermediário",
    "essenciais": 0.4286,
    "posicao": 181,
    "total": 246
  },
  "contexto": {
    "mediaExec": 0.7723,
    "mediaLeg": 0.667,
    "primeiroExec": {
      "mun": "Montes Claros de Goiás",
      "indice": 0.9689
    },
    "primeiroLeg": {
      "mun": "Santa Helena de Goiás",
      "indice": 0.9344
    },
    "niveisExec": [
      {
        "nivel": "Diamante",
        "count": 1
      },
      {
        "nivel": "Ouro",
        "count": 8
      },
      {
        "nivel": "Prata",
        "count": 10
      },
      {
        "nivel": "Elevado",
        "count": 155
      },
      {
        "nivel": "Intermediário",
        "count": 62
      },
      {
        "nivel": "Básico",
        "count": 4
      },
      {
        "nivel": "Inicial",
        "count": 1
      },
      {
        "nivel": "Inexistente",
        "count": 1
      },
      {
        "nivel": "Não Avaliado",
        "count": 4
      }
    ],
    "vizinhosExec": [
      {
        "pos": 228,
        "mun": "Aparecida de Goiânia",
        "idx": 0.5685,
        "niv": "Intermediário"
      },
      {
        "pos": 229,
        "mun": "Anhanguera",
        "idx": 0.5615,
        "niv": "Intermediário"
      },
      {
        "pos": 230,
        "mun": "Trombas",
        "idx": 0.5481,
        "niv": "Intermediário"
      },
      {
        "pos": 231,
        "mun": "Piracanjuba",
        "idx": 0.5424,
        "niv": "Intermediário"
      },
      {
        "pos": 232,
        "mun": "Corumbaíba",
        "idx": 0.5385,
        "niv": "Intermediário"
      },
      {
        "pos": 233,
        "mun": "Planaltina",
        "idx": 0.5285,
        "niv": "Intermediário"
      },
      {
        "pos": 234,
        "mun": "Três Ranchos",
        "idx": 0.5244,
        "niv": "Intermediário"
      }
    ]
  },
  "rankingExec": [
    {
      "pos": 1,
      "mun": "Montes Claros de Goiás",
      "idx": 0.9689,
      "niv": "Elevado"
    },
    {
      "pos": 2,
      "mun": "Cabeceiras",
      "idx": 0.9558,
      "niv": "Elevado"
    },
    {
      "pos": 3,
      "mun": "Baliza",
      "idx": 0.9557,
      "niv": "Elevado"
    },
    {
      "pos": 4,
      "mun": "Jaraguá",
      "idx": 0.9542,
      "niv": "Elevado"
    },
    {
      "pos": 5,
      "mun": "Goiânia",
      "idx": 0.9541,
      "niv": "Diamante"
    },
    {
      "pos": 6,
      "mun": "Goiatuba",
      "idx": 0.9492,
      "niv": "Ouro"
    },
    {
      "pos": 7,
      "mun": "Britânia",
      "idx": 0.9345,
      "niv": "Elevado"
    },
    {
      "pos": 8,
      "mun": "Chapadão do Céu",
      "idx": 0.9337,
      "niv": "Elevado"
    },
    {
      "pos": 9,
      "mun": "Arenópolis",
      "idx": 0.9315,
      "niv": "Elevado"
    },
    {
      "pos": 10,
      "mun": "Pirenópolis",
      "idx": 0.9297,
      "niv": "Elevado"
    },
    {
      "pos": 11,
      "mun": "Morrinhos",
      "idx": 0.9269,
      "niv": "Elevado"
    },
    {
      "pos": 12,
      "mun": "Serranópolis",
      "idx": 0.9221,
      "niv": "Elevado"
    },
    {
      "pos": 13,
      "mun": "Rio Verde",
      "idx": 0.9207,
      "niv": "Elevado"
    },
    {
      "pos": 14,
      "mun": "Inaciolândia",
      "idx": 0.9182,
      "niv": "Ouro"
    },
    {
      "pos": 15,
      "mun": "Padre Bernardo",
      "idx": 0.9141,
      "niv": "Elevado"
    },
    {
      "pos": 16,
      "mun": "Araçu",
      "idx": 0.9138,
      "niv": "Elevado"
    },
    {
      "pos": 17,
      "mun": "Professor Jamil",
      "idx": 0.9128,
      "niv": "Elevado"
    },
    {
      "pos": 18,
      "mun": "Indiara",
      "idx": 0.9103,
      "niv": "Elevado"
    },
    {
      "pos": 19,
      "mun": "Cavalcante",
      "idx": 0.9096,
      "niv": "Elevado"
    },
    {
      "pos": 20,
      "mun": "Goianápolis",
      "idx": 0.9094,
      "niv": "Elevado"
    },
    {
      "pos": 21,
      "mun": "Trindade",
      "idx": 0.9094,
      "niv": "Elevado"
    },
    {
      "pos": 22,
      "mun": "Itaberaí",
      "idx": 0.9088,
      "niv": "Elevado"
    },
    {
      "pos": 23,
      "mun": "Aurilândia",
      "idx": 0.9051,
      "niv": "Elevado"
    },
    {
      "pos": 24,
      "mun": "Niquelândia",
      "idx": 0.9047,
      "niv": "Elevado"
    },
    {
      "pos": 25,
      "mun": "Santa Rita do Novo Destino",
      "idx": 0.9004,
      "niv": "Ouro"
    },
    {
      "pos": 26,
      "mun": "Piranhas",
      "idx": 0.8993,
      "niv": "Ouro"
    },
    {
      "pos": 27,
      "mun": "Mambaí",
      "idx": 0.8991,
      "niv": "Elevado"
    },
    {
      "pos": 28,
      "mun": "Pontalina",
      "idx": 0.8969,
      "niv": "Elevado"
    },
    {
      "pos": 29,
      "mun": "Caldazinha",
      "idx": 0.8964,
      "niv": "Elevado"
    },
    {
      "pos": 30,
      "mun": "Ceres",
      "idx": 0.8945,
      "niv": "Ouro"
    },
    {
      "pos": 31,
      "mun": "Bonfinópolis",
      "idx": 0.8941,
      "niv": "Elevado"
    },
    {
      "pos": 32,
      "mun": "Mossâmedes",
      "idx": 0.8939,
      "niv": "Elevado"
    },
    {
      "pos": 33,
      "mun": "Ipameri",
      "idx": 0.8937,
      "niv": "Elevado"
    },
    {
      "pos": 34,
      "mun": "Abadia de Goiás",
      "idx": 0.8929,
      "niv": "Elevado"
    },
    {
      "pos": 35,
      "mun": "Rialma",
      "idx": 0.8917,
      "niv": "Elevado"
    },
    {
      "pos": 36,
      "mun": "Santa Helena de Goiás",
      "idx": 0.8908,
      "niv": "Elevado"
    },
    {
      "pos": 37,
      "mun": "Turvânia",
      "idx": 0.8857,
      "niv": "Elevado"
    },
    {
      "pos": 38,
      "mun": "Caiapônia",
      "idx": 0.8844,
      "niv": "Elevado"
    },
    {
      "pos": 39,
      "mun": "São Patrício",
      "idx": 0.8826,
      "niv": "Elevado"
    },
    {
      "pos": 40,
      "mun": "Itaguari",
      "idx": 0.882,
      "niv": "Elevado"
    },
    {
      "pos": 41,
      "mun": "Itapuranga",
      "idx": 0.8808,
      "niv": "Elevado"
    },
    {
      "pos": 42,
      "mun": "Cristianópolis",
      "idx": 0.8802,
      "niv": "Elevado"
    },
    {
      "pos": 43,
      "mun": "Diorama",
      "idx": 0.8783,
      "niv": "Elevado"
    },
    {
      "pos": 44,
      "mun": "Petrolina de Goiás",
      "idx": 0.8776,
      "niv": "Elevado"
    },
    {
      "pos": 45,
      "mun": "Amorinópolis",
      "idx": 0.8764,
      "niv": "Elevado"
    },
    {
      "pos": 46,
      "mun": "Bela Vista de Goiás",
      "idx": 0.8748,
      "niv": "Ouro"
    },
    {
      "pos": 47,
      "mun": "Itumbiara",
      "idx": 0.874,
      "niv": "Elevado"
    },
    {
      "pos": 48,
      "mun": "Minaçu",
      "idx": 0.8736,
      "niv": "Elevado"
    },
    {
      "pos": 49,
      "mun": "Cidade Ocidental",
      "idx": 0.8731,
      "niv": "Elevado"
    },
    {
      "pos": 50,
      "mun": "Turvelândia",
      "idx": 0.8731,
      "niv": "Elevado"
    },
    {
      "pos": 51,
      "mun": "Carmo do Rio Verde",
      "idx": 0.8723,
      "niv": "Elevado"
    },
    {
      "pos": 52,
      "mun": "Paraúna",
      "idx": 0.8717,
      "niv": "Elevado"
    },
    {
      "pos": 53,
      "mun": "Cromínia",
      "idx": 0.8692,
      "niv": "Elevado"
    },
    {
      "pos": 54,
      "mun": "Terezópolis de Goiás",
      "idx": 0.8683,
      "niv": "Elevado"
    },
    {
      "pos": 55,
      "mun": "Campo Alegre de Goiás",
      "idx": 0.8677,
      "niv": "Elevado"
    },
    {
      "pos": 56,
      "mun": "Caçu",
      "idx": 0.8672,
      "niv": "Elevado"
    },
    {
      "pos": 57,
      "mun": "Palestina de Goiás",
      "idx": 0.8663,
      "niv": "Elevado"
    },
    {
      "pos": 58,
      "mun": "Campestre de Goiás",
      "idx": 0.8661,
      "niv": "Elevado"
    },
    {
      "pos": 59,
      "mun": "Itarumã",
      "idx": 0.8661,
      "niv": "Elevado"
    },
    {
      "pos": 60,
      "mun": "Rubiataba",
      "idx": 0.8653,
      "niv": "Elevado"
    },
    {
      "pos": 61,
      "mun": "Damolândia",
      "idx": 0.8653,
      "niv": "Elevado"
    },
    {
      "pos": 62,
      "mun": "Silvânia",
      "idx": 0.8652,
      "niv": "Elevado"
    },
    {
      "pos": 63,
      "mun": "Jussara",
      "idx": 0.8644,
      "niv": "Elevado"
    },
    {
      "pos": 64,
      "mun": "Cachoeira Alta",
      "idx": 0.8627,
      "niv": "Elevado"
    },
    {
      "pos": 65,
      "mun": "Santa Fé de Goiás",
      "idx": 0.8624,
      "niv": "Elevado"
    },
    {
      "pos": 66,
      "mun": "Mimoso de Goiás",
      "idx": 0.8606,
      "niv": "Elevado"
    },
    {
      "pos": 67,
      "mun": "Gouvelândia",
      "idx": 0.8605,
      "niv": "Elevado"
    },
    {
      "pos": 68,
      "mun": "Quirinópolis",
      "idx": 0.8602,
      "niv": "Ouro"
    },
    {
      "pos": 69,
      "mun": "Santo Antônio da Barra",
      "idx": 0.858,
      "niv": "Elevado"
    },
    {
      "pos": 70,
      "mun": "Leopoldo de Bulhões",
      "idx": 0.8564,
      "niv": "Ouro"
    },
    {
      "pos": 71,
      "mun": "Porangatu",
      "idx": 0.8561,
      "niv": "Elevado"
    },
    {
      "pos": 72,
      "mun": "São João d'Aliança",
      "idx": 0.8561,
      "niv": "Elevado"
    },
    {
      "pos": 73,
      "mun": "Perolândia",
      "idx": 0.8537,
      "niv": "Elevado"
    },
    {
      "pos": 74,
      "mun": "Santa Rosa de Goiás",
      "idx": 0.8535,
      "niv": "Elevado"
    },
    {
      "pos": 75,
      "mun": "Rianápolis",
      "idx": 0.8533,
      "niv": "Elevado"
    },
    {
      "pos": 76,
      "mun": "Jandaia",
      "idx": 0.8528,
      "niv": "Elevado"
    },
    {
      "pos": 77,
      "mun": "Jaupaci",
      "idx": 0.8528,
      "niv": "Elevado"
    },
    {
      "pos": 78,
      "mun": "Santa Rita do Araguaia",
      "idx": 0.8524,
      "niv": "Elevado"
    },
    {
      "pos": 79,
      "mun": "Bonópolis",
      "idx": 0.8517,
      "niv": "Elevado"
    },
    {
      "pos": 80,
      "mun": "Palmeiras de Goiás",
      "idx": 0.8506,
      "niv": "Elevado"
    },
    {
      "pos": 81,
      "mun": "Cristalina",
      "idx": 0.8496,
      "niv": "Prata"
    },
    {
      "pos": 82,
      "mun": "Guapó",
      "idx": 0.8488,
      "niv": "Elevado"
    },
    {
      "pos": 83,
      "mun": "Nova Roma",
      "idx": 0.8479,
      "niv": "Elevado"
    },
    {
      "pos": 84,
      "mun": "Formosa",
      "idx": 0.8478,
      "niv": "Elevado"
    },
    {
      "pos": 85,
      "mun": "Mairipotaba",
      "idx": 0.8474,
      "niv": "Elevado"
    },
    {
      "pos": 86,
      "mun": "Águas Lindas de Goiás",
      "idx": 0.8454,
      "niv": "Elevado"
    },
    {
      "pos": 87,
      "mun": "Rio Quente",
      "idx": 0.8432,
      "niv": "Prata"
    },
    {
      "pos": 88,
      "mun": "Joviânia",
      "idx": 0.8427,
      "niv": "Prata"
    },
    {
      "pos": 89,
      "mun": "Vila Boa",
      "idx": 0.8422,
      "niv": "Elevado"
    },
    {
      "pos": 90,
      "mun": "Paranaiguara",
      "idx": 0.8417,
      "niv": "Elevado"
    },
    {
      "pos": 91,
      "mun": "Anicuns",
      "idx": 0.8408,
      "niv": "Elevado"
    },
    {
      "pos": 92,
      "mun": "Valparaíso de Goiás",
      "idx": 0.8398,
      "niv": "Prata"
    },
    {
      "pos": 93,
      "mun": "São Luiz do Norte",
      "idx": 0.8397,
      "niv": "Elevado"
    },
    {
      "pos": 94,
      "mun": "Edealina",
      "idx": 0.8383,
      "niv": "Prata"
    },
    {
      "pos": 95,
      "mun": "Aragoiânia",
      "idx": 0.8371,
      "niv": "Elevado"
    },
    {
      "pos": 96,
      "mun": "Itaguaru",
      "idx": 0.8371,
      "niv": "Elevado"
    },
    {
      "pos": 97,
      "mun": "Jesúpolis",
      "idx": 0.8364,
      "niv": "Elevado"
    },
    {
      "pos": 98,
      "mun": "Uruana",
      "idx": 0.836,
      "niv": "Elevado"
    },
    {
      "pos": 99,
      "mun": "Campinaçu",
      "idx": 0.8353,
      "niv": "Elevado"
    },
    {
      "pos": 100,
      "mun": "Corumbá de Goiás",
      "idx": 0.8341,
      "niv": "Elevado"
    },
    {
      "pos": 101,
      "mun": "Itapirapuã",
      "idx": 0.8339,
      "niv": "Elevado"
    },
    {
      "pos": 102,
      "mun": "Uruaçu",
      "idx": 0.8338,
      "niv": "Elevado"
    },
    {
      "pos": 103,
      "mun": "Acreúna",
      "idx": 0.8333,
      "niv": "Elevado"
    },
    {
      "pos": 104,
      "mun": "Vianópolis",
      "idx": 0.8323,
      "niv": "Elevado"
    },
    {
      "pos": 105,
      "mun": "Nova Glória",
      "idx": 0.832,
      "niv": "Elevado"
    },
    {
      "pos": 106,
      "mun": "Buriti Alegre",
      "idx": 0.8315,
      "niv": "Elevado"
    },
    {
      "pos": 107,
      "mun": "Pilar de Goiás",
      "idx": 0.8309,
      "niv": "Elevado"
    },
    {
      "pos": 108,
      "mun": "São Francisco de Goiás",
      "idx": 0.8277,
      "niv": "Elevado"
    },
    {
      "pos": 109,
      "mun": "Nova Veneza",
      "idx": 0.8265,
      "niv": "Elevado"
    },
    {
      "pos": 110,
      "mun": "Santa Terezinha de Goiás",
      "idx": 0.8262,
      "niv": "Prata"
    },
    {
      "pos": 111,
      "mun": "Palmelo",
      "idx": 0.8256,
      "niv": "Elevado"
    },
    {
      "pos": 112,
      "mun": "Doverlândia",
      "idx": 0.8245,
      "niv": "Elevado"
    },
    {
      "pos": 113,
      "mun": "São Miguel do Passa Quatro",
      "idx": 0.8225,
      "niv": "Elevado"
    },
    {
      "pos": 114,
      "mun": "Ivolândia",
      "idx": 0.8213,
      "niv": "Elevado"
    },
    {
      "pos": 115,
      "mun": "Campo Limpo de Goiás",
      "idx": 0.8211,
      "niv": "Elevado"
    },
    {
      "pos": 116,
      "mun": "Cocalzinho de Goiás",
      "idx": 0.8208,
      "niv": "Elevado"
    },
    {
      "pos": 117,
      "mun": "Santa Isabel",
      "idx": 0.8208,
      "niv": "Elevado"
    },
    {
      "pos": 118,
      "mun": "Itajá",
      "idx": 0.8205,
      "niv": "Prata"
    },
    {
      "pos": 119,
      "mun": "Pires do Rio",
      "idx": 0.8199,
      "niv": "Elevado"
    },
    {
      "pos": 120,
      "mun": "Hidrolândia",
      "idx": 0.8196,
      "niv": "Elevado"
    },
    {
      "pos": 121,
      "mun": "Ipiranga de Goiás",
      "idx": 0.8194,
      "niv": "Elevado"
    },
    {
      "pos": 122,
      "mun": "Bom Jardim de Goiás",
      "idx": 0.8168,
      "niv": "Elevado"
    },
    {
      "pos": 123,
      "mun": "Itapaci",
      "idx": 0.8163,
      "niv": "Elevado"
    },
    {
      "pos": 124,
      "mun": "Firminópolis",
      "idx": 0.8158,
      "niv": "Elevado"
    },
    {
      "pos": 125,
      "mun": "Goianésia",
      "idx": 0.8147,
      "niv": "Elevado"
    },
    {
      "pos": 126,
      "mun": "Anápolis",
      "idx": 0.8141,
      "niv": "Elevado"
    },
    {
      "pos": 127,
      "mun": "Nerópolis",
      "idx": 0.813,
      "niv": "Elevado"
    },
    {
      "pos": 128,
      "mun": "Montividiu",
      "idx": 0.8095,
      "niv": "Elevado"
    },
    {
      "pos": 129,
      "mun": "Brazabrantes",
      "idx": 0.8073,
      "niv": "Elevado"
    },
    {
      "pos": 130,
      "mun": "Marzagão",
      "idx": 0.8071,
      "niv": "Elevado"
    },
    {
      "pos": 131,
      "mun": "Novo Gama",
      "idx": 0.8057,
      "niv": "Elevado"
    },
    {
      "pos": 132,
      "mun": "Panamá",
      "idx": 0.8056,
      "niv": "Elevado"
    },
    {
      "pos": 133,
      "mun": "Sítio d'Abadia",
      "idx": 0.8051,
      "niv": "Elevado"
    },
    {
      "pos": 134,
      "mun": "Israelândia",
      "idx": 0.8047,
      "niv": "Prata"
    },
    {
      "pos": 135,
      "mun": "Hidrolina",
      "idx": 0.8046,
      "niv": "Elevado"
    },
    {
      "pos": 136,
      "mun": "Santa Tereza de Goiás",
      "idx": 0.8028,
      "niv": "Elevado"
    },
    {
      "pos": 137,
      "mun": "Aparecida do Rio Doce",
      "idx": 0.8027,
      "niv": "Prata"
    },
    {
      "pos": 138,
      "mun": "Caldas Novas",
      "idx": 0.802,
      "niv": "Prata"
    },
    {
      "pos": 139,
      "mun": "Mara Rosa",
      "idx": 0.8006,
      "niv": "Elevado"
    },
    {
      "pos": 140,
      "mun": "Aloândia",
      "idx": 0.8004,
      "niv": "Elevado"
    },
    {
      "pos": 141,
      "mun": "Córrego do Ouro",
      "idx": 0.8001,
      "niv": "Elevado"
    },
    {
      "pos": 142,
      "mun": "Portelândia",
      "idx": 0.7991,
      "niv": "Elevado"
    },
    {
      "pos": 143,
      "mun": "Colinas do Sul",
      "idx": 0.7973,
      "niv": "Elevado"
    },
    {
      "pos": 144,
      "mun": "Água Limpa",
      "idx": 0.7942,
      "niv": "Elevado"
    },
    {
      "pos": 145,
      "mun": "Faina",
      "idx": 0.7927,
      "niv": "Elevado"
    },
    {
      "pos": 146,
      "mun": "Montividiu do Norte",
      "idx": 0.7919,
      "niv": "Elevado"
    },
    {
      "pos": 147,
      "mun": "Lagoa Santa",
      "idx": 0.79,
      "niv": "Elevado"
    },
    {
      "pos": 148,
      "mun": "Alexânia",
      "idx": 0.7895,
      "niv": "Elevado"
    },
    {
      "pos": 149,
      "mun": "Mundo Novo",
      "idx": 0.7846,
      "niv": "Elevado"
    },
    {
      "pos": 150,
      "mun": "Avelinópolis",
      "idx": 0.7846,
      "niv": "Elevado"
    },
    {
      "pos": 151,
      "mun": "Uirapuru",
      "idx": 0.7841,
      "niv": "Elevado"
    },
    {
      "pos": 152,
      "mun": "Senador Canedo",
      "idx": 0.7831,
      "niv": "Elevado"
    },
    {
      "pos": 153,
      "mun": "Cezarina",
      "idx": 0.7829,
      "niv": "Elevado"
    },
    {
      "pos": 154,
      "mun": "Santo Antônio do Descoberto",
      "idx": 0.7805,
      "niv": "Elevado"
    },
    {
      "pos": 155,
      "mun": "Urutaí",
      "idx": 0.7795,
      "niv": "Elevado"
    },
    {
      "pos": 156,
      "mun": "Aruanã",
      "idx": 0.7794,
      "niv": "Elevado"
    },
    {
      "pos": 157,
      "mun": "Novo Brasil",
      "idx": 0.7745,
      "niv": "Elevado"
    },
    {
      "pos": 158,
      "mun": "Santa Cruz de Goiás",
      "idx": 0.7745,
      "niv": "Elevado"
    },
    {
      "pos": 159,
      "mun": "Damianópolis",
      "idx": 0.7716,
      "niv": "Elevado"
    },
    {
      "pos": 160,
      "mun": "Posse",
      "idx": 0.7714,
      "niv": "Elevado"
    },
    {
      "pos": 161,
      "mun": "Nazário",
      "idx": 0.7712,
      "niv": "Elevado"
    },
    {
      "pos": 162,
      "mun": "São Luís de Montes Belos",
      "idx": 0.7705,
      "niv": "Elevado"
    },
    {
      "pos": 163,
      "mun": "Iporá",
      "idx": 0.7694,
      "niv": "Elevado"
    },
    {
      "pos": 164,
      "mun": "Santo Antônio de Goiás",
      "idx": 0.7655,
      "niv": "Elevado"
    },
    {
      "pos": 165,
      "mun": "Divinópolis de Goiás",
      "idx": 0.7637,
      "niv": "Elevado"
    },
    {
      "pos": 166,
      "mun": "Morro Agudo de Goiás",
      "idx": 0.7617,
      "niv": "Elevado"
    },
    {
      "pos": 167,
      "mun": "Alto Horizonte",
      "idx": 0.761,
      "niv": "Elevado"
    },
    {
      "pos": 168,
      "mun": "Vicentinópolis",
      "idx": 0.7591,
      "niv": "Elevado"
    },
    {
      "pos": 169,
      "mun": "Davinópolis",
      "idx": 0.7573,
      "niv": "Elevado"
    },
    {
      "pos": 170,
      "mun": "Abadiânia",
      "idx": 0.7558,
      "niv": "Elevado"
    },
    {
      "pos": 171,
      "mun": "Itauçu",
      "idx": 0.7551,
      "niv": "Elevado"
    },
    {
      "pos": 172,
      "mun": "Moiporá",
      "idx": 0.754,
      "niv": "Elevado"
    },
    {
      "pos": 173,
      "mun": "Crixás",
      "idx": 0.7534,
      "niv": "Elevado"
    },
    {
      "pos": 174,
      "mun": "Araguapaz",
      "idx": 0.7515,
      "niv": "Elevado"
    },
    {
      "pos": 175,
      "mun": "Iaciara",
      "idx": 0.7484,
      "niv": "Intermediário"
    },
    {
      "pos": 176,
      "mun": "Guarinos",
      "idx": 0.7473,
      "niv": "Intermediário"
    },
    {
      "pos": 177,
      "mun": "Água Fria de Goiás",
      "idx": 0.7472,
      "niv": "Intermediário"
    },
    {
      "pos": 178,
      "mun": "Goiás",
      "idx": 0.7469,
      "niv": "Intermediário"
    },
    {
      "pos": 179,
      "mun": "São Simão",
      "idx": 0.7469,
      "niv": "Intermediário"
    },
    {
      "pos": 180,
      "mun": "Novo Planalto",
      "idx": 0.7442,
      "niv": "Intermediário"
    },
    {
      "pos": 181,
      "mun": "Monte Alegre de Goiás",
      "idx": 0.7429,
      "niv": "Intermediário"
    },
    {
      "pos": 182,
      "mun": "Americano do Brasil",
      "idx": 0.7413,
      "niv": "Intermediário"
    },
    {
      "pos": 183,
      "mun": "Castelândia",
      "idx": 0.7401,
      "niv": "Intermediário"
    },
    {
      "pos": 184,
      "mun": "Edéia",
      "idx": 0.739,
      "niv": "Intermediário"
    },
    {
      "pos": 185,
      "mun": "Teresina de Goiás",
      "idx": 0.7359,
      "niv": "Intermediário"
    },
    {
      "pos": 186,
      "mun": "Santa Bárbara de Goiás",
      "idx": 0.7352,
      "niv": "Intermediário"
    },
    {
      "pos": 187,
      "mun": "Barro Alto",
      "idx": 0.7349,
      "niv": "Intermediário"
    },
    {
      "pos": 188,
      "mun": "Campos Verdes",
      "idx": 0.7348,
      "niv": "Intermediário"
    },
    {
      "pos": 189,
      "mun": "Alvorada do Norte",
      "idx": 0.7345,
      "niv": "Intermediário"
    },
    {
      "pos": 190,
      "mun": "Taquaral de Goiás",
      "idx": 0.7324,
      "niv": "Intermediário"
    },
    {
      "pos": 191,
      "mun": "Mutunópolis",
      "idx": 0.7268,
      "niv": "Intermediário"
    },
    {
      "pos": 192,
      "mun": "Nova América",
      "idx": 0.7263,
      "niv": "Intermediário"
    },
    {
      "pos": 193,
      "mun": "Gameleira de Goiás",
      "idx": 0.7262,
      "niv": "Intermediário"
    },
    {
      "pos": 194,
      "mun": "Vila Propício",
      "idx": 0.7222,
      "niv": "Intermediário"
    },
    {
      "pos": 195,
      "mun": "Caturaí",
      "idx": 0.7155,
      "niv": "Intermediário"
    },
    {
      "pos": 196,
      "mun": "Sanclerlândia",
      "idx": 0.7094,
      "niv": "Intermediário"
    },
    {
      "pos": 197,
      "mun": "Mozarlândia",
      "idx": 0.7073,
      "niv": "Intermediário"
    },
    {
      "pos": 198,
      "mun": "Ouro Verde de Goiás",
      "idx": 0.6999,
      "niv": "Intermediário"
    },
    {
      "pos": 199,
      "mun": "Inhumas",
      "idx": 0.6983,
      "niv": "Intermediário"
    },
    {
      "pos": 200,
      "mun": "Porteirão",
      "idx": 0.698,
      "niv": "Intermediário"
    },
    {
      "pos": 201,
      "mun": "São Miguel do Araguaia",
      "idx": 0.6948,
      "niv": "Intermediário"
    },
    {
      "pos": 202,
      "mun": "Aporé",
      "idx": 0.6943,
      "niv": "Intermediário"
    },
    {
      "pos": 203,
      "mun": "Varjão",
      "idx": 0.693,
      "niv": "Intermediário"
    },
    {
      "pos": 204,
      "mun": "Guarani de Goiás",
      "idx": 0.6903,
      "niv": "Intermediário"
    },
    {
      "pos": 205,
      "mun": "Maurilândia",
      "idx": 0.69,
      "niv": "Intermediário"
    },
    {
      "pos": 206,
      "mun": "Adelândia",
      "idx": 0.682,
      "niv": "Intermediário"
    },
    {
      "pos": 207,
      "mun": "Goiandira",
      "idx": 0.6745,
      "niv": "Intermediário"
    },
    {
      "pos": 208,
      "mun": "Cachoeira de Goiás",
      "idx": 0.6741,
      "niv": "Intermediário"
    },
    {
      "pos": 209,
      "mun": "Buritinópolis",
      "idx": 0.6731,
      "niv": "Intermediário"
    },
    {
      "pos": 210,
      "mun": "Mineiros",
      "idx": 0.6727,
      "niv": "Intermediário"
    },
    {
      "pos": 211,
      "mun": "São Domingos",
      "idx": 0.6663,
      "niv": "Intermediário"
    },
    {
      "pos": 212,
      "mun": "São João da Paraúna",
      "idx": 0.6601,
      "niv": "Intermediário"
    },
    {
      "pos": 213,
      "mun": "Bom Jesus de Goiás",
      "idx": 0.6522,
      "niv": "Intermediário"
    },
    {
      "pos": 214,
      "mun": "Goianira",
      "idx": 0.6497,
      "niv": "Intermediário"
    },
    {
      "pos": 215,
      "mun": "Ouvidor",
      "idx": 0.6453,
      "niv": "Intermediário"
    },
    {
      "pos": 216,
      "mun": "Campinorte",
      "idx": 0.6437,
      "niv": "Intermediário"
    },
    {
      "pos": 217,
      "mun": "Orizona",
      "idx": 0.6374,
      "niv": "Intermediário"
    },
    {
      "pos": 218,
      "mun": "Guaraíta",
      "idx": 0.6358,
      "niv": "Intermediário"
    },
    {
      "pos": 219,
      "mun": "Heitoraí",
      "idx": 0.633,
      "niv": "Intermediário"
    },
    {
      "pos": 220,
      "mun": "Cumari",
      "idx": 0.6274,
      "niv": "Intermediário"
    },
    {
      "pos": 221,
      "mun": "Formoso",
      "idx": 0.605,
      "niv": "Intermediário"
    },
    {
      "pos": 222,
      "mun": "Aragarças",
      "idx": 0.5996,
      "niv": "Intermediário"
    },
    {
      "pos": 223,
      "mun": "Amaralina",
      "idx": 0.5959,
      "niv": "Intermediário"
    },
    {
      "pos": 224,
      "mun": "Alto Paraíso de Goiás",
      "idx": 0.5907,
      "niv": "Intermediário"
    },
    {
      "pos": 225,
      "mun": "Catalão",
      "idx": 0.5812,
      "niv": "Intermediário"
    },
    {
      "pos": 226,
      "mun": "Simolândia",
      "idx": 0.5764,
      "niv": "Intermediário"
    },
    {
      "pos": 227,
      "mun": "Matrinchã",
      "idx": 0.571,
      "niv": "Intermediário"
    },
    {
      "pos": 228,
      "mun": "Aparecida de Goiânia",
      "idx": 0.5685,
      "niv": "Intermediário"
    },
    {
      "pos": 229,
      "mun": "Anhanguera",
      "idx": 0.5615,
      "niv": "Intermediário"
    },
    {
      "pos": 230,
      "mun": "Trombas",
      "idx": 0.5481,
      "niv": "Intermediário"
    },
    {
      "pos": 231,
      "mun": "Piracanjuba",
      "idx": 0.5424,
      "niv": "Intermediário"
    },
    {
      "pos": 232,
      "mun": "Corumbaíba",
      "idx": 0.5385,
      "niv": "Intermediário"
    },
    {
      "pos": 233,
      "mun": "Planaltina",
      "idx": 0.5285,
      "niv": "Intermediário"
    },
    {
      "pos": 234,
      "mun": "Três Ranchos",
      "idx": 0.5244,
      "niv": "Intermediário"
    },
    {
      "pos": 235,
      "mun": "Campos Belos",
      "idx": 0.518,
      "niv": "Intermediário"
    },
    {
      "pos": 236,
      "mun": "Luziânia",
      "idx": 0.5065,
      "niv": "Intermediário"
    },
    {
      "pos": 237,
      "mun": "Buriti de Goiás",
      "idx": 0.4445,
      "niv": "Básico"
    },
    {
      "pos": 238,
      "mun": "Cachoeira Dourada",
      "idx": 0.4428,
      "niv": "Básico"
    },
    {
      "pos": 239,
      "mun": "Nova Iguaçu de Goiás",
      "idx": 0.4395,
      "niv": "Básico"
    },
    {
      "pos": 240,
      "mun": "Nova Crixás",
      "idx": 0.3858,
      "niv": "Básico"
    },
    {
      "pos": 241,
      "mun": "Flores de Goiás",
      "idx": 0.0533,
      "niv": "Inicial"
    },
    {
      "pos": 242,
      "mun": "Estrela do Norte",
      "idx": 0.0,
      "niv": "Não Avaliado"
    },
    {
      "pos": 243,
      "mun": "Jataí",
      "idx": 0.0,
      "niv": "Não Avaliado"
    },
    {
      "pos": 244,
      "mun": "Nova Aurora",
      "idx": 0.0,
      "niv": "Não Avaliado"
    },
    {
      "pos": 245,
      "mun": "Palminópolis",
      "idx": 0.0,
      "niv": "Não Avaliado"
    },
    {
      "pos": 246,
      "mun": "Fazenda Nova",
      "idx": 0.0,
      "niv": "Inexistente"
    }
  ],
  "fonte": {
    "nome": "Radar da Transparência Pública — ATRICON / Tribunais de Contas (PNTP 2025)",
    "url": "https://radardatransparencia.atricon.org.br/"
  }
} as const;
