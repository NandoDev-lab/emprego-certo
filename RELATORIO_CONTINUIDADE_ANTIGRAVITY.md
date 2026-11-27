# Relatório de continuidade — Emprego Certo

**Atualizado em:** 27/11/2026
**Próximo agente:** Antigravity
**Repositório:** `C:\Users\Ferna\OneDrive\Documentos\GitHub\emprego-certo`

## Estado do produto

O Emprego Certo é um protótipo de demonstração navegável, não um serviço de contratação pronto para produção. Perfis, vagas, empresas, compatibilidade e indicadores da interface são dados demonstrativos. A interface não autentica usuários, não envia candidaturas a empresas reais e não sincroniza usuários/dispositivos. Os dados de interface ficam em `localStorage` no navegador atual. Não utilizar dados pessoais reais.

O Supabase está configurado e executado somente localmente. O frontend não está conectado ao banco e não há projeto remoto vinculado. O endurecimento abaixo é uma base técnica versionada e testada localmente, não uma declaração de conformidade com a LGPD/GDPR nem autorização para beta com dados reais.

## Implementações acumuladas

- Atualização do Next.js para 16.4.6, React/React DOM para 19.3.1 no lockfile, CLI Supabase local, override corrigido do PostCSS e configuração do Next para não injetar instruções em inglês no `AGENTS.md`.
- Configuração Supabase local em `supabase/config.jsonc`. Inicialização no Windows foi validada com `npx.cmd supabase start -x logflare,vector`; Logflare e Vector ficam excluídos por incompatibilidade do Vector com o endpoint Docker deste ambiente. Banco, API e Studio continuam disponíveis.
- Comentários funcionais em português ampliados em `src/app/page.tsx`; correções para exclusão de `ec-demo-entered`, navegação do perfil empresarial, nome/avatar dinâmico, data que não causa divergência SSR/hidratação e indicador de etapas com zero candidaturas.
- Migração inicial em `supabase/migrations/202611230001_initial_schema.sql` e migração corretiva em `supabase/migrations/202611270002_privacy_access_hardening.sql`.
- A migração de segurança: nega exposição pública de empresas/vagas não verificadas; distingue recrutadores e leitores; impede promoção de papel por metadados; aplica acesso condicionado a consentimento atual; registra consentimento por finalidade por função com versão/data fixadas no servidor; restringe escrita de candidaturas, eventos, feedback e avaliações; esconde gabaritos; limita grants por coluna; protege campos de identidade e timestamps.
- A função de consentimento bloqueia a linha do perfil para serializar alterações do mesmo titular e gera timestamp crescente por finalidade. O número/versão `privacy-ptbr-2026-11-v1` é provisório: a UI ainda não mostra aviso correspondente e o cliente ainda não chama RPC.
- Testes pgTAP em `supabase/tests/privacy_access_hardening.test.sql` (privilégios) e `supabase/tests/privacy_rls_behavior.test.sql` (comportamento de acesso). Testes são descartáveis e fazem rollback.
- Revisão de segurança e privacidade detalhada em `SECURITY_REVIEW_LGPD.md`; `README.md` e `AGENTS.md` atualizados.

## Segurança e enquadramento legal

O documento `SECURITY_REVIEW_LGPD.md` registra o estado real dos dados, as mudanças técnicas, os riscos remanescentes e fontes oficiais. A LGPD (Lei 13.709/2018 compilada), a regulamentação/orientações da ANPD e o GDPR quando territorialmente aplicável precisam ser considerados. Não há uma lei global única; o escopo depende das pessoas, entidades, operações e países servidos.

Referências primárias: [LGPD compilada no Planalto](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), [comunicação de incidentes à ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis), [guia de segurança da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_seguranca_da_informacao_para_atpps___defeso_eleitoral.pdf) e [GDPR no EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/).

### Bloqueios antes de qualquer dado pessoal real

