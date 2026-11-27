# Revisão de segurança e privacidade — Emprego Certo

**Revisão técnica:** 27/11/2026
**Escopo:** protótipo Next.js e esquema Supabase local versionado neste repositório.
**Conclusão:** o protótipo não está pronto para receber dados pessoais reais. Esta revisão endurece controles no esquema local, mas não é auditoria independente, parecer jurídico nem declaração de conformidade com a LGPD, GDPR ou qualquer lei mundial.

## Estado real dos dados

- A interface grava dados somente no `localStorage` do navegador atual. Não há autenticação real, API de aplicação conectada ao Supabase, sincronização, envio de candidatura para empresa ou tratamento centralizado.
- Perfis e vagas de demonstração são fictícios. Não use CPF, documentos, contatos, currículo ou outras informações de pessoas reais.
- O Supabase e as migrações são locais. A migração de segurança não foi aplicada a um projeto hospedado e nenhum projeto remoto está vinculado.
- Exclusão no protótipo apaga as chaves locais; não equivale a um processo de atendimento de direitos, retenção ou eliminação de uma conta em backend.

## Alterações técnicas incluídas

A migração `supabase/migrations/202611270002_privacy_access_hardening.sql` complementa o esquema inicial. A migração `202611270003_exact_monthly_salary.sql` substitui salário mínimo/máximo por um número mensal inteiro BRL. Se encontrar faixas diferentes existentes, falha sem escolher um dos valores; a migração precisa de resolução explícita antes de ser reaplicada. As alterações incluem:

- nega leitura pública de empresas e vagas ainda não verificadas;
- distingue recrutador de membro somente leitor para operações de contratação;
- impede que metadados de cadastro escolham o papel `recruiter`;
- limita leitura de perfil a seu titular, descoberta com visibilidade e consentimento vigentes, ou candidatura compartilhada com consentimento atual;
- registra consentimentos por finalidade em função autenticada, fixando versão e horário no servidor, serializando mudanças do mesmo titular e preservando histórico em vez de sobrescrevê-lo;
- restringe atualização de candidaturas a campos e papéis específicos e oculta os dados compartilhados após revogação;
- tira inserção direta de eventos de candidatura e tentativas de avaliação do cliente;
- remove gabaritos de avaliações da leitura pública e reduz permissões SQL a colunas necessárias;
- protege identidade/autor de vagas e feedback, e define aprovação de feedback no servidor.
- remove os dados pré-carregados de candidatos e vagas fictícias; a limpeza versionada apaga as antigas chaves locais uma vez após a atualização;
- substitui pontuações heurísticas de compatibilidade por contagem de igualdade textual de competências, sem afirmar que a contagem mede proficiência;
- guarda cópia do perfil somente no momento do envio consentido da candidatura e apresenta essa cópia à empresa. Revogar o controle local apaga as cópias compartilhadas. Candidaturas antigas sem cópia autorizada não mostram o perfil ativo.

Há testes pgTAP em `supabase/tests/` para privilégios e políticas RLS. Eles usam identidades descartáveis e rollback; não substituem teste de invasão, revisão independente, teste concorrente, teste da API hospedada ou validação jurídica.

## LGPD e aplicação internacional

A LGPD exige finalidade, adequação, necessidade, transparência, segurança, prevenção, responsabilização e atendimento aos direitos aplicáveis. Os artigos 46 a 49 determinam medidas técnicas e administrativas contra acessos não autorizados e incidentes, desde a concepção do serviço. Consentimento é apenas uma das bases legais possíveis e, quando escolhido, deve ser livre, informado, inequívoco e ligado a finalidades determinadas. A empresa responsável deve identificar controlador, operadores, bases legais por operação, retenção, compartilhamentos, canal de direitos e contato de privacidade.

Não existe uma única “lei mundial” que torne o sistema conforme em todos os países. O GDPR pode se aplicar, entre outros cenários, a organizações estabelecidas na União Europeia ou a organizações fora dela que ofereçam serviços a pessoas na UE ou monitorem seu comportamento. Transferências internacionais, leis estaduais/regionais e regras setoriais precisam ser avaliadas conforme os países, pessoas e operações efetivamente atendidos. A localização de hospedagem e os suboperadores também entram nessa avaliação.

Referências oficiais consultadas em 27/11/2026:

- [LGPD — texto compilado no Planalto](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), especialmente artigos 6, 18 e 46–49.
- [ANPD — comunicação de incidente de segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis). Incidentes que possam causar risco ou dano relevante devem ser avaliados e, quando aplicável, comunicados pelo controlador à ANPD e aos titulares no prazo regulatório; a regra geral indicada pela ANPD é de três dias úteis, observadas as regras específicas aplicáveis.
- [ANPD — Guia de Segurança da Informação para agentes de tratamento de pequeno porte](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_seguranca_da_informacao_para_atpps___defeso_eleitoral.pdf). É orientação prática, não certificação nem substituto da análise de risco.
- [GDPR — Regulamento (UE) 2016/679, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/), em particular artigos 3, 25, 32, 35 e capítulo V.

