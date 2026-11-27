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
- Busca e filtro de vagas; a lista mostra a contagem exata de competências com texto igual no perfil e no anúncio. Essa contagem não mede proficiência.
- Vagas salvas, candidaturas locais, acompanhamento de etapas, retirada de candidatura e feedback demonstrativo.
- Perfil de empresa editável; publicação e edição de vagas com salário, competências e benefícios; pausar, reativar e encerrar oportunidades.
- Painel de candidaturas para atualizar etapas e registrar feedback local.
- Relatórios calculados a partir dos dados locais.
- Autoavaliação educativa de SQL, com resultado guardado no navegador. Não é certificação.
- Preferências de privacidade, opção de compartilhar perfil, exportação JSON e exclusão dos dados locais.
- Layout responsivo para desktop e celular.

## Dados e serviços externos

Com `.env.local`, cadastro e login usam Supabase Auth. Perfil básico, competências, empresa, vagas, vagas salvas, candidaturas, consentimentos, etapas, feedback e cópias de perfil no envio são persistidos no PostgreSQL e protegidos por RLS. Esses registros sincronizam entre contas autorizadas. Autoavaliação e campos de formação/experiência ainda ficam no navegador. Use dados fictícios neste teste.

O esquema e as políticas RLS estão em `supabase/migrations/`; as migrações foram aplicadas somente ao Supabase local. A migração `202611270003_exact_monthly_salary.sql` exige um valor bruto mensal inteiro em BRL e falha se encontrar faixas legadas diferentes. A migração `202611270004_admin_console.sql` habilita onboarding seguro de empresa e operações administrativas condicionadas ao papel `admin`. Os testes pgTAP estão em `supabase/tests/`.

Para usar os serviços locais no Windows, abra o Docker Desktop e execute na raiz do projeto:

```powershell
npm.cmd install
npx.cmd supabase start -x logflare,vector
npx.cmd supabase status
```

O Logflare e o Vector foram excluídos do ambiente local porque o Vector não consegue acessar o endpoint do Docker desta configuração do Windows. Banco, API e Studio continuam disponíveis. O Studio abre em `http://127.0.0.1:54323`; a API local usa `http://127.0.0.1:54321`. Para reaplicar as migrações e recriar os dados do banco **local**, use `npx.cmd supabase db reset`. Para encerrar os serviços sem apagar o volume local, use `npx.cmd supabase stop`.

No ambiente local, cadastro/login, vagas, candidaturas e a console administrativa funcionam pelo Supabase em Docker. Para o teste: crie conta empregadora; cadastre uma conta de desenvolvedor, promova-a a `admin` no SQL Editor do Studio conforme o relatório; entre como admin e valide a empresa; entre novamente como empregador e publique uma vaga; crie conta candidata, aceite o compartilhamento e candidate-se. Projeto hospedado, e-mail de produção, currículos, redefinição de senha, avaliações supervisionadas e implantação continuam pendentes.

## Atualização de autenticação para demonstração com Supabase

Com o `.env.local` local preparado, a entrada da aplicação usa o Supabase Auth. Há cadastro e login por e-mail e senha; o cadastro candidato solicita nome, cargo, cidade/UF e valor salarial mensal exato. O cadastro empregador cria a empresa pela função SQL `create_company` e associa o usuário como proprietário. O perfil principal é lido/gravadado em `public.profiles` com RLS. Sem as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, a aplicação mantém o modo demonstrativo antigo.

Inicie o ambiente local no Docker Desktop com `npx.cmd supabase start -x logflare,vector`. O `.env.local` ignorado pelo Git aponta para o serviço Auth local. O painel administrativo usa funções SQL protegidas e papel `admin`; cadastros públicos não podem solicitar esse papel. Para promover sua conta local, crie uma conta pela interface e execute no SQL Editor local do Studio: `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'EMAIL_EXATO');`. Encerre a sessão e entre novamente para carregar o papel.

O Supabase Auth local gerencia cadastros e sessões. O painel administrativo lista, altera e exclui dados com papel `admin`; a promoção da primeira conta é manual. Perfil, empresa, vagas, favoritos, candidaturas, consentimentos, etapas e feedback ficam no PostgreSQL local com RLS. A autoavaliação e formação/experiência ainda são locais. A revisão não declara conformidade legal; leia `SECURITY_REVIEW_LGPD.md` antes de usar dados pessoais.
