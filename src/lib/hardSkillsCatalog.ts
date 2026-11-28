export type HardSkillRole = {
  id: string;
  name: string;
  skills: string[];
};

export type HardSkillFunction = {
  id: string;
  name: string;
  roles: HardSkillRole[];
};

export type HardSkillArea = {
  id: string;
  name: string;
  functions: HardSkillFunction[];
};

/**
 * Catálogo aninhado em 3 níveis (Área > Função principal > Cargo/Especialidade > Hard skills)
 * compartilhado entre a área do candidato e a área da empresa para padronizar o match 100%.
 */
export const hardSkillsCatalog: HardSkillArea[] = [
  {
    id: "ti",
    name: "TI",
    functions: [
      {
        id: "ti-dev",
        name: "Desenvolvimento",
        roles: [
          {
            id: "ti-dev-software",
            name: "Desenvolvimento de Software",
            skills: ["Lógica de Programação", "Arquitetura de Software", "APIs REST", "Git", "Testes Automatizados", "Clean Code"],
          },
          {
            id: "ti-dev-automacao",
            name: "Automação e QA",
            skills: ["Automação de Processos (RPA)", "Python", "Selenium", "Cypress", "Playwright", "Testes de API", "CI/CD"],
          },
          {
            id: "ti-dev-frontend",
            name: "Front-end",
            skills: ["HTML5", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Git"],
          },
          {
            id: "ti-dev-backend",
            name: "Back-end",
            skills: ["Node.js", "Python", "Java", "C# / .NET", "PHP", "SQL", "PostgreSQL", "APIs REST", "Docker"],
          },
          {
            id: "ti-dev-mobile",
            name: "Mobile",
            skills: ["React Native", "Flutter", "Swift (iOS)", "Kotlin (Android)", "APIs REST", "Git"],
          },
        ],
      },
      {
        id: "ti-dados",
        name: "Dados e Inteligência",
        roles: [
          {
            id: "ti-dados-analise",
            name: "Análise de Dados e BI",
            skills: ["SQL", "Power BI", "Excel", "Python", "Estatística", "Looker Studio", "Modelagem de Dados"],
          },
          {
            id: "ti-dados-engenharia",
            name: "Engenharia de Dados",
            skills: ["SQL", "Python", "ETL / ELT", "Apache Spark", "Airflow", "Data Warehouse"],
          },
          {
            id: "ti-dados-ciencia",
            name: "Ciência de Dados e IA",
            skills: ["Python", "Machine Learning", "Estatística", "Pandas", "Scikit-learn", "NLP / LLMs"],
          },
        ],
      },
      {
        id: "ti-infra",
        name: "Infraestrutura, Cloud e Segurança",
        roles: [
          {
            id: "ti-infra-suporte",
            name: "Suporte Técnico e Redes",
            skills: ["Redes TCP/IP", "Linux", "Windows Server", "Active Directory", "Atendimento N1/N2", "ITIL"],
          },
          {
            id: "ti-infra-devops",
            name: "Cloud e DevOps",
            skills: ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux"],
          },
          {
            id: "ti-infra-sec",
            name: "Segurança da Informação",
            skills: ["Segurança de Redes", "LGPD / Compliance", "Análise de Vulnerabilidades", "SIEM", "IAM"],
          },
        ],
      },
    ],
  },
  {
    id: "produto-design",
    name: "Produto e Design",
    functions: [
      {
        id: "prod-gestao",
        name: "Gestão de Produto",
        roles: [
          {
            id: "prod-pm",
            name: "Product Manager (PM)",
            skills: ["Gestão de Produto", "SQL", "Scrum", "Métricas", "Roadmap de Produto", "Discovery", "OKRs"],
          },
          {
            id: "prod-po",
            name: "Product Owner (PO)",
            skills: ["Scrum", "Kanban", "Refinamento de Backlog", "Histórias de Usuário", "Jira", "Métricas"],
          },
        ],
      },
      {
        id: "prod-design",
        name: "Design Digital",
        roles: [
          {
            id: "prod-uxui",
            name: "UX / UI Design",
            skills: ["Figma", "Prototipação", "Design System", "Pesquisa com Usuários", "Testes de Usabilidade"],
          },
          {
            id: "prod-grafico",
            name: "Design Gráfico e Motion",
            skills: ["Adobe Photoshop", "Adobe Illustrator", "After Effects", "Identidade Visual", "Diagramação"],
          },
        ],
      },
    ],
  },
  {
    id: "financas",
    name: "Finanças e Contabilidade",
    functions: [
      {
        id: "fin-controladoria",
        name: "Controladoria e Planejamento",
        roles: [
          {
            id: "fin-ctrl",
            name: "Controladoria",
            skills: ["Controladoria", "Excel", "Power BI", "DRE", "Planejamento Financeiro", "Auditoria Interna"],
          },
          {
            id: "fin-fpa",
            name: "FP&A (Planejamento Financeiro)",
            skills: ["Planejamento Financeiro", "Orçamento Empresarial", "Fluxo de Caixa", "Modelagem Financeira", "Excel", "Power BI"],
          },
        ],
      },
      {
        id: "fin-contabil",
        name: "Contábil e Fiscal",
        roles: [
          {
            id: "fin-contabilidade",
            name: "Contabilidade Geral",
            skills: ["Contabilidade Societária", "Conciliação Contábil", "DRE", "Balanço Patrimonial", "ERP Contábil"],
          },
          {
            id: "fin-fiscal",
            name: "Fiscal e Tributário",
            skills: ["Apuração de Impostos", "SPED Fiscal", "ICMS / ISS / PIS / COFINS", "Notas Fiscais (NF-e)"],
          },
        ],
      },
      {
        id: "fin-tesouraria",
        name: "Tesouraria e Operações Financeiras",
        roles: [
          {
            id: "fin-contas",
            name: "Contas a Pagar e Receber",
            skills: ["Contas a Pagar", "Contas a Receber", "Conciliação Bancária", "Fluxo de Caixa", "Excel", "ERP Financeiro"],
          },
        ],
      },
    ],
  },
  {
    id: "comercial",
    name: "Comercial e Atendimento",
    functions: [
      {
        id: "com-cs",
        name: "Sucesso do Cliente e Suporte",
        roles: [
          {
            id: "com-cs-analista",
            name: "Sucesso do Cliente (CS)",
            skills: ["Atendimento ao Cliente", "Excel", "CRM", "Onboarding de Clientes", "Retenção e Churn", "NPS"],
          },
          {
            id: "com-sac",
            name: "Atendimento e SAC",
            skills: ["Atendimento ao Cliente", "Atendimento Omnichannel", "CRM", "Resolução de Chamados"],
          },
        ],
      },
      {
        id: "com-vendas",
        name: "Vendas e Expansão",
        roles: [
          {
            id: "com-sdr",
            name: "Pré-vendas (SDR / BDR)",
            skills: ["Prospecção Outbound", "Qualificação de Leads", "CRM", "Funil de Vendas", "Cold Call / Cold Mail"],
          },
          {
            id: "com-closer",
            name: "Executivo de Contas (Closer)",
            skills: ["Negociação B2B", "CRM", "Elaboração de Propostas", "Gestão de Carteira", "Metas Comerciais"],
          },
        ],
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing e Comunicação",
    functions: [
      {
        id: "mkt-digital",
        name: "Marketing Digital",
        roles: [
          {
            id: "mkt-perf",
            name: "Tráfego Pago e Performance",
            skills: ["Google Ads", "Meta Ads", "Google Analytics (GA4)", "Métricas", "CRO", "Excel"],
          },
          {
            id: "mkt-conteudo",
            name: "Conteúdo e SEO",
            skills: ["SEO", "Copywriting", "Redação Digital", "WordPress", "Calendário Editorial"],
          },
          {
            id: "mkt-social",
            name: "Mídias Sociais",
            skills: ["Gestão de Redes Sociais", "Criação de Conteúdo", "Canva", "Métricas", "Community Management"],
          },
        ],
      },
      {
        id: "mkt-com",
        name: "Comunicação e Branding",
        roles: [
          {
            id: "mkt-corp",
            name: "Comunicação Corporativa",
            skills: ["Comunicação Interna", "Assessoria de Imprensa", "Endomarketing", "Gestão de Marca"],
          },
        ],
      },
    ],
  },
  {
    id: "rh",
    name: "Recursos Humanos e DP",
    functions: [
      {
        id: "rh-atracao",
        name: "Atração e Desenvolvimento",
        roles: [
          {
            id: "rh-rs",
            name: "Recrutamento e Seleção",
            skills: ["Triagem de Currículos", "Entrevista por Competências", "Hunting", "ATS", "Employer Branding"],
          },
          {
            id: "rh-td",
            name: "Treinamento e Desenvolvimento",
            skills: ["Treinamento Corporativo", "Avaliação de Desempenho", "Clima Organizacional", "Plano de Carreira"],
          },
        ],
      },
      {
        id: "rh-dp",
        name: "Departamento Pessoal",
        roles: [
          {
            id: "rh-folha",
            name: "Folha e Rotinas Trabalhistas",
            skills: ["Folha de Pagamento", "eSocial", "Admissão e Rescisão", "Legislação Trabalhista", "Ponto Eletrônico", "Excel"],
          },
        ],
      },
    ],
  },
  {
    id: "operacoes",
    name: "Operações e Logística",
    functions: [
      {
        id: "op-log",
        name: "Logística e Estoque",
        roles: [
          {
            id: "op-estoque",
            name: "Gestão de Estoque e Almoxarifado",
            skills: ["Controle de Estoque", "Inventário", "WMS", "Excel", "Curva ABC"],
          },
          {
            id: "op-transporte",
            name: "Transporte e Distribuição",
            skills: ["Roteirização", "Gestão de Frota", "Fretes e Transportadoras", "Expedição", "TMS"],
          },
        ],
      },
      {
        id: "op-suprimentos",
        name: "Compras e Produção",
        roles: [
          {
            id: "op-compras",
            name: "Compras e Suprimentos",
            skills: ["Cotação e Compras", "Negociação com Fornecedores", "Gestão de Contratos", "ERP", "Excel"],
          },
          {
            id: "op-pcp",
            name: "PCP e Qualidade",
            skills: ["Planejamento de Produção (PCP)", "Lean Manufacturing", "ISO 9001", "5S", "Indicadores Industriais"],
          },
        ],
      },
    ],
  },
  {
    id: "adm-juridico-saude",
    name: "Administração, Jurídico e Saúde",
    functions: [
      {
        id: "adm-geral",
        name: "Administração Geral",
        roles: [
          {
            id: "adm-rotinas",
            name: "Analista / Assistente Administrativo",
            skills: ["Rotinas Administrativas", "Excel", "Pacote Office", "Gestão Documental", "Controle de Agenda"],
          },
        ],
      },
      {
        id: "jur-corp",
        name: "Jurídico",
        roles: [
          {
            id: "jur-contratos",
            name: "Jurídico Corporativo e Contratos",
            skills: ["Contratos", "LGPD / Compliance", "Direito Trabalhista", "Direito Civil", "Gestão de Processos (PJe)"],
          },
        ],
      },
      {
        id: "saude-clinica",
        name: "Saúde e Atendimento Clínico",
        roles: [
          {
            id: "saude-enf",
            name: "Enfermagem e Triagem",
            skills: ["Triagem Clínica", "Prontuário Eletrônico", "Administração de Medicamentos", "Protocolos de Biossegurança"],
          },
        ],
      },
    ],
  },
];
