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

O esquema Supabase/PostgreSQL está em `supabase/migrations/` e foi aplicado ao banco Supabase **local** para validação. A migração de endurecimento de privacidade contém políticas RLS e restrições adicionais; os testes pgTAP ficam em `supabase/tests/`. A interface ainda não consulta esse banco: seus dados continuam no `localStorage`. A configuração local está em `supabase/config.jsonc` e usa a CLI `supabase` instalada como dependência de desenvolvimento.

Para usar os serviços locais no Windows, abra o Docker Desktop e execute na raiz do projeto:

```powershell
npm.cmd install
npx.cmd supabase start -x logflare,vector
npx.cmd supabase status
```

O Logflare e o Vector foram excluídos do ambiente local porque o Vector não consegue acessar o endpoint do Docker desta configuração do Windows. Banco, API e Studio continuam disponíveis. O Studio abre em `http://127.0.0.1:54323`; a API local usa `http://127.0.0.1:54321`. Para reaplicar as migrações e recriar os dados do banco **local**, use `npx.cmd supabase db reset`. Para encerrar os serviços sem apagar o volume local, use `npx.cmd supabase stop`.

Login seguro, sincronização, envio de e-mail, armazenamento de currículos, certificações de competências e publicação em produção ainda exigem serviços e credenciais externas. Mesmo com a migração e os testes locais, não use dados pessoais reais: autenticação e UI não estão conectadas, e a revisão não declara conformidade legal. Leia `SECURITY_REVIEW_LGPD.md` antes de qualquer integração com dados reais.