1. Definir controlador, operadores, encarregado/canal, países e suboperadores; revisar contratos e transferência internacional.
2. Definir bases legais por finalidade, textos de privacidade, retenção e compartilhamentos com profissional jurídico/privacidade. Alinhar a versão do aviso (`privacy-ptbr-2026-11-v1`) ao texto efetivamente mostrado e à evidência necessária.
3. Implementar autenticação, recuperação de conta, autorização de servidor, sessão, abuso/rate limits e administração com MFA conforme risco.
4. Fazer revisão independente de RLS, funções `SECURITY DEFINER`, grants, APIs e controles no ambiente hospedado; a suíte local não é pentest.
5. Implementar verificação real de empresas; somente processo confiável pode preencher `companies.verified_at`.
6. Implementar fluxos de direitos, retenção, exclusão/anonimização, exportação, backups e restauração, criptografia, gestão/rotação de segredos e logs mínimos.
7. Implementar armazenamento privado de currículos, verificação de arquivos, links temporários e retenção. A migração nega escrita direta de `resume_url` pelo cliente.
8. Definir resposta a incidentes conforme regras/prazos aplicáveis. ANPD informa regra geral de três dias úteis para comunicações de incidentes que cumpram critérios, com regras específicas aplicáveis a agentes de pequeno porte.
9. Só então integrar frontend a serviços do Supabase com chaves públicas e RLS; nunca disponibilizar `service_role`/secret no browser.
10. Fazer revisão de acessibilidade, privacidade, segurança e aprovação de implantação antes de beta/produção.

Não é suficiente marcar uma caixa de consentimento: consentimento é apenas uma base legal possível e exige contexto válido e texto claro. O registro técnico de uma decisão não prova, por si só, a validade jurídica do consentimento.

## Verificações executadas em 27/11/2026

- `npm.cmd run build`: passou com Next.js 16.4.6, TypeScript e geração estática.
- `npm.cmd audit`: zero vulnerabilidades.
- `npx.cmd supabase config validate`: configuração local válida, sem projeto remoto.
- `npx.cmd supabase db reset`: ambas migrações aplicadas ao banco local sem erro. Este comando recria o banco local.
- `npx.cmd supabase test db`: passou, **31 verificações em 2 arquivos pgTAP**. O teste comportamental inicialmente falhou porque a expectativa não considerava que o consentimento de candidatura é separado do consentimento geral de descoberta; o teste agora confirma ambos os limites e passa.
- `git diff --check`: sem erros de whitespace conhecidos.
- A página local respondeu HTTP 200 em verificação anterior. Interação completa dos fluxos continua pendente de navegação manual.

## Retomada no Windows PowerShell

Na raiz do projeto:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd audit
npx.cmd supabase config validate
npx.cmd supabase start -x logflare,vector
npx.cmd supabase db reset
npx.cmd supabase test db
npm.cmd run dev
```

`supabase db reset` destrói e recria o banco **local**. Não usar `--remote` ou `--db-url` sem revisar e confirmar alvo. Supabase Studio: `http://127.0.0.1:54323`; API local: `http://127.0.0.1:54321`; app: `http://localhost:3000`. Para parar serviços locais preservando o volume, `npx.cmd supabase stop`.

## Git e publicação

O pedido anterior do usuário autorizou comentar partes funcionais em português e fazer commit/push. As alterações desta rodada foram commitadas e enviadas para `origin/main` em `114f654` (`Endurece privacidade e controles de acesso`). `git diff --cached --check` passou e os arquivos `.env`/credenciais não foram incluídos; `.env.example` continua apenas como modelo. O workspace estava limpo após o push. Se houver novas mudanças, repetir revisão e verificações antes de novo envio.

## Arquivos de referência

- `src/app/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`: protótipo visual e lógica cliente.
- `supabase/migrations/`: esquema e controles SQL versionados.
- `supabase/tests/`: verificações pgTAP.
- `SECURITY_REVIEW_LGPD.md`: limites técnicos, legais e operacionais de segurança/privacidade.
- `README.md` e `AGENTS.md`: uso e restrições do repositório.