Este documento não determina qual base legal deve ser usada pelo futuro serviço. Essa decisão depende do contexto do controlador e precisa de revisão jurídica e de privacidade competente.

## Riscos e tarefas ainda necessárias antes de dados reais

| Prioridade | Pendência | Resultado necessário |
|---|---|---|
| Bloqueadora | Identificar controlador, operadores, encarregado/canal e países de operação | Papéis, contratos, contatos, suboperadores e escopo territorial documentados |
| Bloqueadora | Definir base legal e avisos de privacidade por finalidade | Textos reais, versão aprovada, retenção, compartilhamentos e canal de direitos coerentes com o produto; revisar a versão provisória `privacy-ptbr-2026-11-v1` antes de uso |
| Bloqueadora | Implementar autenticação, recuperação e autorização no servidor | Verificação de e-mail conforme risco, MFA para equipe administrativa, proteção contra abuso, gestão de sessão e processo de conta |
| Bloqueadora | Revisão independente de RLS e lógica de negócio | Exercitar todos os papéis, tentativas de escalada, acesso cruzado e condições de revogação no ambiente alvo |
| Bloqueadora | Definir validação de empresas e de usuários representantes | Processo real de análise, aprovação, revisão e auditoria; `verified_at` não deve ser liberado ao cliente para autoaprovação |
| Alta | Criptografia, segredos e operação | TLS, gestão/rotação de segredos, backups criptografados e restauração testada, ambientes separados, alertas e controle do acesso administrativo |
| Alta | Currículos e anexos | Armazenamento privado, URLs temporárias, limite/tipo de arquivo, análise antimalware, política de retenção e exclusão. Hoje gravação de `resume_url` pelo cliente está negada |
| Alta | Retenção, eliminação e direitos | Fluxos auditáveis de acesso, correção, exportação, oposição/revogação quando cabível, eliminação/anonimização e retenções legais; propagar exclusão a cópias/backup de acordo com a política |
| Alta | Incidentes | Plano de resposta, responsáveis, registro, avaliação de risco, comunicação dentro dos prazos da ANPD e procedimento para titulares |
| Alta | Avaliações e decisões automatizadas | Não usar heurísticas como filtro eliminatório; documentar lógica, revisão humana, contestação e acessibilidade. A tentativa de avaliação foi desabilitada no banco até haver avaliação segura no servidor |
| Média | Qualidade de dados e auditoria | Minimização, validação, logs sem excesso de dados pessoais, trilhas com acesso restrito e retenção definida |
| Bloqueadora | Beta/produção | Revisar segurança, privacidade, acessibilidade, carga e recuperação; aprovar implantação e monitoramento com os responsáveis |

## Restrições para quem continuar

1. Não aplique as migrações a um projeto remoto sem revisar o esquema e confirmar expressamente o projeto alvo. `supabase db reset` apaga os dados do banco local.
2. Nunca adicione `service_role`, chave secreta, senha, token, currículo ou dado pessoal ao Git, ao navegador ou a logs.
3. Não trate `record_privacy_consent` como prova automática de consentimento juridicamente válido: a interface ainda não foi integrada, não exibe o aviso que corresponde à versão e não registra evidência da apresentação do texto.
4. Antes da integração, alinhe finalidade e textos da interface, migre dados por serviços do servidor quando necessário e preserve RLS como defesa adicional.
5. Atualize `README.md`, `AGENTS.md` e `RELATORIO_CONTINUIDADE_ANTIGRAVITY.md` após mudanças de arquitetura ou estado.

## Atualização técnica: autenticação local e console administrativa (27/11/2026)

A integração Auth foi implementada para o Supabase configurado no Docker local. Cadastro e login usam e-mail/senha; o perfil e papel vêm de `public.profiles`. Criar conta empregadora chama `create_company` com sessão autenticada; a membresia define o acesso da organização. A interface não aceita papel admin pelo cadastro público. O painel administrativo usa RPCs SQL com verificação de papel e chave primária, sem chave `service_role` no browser. Para habilitar a conta do desenvolvedor localmente, depois de cadastrá-la, usar SQL Editor local: `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'EMAIL_EXATO');`, sair e entrar novamente.

A console admin tem alteração via JSON e exclusão permanente das tabelas públicas listadas no componente. Operações administrativas respeitam dependências e podem excluir linhas em cascata. O banco local e os fluxos básicos de Auth não tornam o produto pronto para produção. A edição de perfil básico agora usa `profiles`; vagas, candidaturas, feedback, seleção, relatórios e competências continuam no estado local do navegador. Persistência e isolamento desses registros por usuário ainda são necessários antes de demonstração multi-conta.

O Supabase local estava desligado no começo desta rodada; foi iniciado via Docker. O `.env.local` ignorado pelo Git contém somente URL local e chave pública anon. `supabase db reset` recriou apenas o banco local para aplicar as quatro migrações; isso apaga os registros que existiam no banco local.
