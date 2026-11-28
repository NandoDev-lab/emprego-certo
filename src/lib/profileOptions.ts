export type EducationCategory = "graduacao" | "pos_graduacao" | "tecnico" | "curso" | "certificacao_especial";

export const educationCategories: { value: EducationCategory; label: string; short: string; degrees: string[] }[] = [
  {
    value: "graduacao",
    label: "Graduação",
    short: "Graduação",
    degrees: ["Bacharelado", "Licenciatura", "Tecnólogo", "Ensino Médio"],
  },
  {
    value: "pos_graduacao",
    label: "Pós-graduação / MBA / Mestrado / Doutorado",
    short: "Pós-graduação",
    degrees: ["Especialização / Pós-graduação", "MBA", "Mestrado", "Doutorado", "Pós-doutorado"],
  },
  {
    value: "tecnico",
    label: "Ensino Técnico / Profissionalizante",
    short: "Técnico",
    degrees: ["Curso Técnico", "Qualificação Profissional", "Aprendizagem Industrial"],
  },
  {
    value: "curso",
    label: "Curso livre / Aperfeiçoamento / Bootcamp",
    short: "Curso",
    degrees: ["Curso livre", "Bootcamp", "Extensão universitária", "Workshop / Imersão"],
  },
  {
    value: "certificacao_especial",
    label: "Certificação especial / Registro / NR",
    short: "Certificação especial",
    degrees: [
      "Certificação Internacional",
      "Certificação Técnica / Cloud",
      "Norma Regulamentadora (NR)",
      "Registro de Conselho (CREA / OAB / CRC / COREN / CRM)",
      "Certificação Financeira (CPA-10 / CPA-20 / CEA / CFP)",
      "Certificação de Gestão (PMP / Scrum / ITIL / Lean Six Sigma)",
    ],
  },
];

export const educationCategoryLabel: Record<EducationCategory, string> = {
  graduacao: "Graduação",
  pos_graduacao: "Pós-graduação",
  tecnico: "Técnico",
  curso: "Curso",
  certificacao_especial: "Certificação especial",
};

export type LanguageProficiency = "basico" | "intermediario" | "avancado" | "fluente" | "nativo";

export const languageProficiencies: { value: LanguageProficiency; label: string }[] = [
  { value: "basico", label: "Básico (A1–A2)" },
  { value: "intermediario", label: "Intermediário (B1–B2)" },
  { value: "avancado", label: "Avançado (C1)" },
  { value: "fluente", label: "Fluente (C2)" },
  { value: "nativo", label: "Nativo / Bilíngue" },
];

export const languageProficiencyLabel: Record<LanguageProficiency, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
  fluente: "Fluente",
  nativo: "Nativo",
};

export const commonLanguages = [
  "Inglês",
  "Espanhol",
  "Português",
  "Francês",
  "Alemão",
  "Italiano",
  "Mandarim",
  "Japonês",
  "Coreano",
  "Árabe",
  "Russo",
  "Libras (Língua Brasileira de Sinais)",
] as const;

export type InternationalExperienceType =
  | "intercambio_academico"
  | "intercambio_idiomas"
  | "trabalho_exterior"
  | "voluntariado"
  | "residencia_exterior"
  | "outro";

export const internationalExperienceTypes: { value: InternationalExperienceType; label: string }[] = [
  { value: "intercambio_academico", label: "Intercâmbio acadêmico / Graduação sanduíche" },
  { value: "intercambio_idiomas", label: "Intercâmbio de idiomas" },
  { value: "trabalho_exterior", label: "Trabalho / Estágio no exterior" },
  { value: "voluntariado", label: "Voluntariado internacional" },
  { value: "residencia_exterior", label: "Residência / Vivência cultural no exterior" },
  { value: "outro", label: "Outra vivência internacional" },
];

export const internationalExperienceTypeLabel: Record<InternationalExperienceType, string> = {
  intercambio_academico: "Intercâmbio acadêmico",
  intercambio_idiomas: "Intercâmbio de idiomas",
  trabalho_exterior: "Trabalho no exterior",
  voluntariado: "Voluntariado internacional",
  residencia_exterior: "Vivência no exterior",
  outro: "Experiência internacional",
};

export type TravelAvailability = "nao_disponivel" | "eventual" | "frequente" | "total";

export const travelAvailabilityOptions: { value: TravelAvailability; label: string; hint: string }[] = [
  { value: "nao_disponivel", label: "Sem disponibilidade", hint: "Apenas atuação local ou remota" },
  { value: "eventual", label: "Viagens eventuais", hint: "Reuniões, visitas ou treinamentos pontuais" },
  { value: "frequente", label: "Viagens frequentes", hint: "Rotina semanal ou quinzenal em outras cidades" },
  { value: "total", label: "Disponibilidade total", hint: "Viagens nacionais e/ou internacionais" },
];

export const travelAvailabilityLabel: Record<TravelAvailability, string> = {
  nao_disponivel: "Sem disponibilidade para viagens",
  eventual: "Disponível para viagens eventuais",
  frequente: "Disponível para viagens frequentes",
  total: "Disponibilidade total para viagens",
};

export type MaritalStatus = "nao_informar" | "solteiro" | "casado" | "uniao_estavel" | "divorciado" | "viuvo";

export const maritalStatusOptions: { value: MaritalStatus; label: string }[] = [
  { value: "nao_informar", label: "Prefiro não informar" },
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "uniao_estavel", label: "União estável" },
  { value: "divorciado", label: "Divorciado(a) / Separado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
];

export const maritalStatusLabel: Record<MaritalStatus, string> = {
  nao_informar: "Não informado",
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  uniao_estavel: "União estável",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

export const cnhCategoryOptions = ["ACC", "A", "B", "C", "D", "E"] as const;

export const commonOtherLicenses = [
  "MOPP (Produtos Perigosos)",
  "Operador de Empilhadeira",
  "Ponte Rolante / Guindaste",
  "NR-10 (Eletricidade)",
  "NR-11 (Movimentação de Cargas)",
  "NR-33 (Espaço Confinado)",
  "NR-35 (Trabalho em Altura)",
  "CREA",
  "OAB",
  "CRC",
  "COREN",
  "CRM",
  "CRP",
  "CRECI",
  "Arrais Amador / Náutica",
  "Piloto / ANAC / Drone (DECEA)",
] as const;

export const pcdTypeOptions = [
  "Física",
  "Auditiva",
  "Visual",
  "Intelectual",
  "Psicossocial",
  "Transtorno do Espectro Autista (TEA)",
  "Múltipla",
  "Reabilitado INSS",
] as const;
