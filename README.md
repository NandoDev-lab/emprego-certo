# Emprego Certo

Protótipo navegável do MVP, criado com Next.js, React e TypeScript.

## Executar

Requisitos: Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## O que já funciona no protótipo

- Página inicial com entradas separadas para candidato e empresa e criação de perfis demonstrativos.
- Perfil de candidato editável: dados básicos, pretensão salarial, competências, formação, experiência, bio e visibilidade.
- Busca, filtro e ordenação de vagas por compatibilidade calculada a partir de competências, modalidade, localização, salário e objetivo profissional.
- Vagas salvas, candidaturas locais, acompanhamento de etapas, retirada de candidatura e feedback demonstrativo.
- Perfil de empresa editável; publicação e edição de vagas com salário, competências e benefícios; pausar, reativar e encerrar oportunidades.
- Painel de candidaturas para atualizar etapas e registrar feedback local.
- Relatórios calculados a partir dos dados locais.
- Autoavaliação educativa de SQL, com resultado guardado no navegador. Não é certificação.
- Preferências de privacidade, opção de compartilhar perfil, exportação JSON e exclusão dos dados locais.
- Layout responsivo para desktop e celular.

## Dados e serviços externos

A interface salva os dados no `localStorage` do navegador; eles não são compartilhados entre usuários ou dispositivos e podem ser removidos ao limpar os dados do navegador. Os perfis e vagas iniciais são exemplos demonstrativos. A página de entrada não autentica contas nem verifica identidade. Não use dados pessoais reais nesta versão.

O esquema inicial Supabase/PostgreSQL está em `supabase/migrations/202611230001_initial_schema.sql`, mas não foi aplicado nem conectado à aplicação. Login seguro, sincronização, envio de e-mail, armazenamento de currículos, certificações de competências e publicação em produção ainda exigem serviços e credenciais externas. A migração é uma base inicial e deve ser revisada e aplicada em um projeto Supabase novo antes de uso real.
