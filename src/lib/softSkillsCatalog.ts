export type SoftSkillCatalogItem = {
  name: string;
  category: string;
  description: string;
};

/**
 * Catálogo padronizado de soft skills exibido em tabela com checkboxes
 * tanto no perfil do candidato quanto no cadastro de vagas da empresa.
 */
export const softSkillsCatalog: SoftSkillCatalogItem[] = [
  // Comunicação e Relacionamento
  { name: "Comunicação", category: "Comunicação", description: "Clareza ao falar, escrever e alinhar informações com a equipe." },
  { name: "Escuta ativa", category: "Comunicação", description: "Atenção genuína para compreender demandas e feedbacks." },
  { name: "Empatia", category: "Comunicação", description: "Capacidade de compreender diferentes perspectivas e contextos." },
  { name: "Negociação", category: "Comunicação", description: "Construção de acordos equilibrados entre áreas, clientes ou parceiros." },
  { name: "Oratória e apresentações", category: "Comunicação", description: "Segurança para apresentar resultados e conduzir reuniões." },
  { name: "Relacionamento interpessoal", category: "Comunicação", description: "Convivência respeitosa e construtiva no ambiente de trabalho." },

  // Organização e Execução
  { name: "Organização", category: "Execução", description: "Estruturação clara de tarefas, arquivos, prazos e prioridades." },
  { name: "Gestão do tempo", category: "Execução", description: "Cumprimento de entregas organizando urgências e foco." },
  { name: "Autonomia", category: "Execução", description: "Iniciativa para conduzir atividades com baixa supervisão." },
  { name: "Proatividade", category: "Execução", description: "Antecipação de necessidades e proposição de melhorias." },
  { name: "Atenção aos detalhes", category: "Execução", description: "Cuidado com qualidade, revisão e consistência nas entregas." },
  { name: "Foco em resultados", category: "Execução", description: "Direcionamento das ações para metas e impacto concreto." },

  // Análise e Resolução de Problemas
  { name: "Pensamento analítico", category: "Análise", description: "Interpretação estruturada de dados, cenários e causa raiz." },
  { name: "Resolução de problemas", category: "Análise", description: "Habilidade para destravar obstáculos com soluções práticas." },
  { name: "Pensamento crítico", category: "Análise", description: "Avaliação objetiva de premissas antes de tomar decisões." },
  { name: "Tomada de decisão", category: "Análise", description: "Escolha segura de caminhos considerando riscos e prioridades." },
  { name: "Criatividade", category: "Análise", description: "Geração de abordagens novas para desafios recorrentes." },

  // Liderança e Colaboração
  { name: "Colaboração", category: "Colaboração", description: "Cooperação ativa para atingir objetivos compartilhados." },
  { name: "Trabalho em equipe", category: "Colaboração", description: "Integração saudável com pessoas de diferentes perfis e áreas." },
  { name: "Liderança", category: "Colaboração", description: "Capacidade de orientar pessoas, delegar e inspirar entregas." },
  { name: "Gestão de conflitos", category: "Colaboração", description: "Mediação equilibrada de divergências com foco em solução." },
  { name: "Mentoria e desenvolvimento", category: "Colaboração", description: "Apoio ao crescimento técnico e profissional de colegas." },

  // Adaptabilidade e Postura
  { name: "Adaptabilidade", category: "Adaptabilidade", description: "Facilidade para ajustar rotas diante de mudanças de cenário." },
  { name: "Flexibilidade", category: "Adaptabilidade", description: "Abertura a novas ferramentas, processos e formas de trabalhar." },
  { name: "Resiliência", category: "Adaptabilidade", description: "Equilíbrio emocional sob pressão e aprendizado com erros." },
  { name: "Inteligência emocional", category: "Adaptabilidade", description: "Autoconhecimento e manejo saudável das emoções no trabalho." },
  { name: "Aprendizado contínuo", category: "Adaptabilidade", description: "Curiosidade constante para atualizar conhecimentos e práticas." },
  { name: "Ética profissional", category: "Adaptabilidade", description: "Responsabilidade, transparência e confidencialidade nas ações." },
];

export const softSkillCategories = ["Todas", "Comunicação", "Execução", "Análise", "Colaboração", "Adaptabilidade"];
