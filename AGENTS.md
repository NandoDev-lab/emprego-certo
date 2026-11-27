# Diretrizes para continuar o Emprego Certo

## Idioma e contexto

- A interface, a documentação e os comentários novos devem permanecer em português do Brasil.
- Este repositório contém um protótipo navegável, não uma plataforma de contratação pronta para produção.
- Não trate empresas, vagas, perfis, pontuações ou indicadores de demonstração como dados reais.
- Não afirme que existem autenticação, envio de candidatura a empresas reais ou sincronização entre usuários.

## Executar e verificar

O projeto usa Next.js 16, React e TypeScript. No Windows PowerShell, use `npm.cmd` para evitar bloqueios de execução do script `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

O desenvolvimento local abre em `http://localhost:3000`. O Next.js usa Turbopack por padrão. Não há testes automatizados configurados.

## Onde ficam as partes principais

- `src/app/page.tsx`: tela de entrada, fluxos de candidato e empresa, dados demonstrativos, compatibilidade, estado e interações locais.
- `src/app/globals.css`: apresentação responsiva e estilos de todas as telas.
- `src/app/layout.tsx`: idioma e metadados globais.
- `src/lucide-react.d.ts`: declaração de tipos usada pelos ícones Lucide nesta configuração.
- `supabase/migrations/`: esquema PostgreSQL/Supabase, funções, gatilhos e políticas RLS versionadas. `202611270003_exact_monthly_salary.sql` exige salário bruto mensal único em reais.
- `supabase/tests/`: verificações pgTAP de privilégios e comportamento RLS no banco local.
- `SECURITY_REVIEW_LGPD.md`: revisão do estado de privacidade, controles feitos e bloqueios antes de dados reais.
- `README.md`: recursos disponíveis, execução e limitações do protótipo.
- `.env.example`: nomes das variáveis públicas necessárias para futura configuração do Supabase; não contém credenciais.

## Funcionamento atual

- A página de entrada separa os caminhos demonstrativos de candidato e empregador. Os formulários criam perfis locais; não verificam identidade, e-mail ou senha.
- Candidatos podem editar o perfil, procurar e salvar vagas, calcular compatibilidade estimada, candidatar-se, acompanhar etapas, retirar candidatura, ver feedback, exportar ou apagar os dados locais.
- Empresas podem editar o perfil institucional, publicar e editar vagas com salário obrigatório, pausar, reativar ou encerrar vagas, atualizar etapas de candidatura, registrar feedback e ver indicadores calculados no navegador.
- A área de evolução oferece uma autoavaliação curta de SQL. O resultado é educativo e não representa certificação ou competência verificada.
- Os dados persistem em `localStorage` apenas no navegador atual. As chaves usam o prefixo `ec-` (`ec-profile`, `ec-applications`, `ec-saved`, `ec-posted`, `ec-privacy-consent`, `ec-employer`, `ec-assessments` e `ec-demo-entered`).
- O cálculo de compatibilidade no cliente é heurístico e explicável; não deve ser usado como critério automático de contratação.
- O protótipo inicia sem candidatos, empresas ou vagas fictícias. O primeiro carregamento após a alteração `ec-exact-test-data-v1` remove as chaves locais dos exemplos anteriores. Os registros de teste criados depois disso ficam no navegador atual.
- Vagas aceitam um único salário bruto mensal inteiro em reais; intervalos não são aceitos. A contagem de competências usa igualdade textual exata e não mede proficiência.
- Uma candidatura aprovada no fluxo local guarda uma cópia dos dados do perfil no momento do envio. O empregador só vê essa cópia; registros antigos sem cópia autorizada não exibem o perfil ativo. Desativar o consentimento remove as cópias dos registros locais.

## Estado da integração com Supabase

A migração inicial e a migração de endurecimento de privacidade foram aplicadas e validadas apenas no Supabase local. Testes pgTAP estão em `supabase/tests/`; execute `npx.cmd supabase test db` com os serviços locais iniciados. A aplicação ainda não consulta esse banco. Para iniciar os serviços essenciais no Windows, com o Docker Desktop aberto, use `npx.cmd supabase start -x logflare,vector`; o Vector não consegue acessar o endpoint do Docker nesta configuração. O banco, a API e o Studio continuam disponíveis. O endereço do Studio é `http://127.0.0.1:54323`; a API usa `http://127.0.0.1:54321`. `npx.cmd supabase stop` preserva o volume local, e `npx.cmd supabase db reset` recria o banco local e apaga os dados nele. Não há projeto remoto vinculado.

**Não usar dados pessoais reais.** A revisão em `SECURITY_REVIEW_LGPD.md` documenta o escopo, controles, lacunas e referências oficiais. Migrações e testes locais não provam conformidade legal nem substituem revisão independente; não aplicar a um banco remoto sem análise e confirmação do projeto alvo.

Antes de conectar um projeto real:

1. Obtenha as credenciais do projeto e configure-as localmente, sem adicioná-las ao Git.
2. Revise a migração inteira e aplique-a somente a um projeto novo ou após analisar o esquema existente.
3. Valide as políticas RLS e os fluxos de consentimento no próprio Supabase antes de disponibilizar dados pessoais.
4. Implemente autenticação e autorização reais antes de substituir os perfis locais.
5. Mova leituras e gravações para serviços do servidor ou clientes configurados com políticas adequadas; nunca exponha `service_role` no navegador.
6. Depois, conecte perfis, empresas, vagas, candidaturas, histórico, feedback, competências, avaliações, consentimentos e vagas salvas às tabelas correspondentes.

Pendentes: e-mail de produ??o, curr?culos em armazenamento privado, redefini??o de senha, testes supervisionados, notifica??es e implanta??o em produ??o.

## Cuidados ao alterar

- Preserve o aviso de que os dados são locais e demonstrativos.
- Mantenha um único salário bruto mensal inteiro obrigatório ao cadastrar vaga e consentimento explícito antes de compartilhar o perfil em uma candidatura.
- Não transforme pontuação heurística em decisão eliminatória automática.
- Atualize esta orientação e o `README.md` quando mudar arquitetura, comandos ou limites funcionais.
- Preserve consentimento específico por finalidade, princípio do menor privilégio e aviso de dados demonstrativos; não trate consentimento registrado no banco como prova automática de validade jurídica.
- Depois de mudanças no código, execute `npm.cmd run build` para conferir compilação e tipos. Não invente credenciais nem aplique a migração sem acesso e revisão do ambiente correto.

## Atualização: autenticação e painel administrativo

A tela conectada ao Supabase usa cadastro/login Auth, carrega o papel do perfil no banco e impede que a interface candidato abra painéis de empresa. A conta empregadora cria uma organização via RPC autenticada e recebe vínculo de proprietário. O perfil principal lê e grava dados básicos no banco. A console administrativa permite consultar, alterar e excluir dados por RPCs SQL com verificação do papel `admin`; não expõe `service_role`.

A migração `202611270004_admin_console.sql` exige promoção manual de administrador pelo operador com privilégio SQL. A instrução é `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'EMAIL_EXATO');` no SQL Editor do Supabase local, após o cadastro da conta do desenvolvedor. Cadastros públicos não aceitam papel admin.

Perfil básico, competências, empresa, vagas, favoritos, candidaturas, consentimentos, etapas, feedback e snapshots são persistidos no PostgreSQL local com RLS. Autoavaliação e dados de formação/experiência ainda usam localStorage. Nenhum projeto Supabase hospedado está vinculado; use somente dados fictícios.