## Correção de acesso entre áreas (27/11/2026)

- Removido o controle que permitia alternar diretamente do perfil candidato para a área da empresa. A escolha da área da empresa ocorre somente no fluxo demonstrativo “Sou empregador”; o empregador pode sair para o fluxo candidato, mas o candidato não tem botão de promoção de papel.
- Painéis e rotas de conteúdo da empresa continuam condicionados a `companyMode`, que só é definido no envio do formulário de entrada da empresa. Não existe autenticação real: qualquer pessoa pode iniciar um novo perfil de demonstração de empregador pela tela de entrada.
- Validação: `npm.cmd run build` passou após a alteração. A área continua sendo uma demonstração local, sem isolamento de segurança de servidor.

## Autenticação e administração local

- Com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` definidos, a tela inicial usa cadastro/login por e-mail e senha do Supabase Auth. Os perfis e empresas iniciais são criados no PostgreSQL local com RLS; nenhum segredo `service_role` é usado no navegador.
- `.env.local` está configurado para `http://127.0.0.1:54321` e contém somente a chave pública local `anon`; o arquivo é ignorado pelo Git. Inicie Docker/Supabase com `npx.cmd supabase start -x logflare,vector`.
- A criação de conta de empregador chama a função `create_company`, que associa o usuário autenticado como proprietário. Vagas, candidaturas, etapas e relatórios ainda usam o armazenamento local demonstrativo e não estão sincronizados ao banco.
- A migração `202611270004_admin_console.sql` cria funções de listar, alterar e excluir registros do schema `public`, autorizadas apenas se `profiles.role = 'admin'`. Não conceda esse papel por cadastro público.
- Para criar o administrador local: registre primeiro a conta pela aplicação; no Supabase Studio local (`http://127.0.0.1:54323`), execute `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'EMAIL_EXATO');`, substituindo pelo e-mail cadastrado. A conta deve sair e entrar novamente. Faça isso somente no banco local e para a conta do desenvolvedor.
- A administração aplica alterações e exclusões permanentes. O acesso é protegido no banco, e as exclusões em cascata podem remover dados relacionados.

## Estado final para demonstração (27/11/2026)

- O endereço inicial abre a landing page; os caminhos públicos são candidato e empregador. O link administrativo especial permite somente entrar. A tela não cadastra administradores, e o banco verifica `profiles.role = 'admin'` antes de permitir o painel.
- Cadastro/login Auth, perfil básico e competências, cadastro da empresa, vagas, vagas salvas, candidaturas, consentimentos, snapshot de perfil no envio, etapas e feedback agora usam o Supabase local com Docker e RLS. A jornada foi exercitada ponta a ponta: uma conta admin validou a empresa; o empregador publicou uma vaga; a candidata consultou e se candidatou; o snapshot, a etapa e o feedback foram lidos pelas contas corretas; revogar consentimento removeu a leitura do recrutador.
- Para criar a primeira conta admin, cadastre-a pela landing como candidata; no Studio local execute `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'EMAIL_EXATO');`; saia e entre pelo acesso administrativo especial. No painel, em `companies`, use “Validar empresa”. A conta empregadora deve sair e entrar novamente para atualizar a permissão de publicação.
- A última jornada ponta a ponta usou contas de teste descartáveis; `supabase db reset` removeu essas contas. Os testes pgTAP executados após a limpeza passaram: **53 verificações em 4 arquivos**. `npm.cmd run build` passou e `npx.cmd supabase config validate` indicou configuração válida. Supabase local e aplicação respondem em `127.0.0.1:54321` e `http://localhost:3000`.
- Limites que permanecem: nenhuma conta foi criada para o usuário; cadastre suas próprias contas na landing. A autoavaliação e dados de formação/experiência ainda usam armazenamento local. O Auth está configurado para o Supabase local; projeto hospedado, e-mail de produção, recuperação de senha, currículo privado e publicação pública continuam pendentes. Use apenas dados fictícios.
