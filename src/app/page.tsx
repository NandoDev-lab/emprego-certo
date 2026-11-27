"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  Building2, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3,
  FileText, Filter, Heart, LayoutDashboard, LogOut, MapPin, Menu, MessageSquareText,
  Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, UserRound,
  Users, X, GraduationCap, BookmarkCheck, Target, ChartNoAxesColumnIncreasing,
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Modelo visual de uma oportunidade. Os campos de status e benefícios são
 * opcionais porque as vagas pré-carregadas não precisam de todos os dados do
 * formulário de publicação. Os identificadores são locais, não UUIDs do banco.
 */
type Job = {
  id: number | string; role: string; company: string; initials: string; color: string; location: string;
  mode: "Remoto" | "Híbrido" | "Presencial"; level: string; salaryMonthly: number | null; posted: string;
  tags: string[]; featured?: boolean; description: string; status?: "Ativa" | "Pausada" | "Encerrada" | "Rascunho"; benefits?: string;
};
/** Vaga acompanhada pela lista exata de competências também cadastradas no perfil. */
type MatchedJob = Job & { matchedSkills: string[] };
/**
 * Registro local que liga uma pessoa demonstrativa a uma vaga e acompanha o
 * processo. Os campos de feedback e nome são preenchidos pelos fluxos locais.
 */
type Application = { id?: string; feedbackId?: string; jobId: number | string; status: string; date: string; feedback?: string; recruiterNote?: string; candidateSnapshot?: Profile };
/** Campos do perfil demonstrativo usados em busca, candidatura e edição. */
type Profile = { name: string; role: string; city: string; salaryMonthly: number | null; skills: string[]; education: string; experience: string; bio: string; visible: boolean };

/** Perfil ilustrativo usado para apresentar campos ao abrir a demonstração.
 * O formulário de entrada substitui os dados pessoais e começa sem histórico real.
 */
const initialProfile: Profile = { name: "", role: "", city: "", salaryMonthly: null, skills: [], education: "", experience: "", bio: "", visible: false };

/** Vagas fictícias de demonstração; não representam oportunidades abertas reais. */
const jobs: Job[] = [];

/** A conta local começa sem candidaturas; novas inscrições são criadas pelo fluxo de candidatura. */
const initialApps: Application[] = [];

/** Opções de navegação da área do candidato; a área da empresa usa seu próprio menu. */
const nav = [
  { key: "home", label: "Visão geral", icon: LayoutDashboard },
  { key: "jobs", label: "Encontrar vagas", icon: Search },
  { key: "applications", label: "Minhas candidaturas", icon: FileText },
  { key: "evolution", label: "Minha evolução", icon: TrendingUp, badge: "Novo" },
];

/** Lê um valor JSON local sem acessar o navegador durante a renderização do servidor. */
function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

/** Formata um inteiro em reais como valor mensal bruto único. */
function formatMonthlySalary(value: number | null) {
  return value == null ? "Não informado" : `${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value)} por mês (bruto)`;
}

/** Retorna somente competências com igualdade textual após normalização de caixa e espaços. */
function getMatchedSkills(job: Job, profile: Profile) {
  const candidateSkills = new Set(profile.skills.map(skill => skill.trim().toLocaleLowerCase("pt-BR")).filter(Boolean));
  return job.tags.filter(skill => candidateSkills.has(skill.trim().toLocaleLowerCase("pt-BR")));
}

function mapDatabaseJob(row: Record<string, any>): Job {
  const company = row.companies?.name || "Empresa";
  const status: Job["status"] = row.status === "draft" ? "Rascunho" : row.status === "paused" ? "Pausada" : row.status === "closed" ? "Encerrada" : "Ativa";
  const mode: Job["mode"] = row.workplace_mode === "remote" ? "Remoto" : row.workplace_mode === "hybrid" ? "Híbrido" : "Presencial";
  const date = row.published_at || row.created_at;
  return { id: row.id, role: row.title, company, initials: company.slice(0,2).toUpperCase(), color: "blue", location: [row.city,row.state].filter(Boolean).join(", ") || "Brasil", mode, level: row.experience_level || "Não informado", salaryMonthly: row.salary_monthly, posted: date ? `Publicado em ${new Intl.DateTimeFormat("pt-BR").format(new Date(date))}` : "Data não informada", tags: String(row.requirements || "").split(/[,;\n]/).map((tag:string)=>tag.trim()).filter(Boolean), description: row.description || "", benefits: row.benefits || "", status };
}

const dbApplicationStatus: Record<string,string> = { submitted:"Inscrição enviada", screening:"Em análise", assessment:"Teste técnico", interview:"Entrevista", offer:"Oferta", hired:"Contratado", rejected:"Não selecionado", withdrawn:"Desistiu" };
const uiApplicationStatus: Record<string,string> = Object.fromEntries(Object.entries(dbApplicationStatus).map(([key,value])=>[value,key]));

export default function Home() {
  // Estado de navegação e conteúdo em memória. A permanência entre visitas é
  // feita em localStorage; não há sessão autenticada nem sincronização remota.
  // Define qual tela de entrada ou painel deve ser mostrado e qual papel está ativo.
  const [entered, setEntered] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authNotice, setAuthNotice] = useState("");
  const [accountRole, setAccountRole] = useState<"candidate" | "recruiter" | "admin" | null>(null);
  const [authCompany, setAuthCompany] = useState("");
  const [authCompanyId, setAuthCompanyId] = useState<string | null>(null);
  const [authCompanyVerified, setAuthCompanyVerified] = useState(false);
  const [entryMode, setEntryMode] = useState<"choose" | "candidate" | "employer">("choose");
  const [active, setActive] = useState("home");
  // Registros e filtros que alimentam os painéis de candidato e empresa.
  const [applications, setApplications] = useState<Application[]>(initialApps);
  const [saved, setSaved] = useState<Array<number | string>>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("Todas");
  const [selected, setSelected] = useState<Job | null>(null);
  const [toast, setToast] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  // Dados editáveis do candidato e da empresa no navegador atual.
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [editing, setEditing] = useState(false);
  const [companyMode, setCompanyMode] = useState(false);
  const [posted, setPosted] = useState<Job[]>([]);
  const [showNewJob, setShowNewJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  // Controles de privacidade e autoavaliação, sempre tratados como dados locais.
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [employer, setEmployer] = useState({ name: "", website: "", description: "" });
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<{skill:string;score:number;date:string}[]>([]);
  // Rótulo de data calculado após montar a página para não divergir no SSR.
  const [todayLabel, setTodayLabel] = useState("");

  // Quando as variáveis públicas existem, a sessão Supabase passa a controlar
  // a entrada. O protótipo local permanece disponível sem configuração.
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const loadIdentity = async (user: User | null) => {
      if (!mounted) return;
      setAuthUser(user);
      if (!user) { setAccountRole(null); setAuthCompany(""); setAuthCompanyId(null); setAuthCompanyVerified(false); setAuthLoading(false); return; }
      const previousUserId = localStorage.getItem("ec-auth-user-id");
      if (previousUserId !== user.id) {
        ["ec-profile", "ec-applications", "ec-saved", "ec-posted", "ec-privacy-consent", "ec-employer", "ec-assessments", "ec-demo-entered"].forEach(key => localStorage.removeItem(key));
        setApplications([]); setSaved([]); setPosted([]); setPrivacyConsent(false); setAssessmentResults([]); setProfile(initialProfile);
      }
      localStorage.setItem("ec-auth-user-id", user.id);
      let { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      let role: "candidate" | "recruiter" | "admin" = profileData?.role === "admin" ? "admin" : profileData?.role === "recruiter" ? "recruiter" : "candidate";
      const entryKind=localStorage.getItem("ec-entry-kind");
      if((role==="admin")!==(entryKind==="admin")){
        const reason = entryKind === "admin"
          ? `Esta conta (${user.email}) ainda não tem papel de administrador no banco (papel atual: ${role === "recruiter" ? "empresa" : "candidato"}). Promova a conta no SQL Editor do Supabase Studio local antes de entrar por este acesso.`
          : "Esta conta é administrativa. Entre pelo link \"Acesso administrativo especial\" na tela inicial.";
        await supabase.auth.signOut();
        if(mounted){setAuthNotice(reason);setAuthUser(null);setAccountRole(null);setAuthLoading(false);}
        return;
      }
      setAuthNotice("");
      if (role === "candidate" && user.user_metadata?.role === "recruiter" && user.user_metadata?.company_name) {
        const company = String(user.user_metadata.company_name).trim();
        const slug = company.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) + "-" + user.id.slice(0, 8);
        const { error: companyError } = await supabase.rpc("create_company", { company_name: company, company_slug: slug });
        if (!companyError) {
          const { data: refreshedProfile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
          profileData = refreshedProfile;
          role = profileData?.role === "recruiter" ? "recruiter" : "candidate";
        }
      }
      if (role === "candidate" && (user.user_metadata?.headline || user.user_metadata?.city || user.user_metadata?.salary_monthly)) {
        const metadataProfile = { headline: user.user_metadata?.headline || null, city: user.user_metadata?.city || null, salary_monthly: user.user_metadata?.salary_monthly ? Number(user.user_metadata.salary_monthly) : null };
        await supabase.from("profiles").update(metadataProfile).eq("id", user.id);
      }
      setAccountRole(role);
      setEntered(true);
      setCompanyMode(role === "recruiter");
      setActive(current => {
        if (role === "recruiter") return ["company", "companyJobs", "talents", "reports", "companyProfile"].includes(current) ? current : "company";
        if (role === "admin") return current === "admin" || entryKind === "admin" ? "admin" : current;
        return ["home", "jobs", "applications", "evolution", "profile", "saved", "settings"].includes(current) ? current : "home";
      });
      setProfile(current => ({ ...current, name: profileData?.full_name || String(user.user_metadata?.full_name || ""), role: profileData?.headline || String(user.user_metadata?.headline || ""), city: profileData?.city || String(user.user_metadata?.city || ""), salaryMonthly: profileData?.salary_monthly ?? (user.user_metadata?.salary_monthly ? Number(user.user_metadata.salary_monthly) : null), skills:profileData?.declared_skills||[], bio: profileData?.bio || "", visible: profileData?.profile_visible ?? false }));
      let companyId: string | null = null;
      if (role === "recruiter") {
        const { data: membership } = await supabase.from("company_members").select("company_id, companies(name, verified_at, website, description)").eq("profile_id", user.id).limit(1).maybeSingle();
        const linkedCompany = membership?.companies as { name?: string; verified_at?: string | null; website?: string; description?: string } | null;
        const companyName = linkedCompany?.name || "";
        companyId = membership?.company_id || null;
        setAuthCompanyId(companyId);
        setAuthCompanyVerified(Boolean(linkedCompany?.verified_at));
        setAuthCompany(companyName);
        if (companyName) setEmployer({ name:companyName, website:linkedCompany?.website||"", description:linkedCompany?.description||"" });
        if (!companyName) {
          const company = String(user.user_metadata?.company_name || "").trim();
          if (company) {
            const slug = company.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) + "-" + user.id.slice(0, 8);
            const { data: createdId } = await supabase.rpc("create_company", { company_name: company, company_slug: slug });
            if (createdId) {
              companyId = String(createdId);
              setAuthCompanyId(companyId);
              setAuthCompanyVerified(false);
              setAuthCompany(company);
              setEmployer(current => ({ ...current, name: company }));
            }
          }
        }
      } else { setAuthCompany(""); setAuthCompanyId(null); setAuthCompanyVerified(false); }
      const jobsRequest = supabase.from("jobs").select("*, companies(name)").order("created_at", { ascending: false });
      if (role === "recruiter" && companyId) jobsRequest.eq("company_id", companyId);
      const { data: databaseJobs, error: jobsError } = await jobsRequest;
      if (!jobsError && databaseJobs) setPosted(databaseJobs.map(row => mapDatabaseJob(row as Record<string, any>)));
      const { data: databaseApplications } = await supabase.from("applications").select("*, jobs(title, companies(name)), application_feedback(id, summary, visible_to_candidate)").order("submitted_at", { ascending: false });
      if (databaseApplications) setApplications(databaseApplications.map((row:Record<string,any>) => {
      const snapshot=row.candidate_snapshot;
        const job=row.jobs || {};
        const feedback=Array.isArray(row.application_feedback)?row.application_feedback[0]:row.application_feedback;
        return { id:row.id, feedbackId:feedback?.id, recruiterNote:feedback?.summary, jobId:row.job_id, status:dbApplicationStatus[row.status] || "Inscrição enviada", date:new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(row.submitted_at)), candidateSnapshot:snapshot?{...initialProfile,name:snapshot.name||"",role:snapshot.role||"",city:snapshot.city||"",salaryMonthly:snapshot.salaryMonthly??null,skills:snapshot.skills||[],bio:snapshot.bio||"",visible:snapshot.visible??false}:undefined };
      }));
      if (role === "candidate") {
        const { data: savedRows } = await supabase.from("saved_jobs").select("job_id").eq("profile_id", user.id);
        if (savedRows) setSaved(savedRows.map(row=>row.job_id));
        const { data: consent } = await supabase.rpc("has_current_privacy_consent", { target_profile: user.id, target_purpose: "application_profile_sharing" });
        setPrivacyConsent(Boolean(consent));
      }
      if (mounted) setAuthLoading(false);
    };
    void supabase.auth.getSession().then(({ data }) => loadIdentity(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void loadIdentity(session?.user ?? null); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  // Restaura os dados guardados neste navegador depois da hidratação do React.
  // O fallback inicial deixa a página renderizável também no servidor Next.js.
  useEffect(() => {
    // Atualiza a data no navegador, depois da renderização inicial, para evitar
    // divergência entre a pré-renderização estática e o relógio do cliente.
    setTodayLabel(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()).toLocaleUpperCase("pt-BR"));
    const cleanupVersion = "ec-exact-test-data-v1";
    if (localStorage.getItem("ec-data-cleanup-version") !== cleanupVersion) {
      // O usuário autorizou remover dados fictícios anteriores para iniciar testes vazios.
      ["ec-profile", "ec-applications", "ec-saved", "ec-posted", "ec-privacy-consent", "ec-employer", "ec-assessments", "ec-demo-entered"].forEach(key => localStorage.removeItem(key));
      localStorage.setItem("ec-data-cleanup-version", cleanupVersion);
      setEntered(false);
      setApplications([]);
      setSaved([]);
      setProfile(initialProfile);
      setPosted([]);
      setPrivacyConsent(false);
      setEmployer({ name: "", website: "", description: "" });
      setAssessmentResults([]);
      return;
    }
    setEntered(load("ec-demo-entered", false));
    setApplications(load("ec-applications", initialApps));
    setSaved(load("ec-saved", []));
    setProfile({ ...initialProfile, ...load<Partial<Profile>>("ec-profile", {}) });
    setPosted(load("ec-posted", []));
    setPrivacyConsent(load("ec-privacy-consent", false));
    setEmployer(load("ec-employer", { name: "", website: "", description: "" }));
    setAssessmentResults(load("ec-assessments", []));
  }, []);
  // Estas ações mantêm estado visual e cópia persistente do mesmo dado local.
  // Salva candidaturas na memória React e na chave persistente correspondente.
  const persistApps = (next: Application[]) => { setApplications(next); localStorage.setItem("ec-applications", JSON.stringify(next)); };
  // Alterna a vaga salva e grava a lista completa para restaurá-la na próxima visita.
  const toggleSaved = (id: number | string) => {
    const next = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id]; setSaved(next); localStorage.setItem("ec-saved", JSON.stringify(next));
    if (supabase && authUser && typeof id === "string") void (async()=>{const result=next.includes(id)?await supabase.from("saved_jobs").upsert({profile_id:authUser.id,job_id:id}):await supabase.from("saved_jobs").delete().eq("profile_id",authUser.id).eq("job_id",id);if(result.error)notify("Vaga salva apenas nesta sessão: "+result.error.message);})();
  };
  // Exibe avisos transitórios sem navegar para outra tela.
  // Mostra uma confirmação curta para ações locais sem interromper o fluxo.
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3000); };
  // Registra uma candidatura local. O compartilhamento do perfil precisa estar
  // habilitado pelo próprio candidato e uma vaga não aceita inscrição duplicada.
  const apply = async (job: Job) => {
    if (!privacyConsent) { notify("Aceite o compartilhamento do seu perfil antes de se candidatar."); setActive("settings"); return; }
    if (applications.some(a => a.jobId === job.id)) { notify("Você já se candidatou a esta vaga."); return; }
    if (supabase && authUser && accountRole === "candidate" && typeof job.id === "string") {
      const { error } = await supabase.rpc("record_privacy_consent", { target_purpose: "application_profile_sharing", is_granted: true });
      if (error) { notify("Não foi possível registrar o consentimento: "+error.message); return; }
      const { data, error: applicationError } = await supabase.from("applications").insert({ job_id: job.id, candidate_id: authUser.id, profile_shared: true }).select("id, submitted_at, status, candidate_snapshot").single();
      if (applicationError) { notify("Não foi possível enviar a candidatura: "+applicationError.message); return; }
      const row=data as Record<string,any>;persistApps([{id:row.id,jobId:job.id,status:dbApplicationStatus[row.status]||"Inscrição enviada",date:new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(row.submitted_at)),candidateSnapshot:{...profile,skills:[...profile.skills]}},...applications]);
    } else persistApps([{ jobId: job.id, status: "Inscrição enviada", date: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()), candidateSnapshot: { ...profile, skills: [...profile.skills] } }, ...applications]);
    setSelected(null); setActive("applications"); notify("Candidatura enviada com sucesso!");
  };
  // Junta vagas de exemplo às criadas pela empresa, remove as pausadas/encerradas
  // da busca pública e recalcula a pontuação sempre que o perfil muda.
  const allJobs: MatchedJob[] = useMemo(() => [...jobs, ...posted]
    .filter(j => j.status !== "Pausada" && j.status !== "Encerrada" && j.status !== "Rascunho")
    .map(j => ({ ...j, matchedSkills: getMatchedSkills(j, profile) })), [posted, profile]);
  // Aplica a busca textual e a modalidade; ordena pela contagem exata de competências coincidentes.
  const visibleJobs = useMemo(() => allJobs.filter(j =>
    `${j.role} ${j.company} ${j.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase()) && (mode === "Todas" || j.mode === mode)
  ).sort((a,b) => b.matchedSkills.length-a.matchedSkills.length), [allJobs, query, mode]);
  // Localiza uma vaga nas amostras ou na lista criada pela empresa atual.
  const byId = (id: number | string) => [...jobs, ...posted].find(j => j.id === id);
  // Funções centralizadas de gravação para que as telas compartilhem os mesmos dados.
  // Persiste alterações do perfil para que formulários e cartões usem o mesmo valor.
  const saveProfile = (next: Profile) => {
    setProfile(next); localStorage.setItem("ec-profile", JSON.stringify(next));
    if (supabase && authUser) void supabase.from("profiles").update({ full_name: next.name, headline: next.role, city: next.city, salary_monthly: next.salaryMonthly, declared_skills:next.skills, bio: next.bio, profile_visible: next.visible }).eq("id", authUser.id).then(({ error }) => { if (error) notify("Perfil salvo localmente; o banco recusou a atualização: " + error.message); });
  };
  // Cria ou atualiza uma vaga da empresa no banco (respeitando grants por coluna) ou no armazenamento local.
  const saveJob = async (job: Job, successMessage?: string) => {
    const companyName = employer.name.trim() || authCompany || "Empresa";
    const normalized: Job = { ...job, company: companyName, initials: companyName.slice(0, 2).toUpperCase() };
    if (!supabase || !authUser || accountRole !== "recruiter" || !authCompanyId) {
      const exists = posted.some(item => item.id === normalized.id);
      const next = exists ? posted.map(item => item.id === normalized.id ? normalized : item) : [normalized, ...posted];
      setPosted(next);
      localStorage.setItem("ec-posted", JSON.stringify(next));
      notify(successMessage || (exists ? "Vaga atualizada." : "Vaga publicada com sucesso!"));
      return true;
    }
    const wantsPublished = (normalized.status || "Ativa") === "Ativa";
    const effectiveUiStatus: Job["status"] = wantsPublished && !authCompanyVerified ? "Rascunho" : (normalized.status || "Ativa");
    const dbStatus = effectiveUiStatus === "Rascunho" ? "draft" : effectiveUiStatus === "Pausada" ? "paused" : effectiveUiStatus === "Encerrada" ? "closed" : "published";
    const editableFields = {
      title: normalized.role,
      description: normalized.description,
      requirements: normalized.tags.join(", "),
      benefits: normalized.benefits || null,
      salary_monthly: normalized.salaryMonthly,
      salary_currency: "BRL",
      experience_level: normalized.level,
      workplace_mode: normalized.mode === "Remoto" ? "remote" : normalized.mode === "Híbrido" ? "hybrid" : "onsite",
      city: normalized.location,
      status: dbStatus,
    };
    const isExistingDbJob = typeof normalized.id === "string";
    const result = isExistingDbJob
      ? await supabase.from("jobs").update(editableFields).eq("id", normalized.id).select("*, companies(name)").single()
      : await supabase.from("jobs").insert({ company_id: authCompanyId, created_by: authUser.id, ...editableFields }).select("*, companies(name)").single();
    if (result.error) {
      notify("O banco recusou a vaga: " + result.error.message);
      return false;
    }
    const savedRow = mapDatabaseJob(result.data as Record<string, any>);
    const next = isExistingDbJob ? posted.map(item => item.id === savedRow.id ? savedRow : item) : [savedRow, ...posted];
    setPosted(next);
    localStorage.setItem("ec-posted", JSON.stringify(next));
    notify(successMessage || (effectiveUiStatus === "Rascunho" ? "Vaga salva como rascunho. Ela poderá ser publicada após a validação da empresa." : isExistingDbJob ? "Vaga atualizada no banco." : "Vaga publicada com sucesso!"));
    return true;
  };
  const openNewJob = () => {
    setEditingJob(null);
    setShowNewJob(true);
  };
  // Sincroniza o quadro de candidaturas e sua cópia persistente.
  const saveApplications = (next: Application[]) => { setApplications(next); localStorage.setItem("ec-applications", JSON.stringify(next)); };
  // Atualiza somente a candidatura indicada, preservando o restante do histórico.
  const changeApplication = (appKey: number | string, changes: Partial<Application>) => {
    const matchApp = (app: Application) => (app.id ?? app.jobId) === appKey;
    const current = applications.find(matchApp);
    if (!current) return;
    if (supabase && authUser && current.id) {
      void (async () => {
        if (changes.status) {
          const { error } = await supabase.from("applications").update({ status: uiApplicationStatus[changes.status] || "submitted" }).eq("id", current.id);
          if (error) { notify("A etapa não foi salva no banco: " + error.message); return; }
        }
        let nextFeedbackId = current.feedbackId;
        if (changes.recruiterNote !== undefined) {
          const summary = changes.recruiterNote.trim();
          if (summary) {
            const { data: existing } = await supabase.from("application_feedback").select("id").eq("application_id", current.id).maybeSingle();
            if (existing) {
              const { error } = await supabase.from("application_feedback").update({ summary, visible_to_candidate: true }).eq("id", existing.id);
              if (error) { notify("O feedback não foi salvo no banco: " + error.message); return; }
              nextFeedbackId = existing.id;
            } else {
              const { data: inserted, error } = await supabase.from("application_feedback").insert({ application_id: current.id, author_id: authUser.id, summary }).select("id").single();
              if (error || !inserted) { notify("O feedback não foi salvo no banco: " + (error?.message || "erro inesperado")); return; }
              const { error: approveError } = await supabase.from("application_feedback").update({ visible_to_candidate: true }).eq("id", inserted.id);
              if (approveError) { notify("Feedback salvo como rascunho, mas não foi publicado ao candidato: " + approveError.message); return; }
              nextFeedbackId = inserted.id;
            }
          }
        }
        saveApplications(applications.map(app => matchApp(app) ? { ...app, ...changes, feedbackId: nextFeedbackId } : app));
        notify(changes.recruiterNote !== undefined ? "Feedback salvo e compartilhado com o candidato." : "Etapa da candidatura atualizada.");
      })();
    } else {
      saveApplications(applications.map(app => matchApp(app) ? { ...app, ...changes } : app));
      notify(changes.recruiterNote !== undefined ? "Feedback salvo." : "Etapa da candidatura atualizada.");
    }
  };
  // Gera uma cópia portátil dos dados locais; nenhum arquivo é enviado à rede.
  const exportData = () => { const data = { exportedAt: new Date().toISOString(), profile, applications, savedJobs: saved, companyJobs: posted, assessments: assessmentResults, privacyConsent }; const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "emprego-certo-meus-dados.json"; link.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000); notify("Cópia dos seus dados baixada."); };
  // Limpa somente chaves pertencentes ao protótipo no navegador atual e pede
  // confirmação porque a operação remove candidaturas, vagas e perfil locais.
  const deleteLocalData = () => { if (!window.confirm("Apagar os dados do Emprego Certo salvos neste navegador? Esta ação não pode ser desfeita.")) return; ["ec-profile","ec-applications","ec-saved","ec-posted","ec-privacy-consent","ec-employer","ec-assessments","ec-demo-entered","ec-data-cleanup-version"].forEach(k=>localStorage.removeItem(k)); window.location.reload(); };
  // Indicador de completude transparente: cada um dos oito campos preenchidos vale 12,5%.
  // Cada um dos oito itens preenchidos representa a mesma fração do indicador.
  const profileCompletion = Math.round(([profile.name, profile.role, profile.city, profile.salaryMonthly, profile.bio, profile.skills.length ? "skills" : "", profile.education, profile.experience].filter(Boolean).length / 8) * 100);
  // Contagens exatas derivadas dos registros locais; não são taxas de desempenho.
  const respondedCount = applications.filter(a => a.status !== "Inscrição enviada").length;
  const feedbackCount = applications.filter(a => Boolean(a.recruiterNote?.trim())).length;
  // Entra em um dos espaços demonstrativos, atualiza o papel ativo e grava os
  // dados fornecidos no formulário. Isso não cria uma conta real nem autentica alguém.
  const enterDemo = (role: "candidate" | "employer", nextProfile?: Profile, nextEmployer?: typeof employer) => {
    if (nextProfile) {
      // Cada novo perfil candidato começa sem candidaturas, consentimentos ou resultados de outra pessoa neste navegador.
      persistApps([]);
      setSaved([]);
      localStorage.setItem("ec-saved", JSON.stringify([]));
      setAssessmentResults([]);
      localStorage.setItem("ec-assessments", JSON.stringify([]));
      setPrivacyConsent(false);
      localStorage.setItem("ec-privacy-consent", JSON.stringify(false));
      saveProfile(nextProfile);
    }
    if (nextEmployer) { setEmployer(nextEmployer); localStorage.setItem("ec-employer", JSON.stringify(nextEmployer)); }
    setCompanyMode(role === "employer");
    setActive(role === "employer" ? "company" : "home");
    setEntered(true);
    localStorage.setItem("ec-demo-entered", "true");
  };
  // Encerra a sessão atual (Supabase ou demonstração local) e retorna à tela inicial.
  const handleLogout = async () => {
    setEditing(false);
    setMobileMenu(false);
    setSelected(null);
    setCompanyMode(false);
    setActive("home");
    setEntered(false);
    setEntryMode("choose");
    localStorage.removeItem("ec-demo-entered");
    localStorage.removeItem("ec-entry-kind");
    if (supabase) {
      await supabase.auth.signOut();
      setAuthUser(null);
      setAccountRole(null);
      setAuthCompany("");
      setAuthCompanyId(null);
      setAuthCompanyVerified(false);
    }
  };
  // A tela inicial oferece dois fluxos individuais. Depois da escolha, mostra o painel.
  if (supabase && authLoading) return <main className="entry-page"><section className="entry-content"><p>Verificando sua sessão...</p></section></main>;
  if (supabase && !authUser) return <AuthPortal client={supabase} notice={authNotice} onClearNotice={() => setAuthNotice("")} />;
  if (supabase && authUser && accountRole === "recruiter" && !authCompany) return <main className="entry-page"><section className="entry-content"><h1>Preparando o espaço da empresa</h1><p className="entry-subtitle">A conta foi autenticada, mas não foi possível confirmar ou criar a empresa. Revise a migração local e tente entrar novamente.</p><button className="primary-button" onClick={async () => { await supabase.auth.signOut(); }}>Sair</button></section></main>;
  if (!supabase && !entered) return <EntryPage mode={entryMode} onMode={setEntryMode} onEnter={enterDemo} />;

  return (
    <div className="shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <a className="brand" href="#inicio" onClick={e => { e.preventDefault(); setActive(companyMode ? "company" : "home"); }}><span className="brand-mark"><BriefcaseBusiness size={19} strokeWidth={2.5} /></span><span>emprego<span className="brand-light">certo</span><i>.</i></span></a>
        <div className="workspace-switch"><span className={`avatar ${companyMode ? "avatar-company" : ""}`}>{(companyMode ? employer.name || "Empresa" : profile.name || "Perfil").slice(0,2).toUpperCase()}</span><span className="workspace-label"><b>{companyMode ? (employer.name || "Sua empresa") : (profile.name || "Seu perfil")}</b><small>{companyMode ? "Área da empresa" : "Área do candidato"}</small></span>{companyMode && !authUser && <button className="workspace-exit" type="button" aria-label="Sair da área da empresa" title="Sair da área da empresa" onClick={() => { setCompanyMode(false); setActive("home"); }}><ChevronDown size={16} /></button>}</div>
        <div className="side-caption">MENU PRINCIPAL</div>
        <nav className="side-nav">{(companyMode ? [
          { key: "company", label: "Painel da empresa", icon: LayoutDashboard }, { key: "companyJobs", label: "Minhas vagas", icon: BriefcaseBusiness, count: String(posted.filter(j=>j.status!=="Encerrada").length) }, { key: "talents", label: "Candidatos", icon: Users }, { key: "reports", label: "Relatórios", icon: ChartNoAxesColumnIncreasing }, { key: "companyProfile", label: "Perfil da empresa", icon: Building2 },
        ] : nav).map(item => <button key={item.key} className={`nav-item ${active === item.key ? "nav-active" : ""}`} onClick={() => { setActive(item.key); setMobileMenu(false); }}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{"count" in item && <span className="nav-count">{item.key==="jobs"?allJobs.length:item.key==="applications"?applications.length:item.count}</span>}{"badge" in item && <span className="nav-badge">{item.badge}</span>}</button>)}</nav>
        {accountRole === "admin" && <nav className="side-nav"><button className={`nav-item ${active === "admin" ? "nav-active" : ""}`} onClick={() => setActive("admin")}><Settings size={18}/><span>Administração</span></button></nav>}
        {!companyMode && <><div className="side-caption side-caption-spaced">SUA CONTA</div><nav className="side-nav"><button className={`nav-item ${active === "profile" ? "nav-active" : ""}`} onClick={() => setActive("profile")}><UserRound size={18} /><span>Meu perfil</span><span className="profile-dot" /></button><button className="nav-item" onClick={() => notify("Central de ajuda não está implementada nesta demonstração.")}><CircleHelp size={18} /><span>Central de ajuda</span></button></nav></>}
        <div className="sidebar-bottom"><div className="pro-card"><div className="pro-icon"><Sparkles size={17} /></div><b>{companyMode ? "Configure sua empresa" : "Seu próximo passo começa aqui"}</b><p>{companyMode ? "Mantenha os dados institucionais atualizados nas suas vagas." : "Complete seu perfil e tenha mais chances de ser encontrado."}</p><button onClick={() => setActive(companyMode ? "companyProfile" : "profile")}>{companyMode ? "Perfil da empresa" : "Completar perfil"} <ArrowRight size={14} /></button></div>{!companyMode&&<button className="nav-item settings-item" onClick={() => setActive("settings")}><Settings size={18} /><span>Configurações</span></button>}<button className="nav-item settings-item" onClick={handleLogout}><LogOut size={18}/><span>{authUser ? "Sair da conta" : "Sair da demonstração"}</span></button><div className="sidebar-foot"><ShieldCheck size={14} /> {authUser ? "Conectado ao Supabase local" : "Dados salvos neste navegador"}</div></div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu-button icon-button" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu size={19} /></button><div className="breadcrumb">Workspace <ChevronRight size={14} /> <b>{companyMode ? "Empresa" : "Candidato"}</b></div><div className="top-actions"><button className="top-help" onClick={() => notify("Estamos aqui para ajudar.")}><CircleHelp size={17} /> Ajuda</button><button className="notification-button icon-button" aria-label="Notificações" onClick={() => notify("Você está em dia com suas notificações.")}><Bell size={19} /><i /></button><div className="top-divider" /><button className="top-user" onClick={() => setActive(companyMode ? "companyProfile" : "profile")}><span className="avatar avatar-small">{(companyMode ? employer.name : profile.name).slice(0,2).toUpperCase()}</span><ChevronDown size={14} /></button></div></header>
        <div className="content">
          {accountRole === "admin" && active === "admin" && supabase && <AdminPanel client={supabase}/>}
          {/* Painel do candidato: resume candidaturas, perfil e vagas recomendadas com dados locais. */} {active === "home" && !companyMode && <>
            <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> {todayLabel || "DATA ATUAL"}</div><h1>{authUser?`Olá, ${profile.name}.`:`Perfil demonstrativo de ${profile.name}.`}</h1><p className="page-subtitle">{allJobs.length} vagas publicadas para esta conta.</p></div><button className="outline-button" onClick={() => setActive("profile")}><UserRound size={16} /> Editar perfil</button></div>
            <div className="hero-card"><div className="hero-content"><div className="hero-pill"><Sparkles size={13} /> VAGAS DISPONÍVEIS</div><h2>Competências cadastradas<br />em cada vaga.</h2><p>A lista abaixo mostra a contagem exata de competências também presentes no perfil.</p><button className="hero-button" onClick={() => setActive("jobs")}>Consultar vagas <ArrowRight size={16} /></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-circle"><Target size={48} strokeWidth={1.25}/></div><div className="floating-card floating-match"><span className="mini-check"><Check size={12}/></span><span><b>{allJobs.length} vagas</b><small>anúncios cadastrados</small></span></div><div className="floating-card floating-check"><span className="mini-brief"><BriefcaseBusiness size={15}/></span><span><b>{allJobs.filter(job=>job.matchedSkills.length>0).length} com coincidência</b><small>por igualdade textual</small></span></div><span className="sparkle sparkle-a">✳</span><span className="sparkle sparkle-b">✳</span></div></div>
            <div className="stats-grid"><div className="stat-card"><span className="stat-icon stat-violet"><BriefcaseBusiness size={18}/></span><span className="stat-change">{authUser?"dados do banco":"base demonstrativa"}</span><b>{allJobs.filter(job=>job.matchedSkills.length>0).length}</b><small>vagas com competência coincidente</small></div><div className="stat-card"><span className="stat-icon stat-blue"><FileText size={18}/></span><span className="stat-change">{authUser?"conta autenticada":"registro local"}</span><b>{applications.length.toString().padStart(2,"0")}</b><small>candidaturas na conta</small></div><div className="stat-card"><span className="stat-icon stat-green"><TrendingUp size={18}/></span><span className="stat-change">8 campos com mesmo peso</span><b>{profileCompletion}<span className="stat-unit">%</span></b><small>campos preenchidos no perfil</small><div className="progress-track"><span style={{width:profileCompletion+"%"}}/></div></div><div className="stat-card"><span className="stat-icon stat-amber"><BookmarkCheck size={18}/></span><span className="stat-change">{authUser?"conta autenticada":"registro local"}</span><b>{saved.length.toString().padStart(2,"0")}</b><small>vagas salvas na conta</small></div></div>
            <section className="section-block"><div className="section-heading"><div><div className="section-kicker"><Sparkles size={13}/> FEITAS PARA VOCÊ</div><h2>Vagas em destaque</h2><p>Oportunidades com maior compatibilidade com seu perfil.</p></div><button className="text-link" onClick={() => setActive("jobs")}>Ver todas as vagas <ArrowRight size={15}/></button></div><div className="job-grid">{visibleJobs.slice(0,3).map(job => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} applied={applications.some(a => a.jobId === job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => setSelected(job)} />)}</div></section>
            <div className="bottom-grid"><section className="panel recent-panel"><div className="panel-heading"><div><h3>Candidaturas da conta</h3><p>Etapa atual registrada para cada candidatura.</p></div><button className="small-link" onClick={() => setActive("applications")}>Consultar lista <ArrowRight size={14}/></button></div><div className="application-list">{applications.slice(0,3).map(app => { const job = byId(app.jobId); if (!job) return null; return <div className="application-row" key={app.jobId}><CompanyLogo job={job}/><div className="application-info"><b>{job.role}</b><small>{job.company} · {app.date}</small></div><Status status={app.status}/><ChevronRight size={15} className="row-chevron"/></div>; })}</div>{applications.length===0&&<p className="local-note">Nenhuma candidatura foi registrada.</p>}</section><section className="panel transparency-panel"><div className="transparency-top"><span className="transparency-icon"><ShieldCheck size={18}/></span><span className="transparency-label">DADOS DO PROTÓTIPO</span></div><h3>Valores fixos<br/>e identificados.</h3><p>Salários demonstrativos são informados como valor mensal bruto único.</p><div className="transparency-metric"><b>{allJobs.length}</b><span>vagas publicadas<br/>no catálogo</span><ArrowUpRight size={16}/></div></section></div>
          </>}

          {/* Busca pública: filtros locais e ordenação pelo cálculo explicável de compatibilidade. */} {active === "jobs" && <><div className="page-heading"><div><div className="eyebrow">OPORTUNIDADES PARA VOCÊ</div><h1>Encontrar vagas</h1><p className="page-subtitle">Vagas transparentes, com salário e expectativas desde o início.</p></div><button className="outline-button" onClick={() => { setActive("saved"); }}> <Heart size={16}/> Salvas ({saved.length})</button></div><div className="job-search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cargo, empresa ou competência"/><span className="search-divider"/><MapPin size={17}/><input className="location-search" defaultValue="Brasil" aria-label="Localização"/><button className={`filter-button ${showFilters ? "filter-on" : ""}`} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={16}/> Filtros</button></div>{showFilters && <div className="filter-row"><span>Modalidade:</span>{["Todas","Remoto","Híbrido","Presencial"].map(x => <button key={x} className={`filter-chip ${mode === x ? "filter-chip-active" : ""}`} onClick={() => setMode(x)}>{x}</button>)}<span className="filter-hint"><CheckCircle2 size={14}/> Salário informado em todas as vagas</span></div>}<div className="results-meta"><span><b>{visibleJobs.length} vagas</b> encontradas para você</span><button className="sort-button" onClick={() => notify("Vagas ordenadas pelas melhores compatibilidades.")}><Filter size={15}/> Melhor compatibilidade <ChevronDown size={14}/></button></div><div className="all-jobs-list">{visibleJobs.map(job => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} applied={applications.some(a => a.jobId === job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => setSelected(job)} horizontal />)}{visibleJobs.length === 0 && <EmptyState title="Nenhuma vaga encontrada" text="Tente mudar os termos da busca ou os filtros."/>}</div></>}

          {/* Histórico individual: etapas, feedback da empresa e ação para retirar inscrição. */} {active === "applications" && <><div className="page-heading"><div><div className="eyebrow">ACOMPANHE SEUS PROCESSOS</div><h1>Minhas candidaturas</h1><p className="page-subtitle">Cada passo importa. Veja onde você está e o que vem a seguir.</p></div><button className="primary-button" onClick={() => setActive("jobs")}><Search size={16}/> Encontrar vagas</button></div><div className="application-summary"><div><b>{applications.length}</b><span>candidaturas enviadas</span></div><div><b>{applications.filter(x=>x.status==="Em análise").length}</b><span>em análise</span></div><div><b>{applications.filter(x=>x.status==="Entrevista").length}</b><span>entrevistas</span></div></div><div className="applications-board">{applications.map((app,index) => { const job=byId(app.jobId); if(!job)return null; return <div className="application-detail-card" key={app.id??app.jobId}><div className="app-card-top"><CompanyLogo job={job}/><span className="app-date">Inscrição em {app.date}</span><button className="icon-button app-more" onClick={()=>notify("Detalhes da candidatura.")}><ChevronDown size={17}/></button></div><h3>{job.role}</h3><p>{job.company} · {job.location} · {job.mode}</p><div className="app-salary">{formatMonthlySalary(job.salaryMonthly)} <span>· salário divulgado</span></div><div className="timeline"><div className="timeline-step done"><span><Check size={12}/></span><small>Candidatura<br/>enviada</small></div><i className="timeline-line done-line"/><div className={`timeline-step ${index === 0 ? "current" : ""} ${app.status === "Entrevista" ? "done" : ""}`}><span>{app.status === "Entrevista" ? <Check size={12}/> : <Clock3 size={12}/>}</span><small>Em análise<br/>pela empresa</small></div><i className="timeline-line"/><div className="timeline-step"><span><MessageSquareText size={12}/></span><small>Próxima<br/>etapa</small></div></div>{app.recruiterNote&&<div className="candidate-feedback"><b>Feedback da empresa</b><p>{app.recruiterNote}</p></div>}<div className="app-card-bottom"><Status status={app.status}/>{!["Contratado","Não selecionado","Desistiu"].includes(app.status)&&<button className="small-link danger-link" onClick={()=>{if(window.confirm("Retirar sua candidatura desta vaga?"))changeApplication(app.id??app.jobId,{status:"Desistiu"})}}>Retirar candidatura</button>}<button className="small-link" onClick={()=>setSelected(job)}>Ver vaga <ArrowRight size={14}/></button></div></div>; })}{applications.length===0 && <EmptyState title="Sua próxima oportunidade começa aqui" text="Explore vagas com salário transparente e candidate-se em poucos passos." action="Explorar vagas" onAction={()=>setActive("jobs")}/>}</div></>}

          {/* Perfil editável: campos controlados pelo React e salvos ao confirmar. */} {active === "profile" && !companyMode && <><div className="page-heading"><div><div className="eyebrow">SEU ESPAÇO PROFISSIONAL</div><h1>Meu perfil</h1><p className="page-subtitle">Mostre o melhor de você. Um perfil completo aumenta sua visibilidade.</p></div><div className="page-heading-actions"><button className="primary-button" onClick={()=>{if(editing)saveProfile(profile);setEditing(!editing);notify(editing?"Perfil salvo com sucesso.":"Modo de edição ativado.");}}>{editing?<><Check size={16}/> Salvar alterações</>:<><FileText size={16}/> Editar perfil</>}</button><button className="outline-button" onClick={handleLogout}><LogOut size={16}/> Sair da conta</button></div></div><div className="profile-layout"><div className="panel profile-main"><div className="profile-cover"><div className="profile-avatar">{profile.name.slice(0,2).toLocaleUpperCase("pt-BR")||"?"}</div><div className="profile-completion"><span>PERFIL COMPLETO</span><b>{profileCompletion}%</b><div className="progress-track"><span style={{width:profileCompletion+"%"}}/></div></div></div><div className="profile-details"><div className="profile-name-row"><div>{editing ? <div className="profile-edit-fields"><label>Nome<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label><label>Cargo<input value={profile.role} onChange={e=>setProfile({...profile,role:e.target.value})}/></label><label>Cidade<input value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label></div> : <><h2>{profile.name}</h2><p>{profile.role} · {profile.city}</p></>}</div><span className="open-work">{profile.visible?"Visibilidade ativada":"Visibilidade desativada"}</span></div><div className="detail-divider"/><div className="profile-section-title"><h3>Sobre mim</h3>{editing&&<span className="editing-label">Editando</span>}</div>{editing?<textarea className="profile-textarea" value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})} rows={4} aria-label="Sobre mim"/>:<p className="profile-bio">{profile.bio}</p>}<div className="profile-section-title"><h3>Competências</h3><button className="tiny-add" onClick={()=>setEditing(true)}><Plus size={14}/> Adicionar</button></div>{editing?<textarea className="profile-textarea" value={profile.skills.join(", ")} onChange={e=>setProfile({...profile,skills:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})} rows={2} aria-label="Competências separadas por vírgula"/>:<div className="skill-tags">{profile.skills.map(s=><span key={s} className="skill-tag">{s}</span>)}</div>}<div className="detail-divider"/><div className="profile-section-title"><h3>Experiência profissional</h3><button className="tiny-add" onClick={()=>setEditing(true)}><Plus size={14}/> Adicionar</button></div>{editing?<textarea className="profile-textarea" value={profile.experience} onChange={e=>setProfile({...profile,experience:e.target.value})} rows={4} aria-label="Experiências"/>:<div className="profile-bio profile-multiline">{profile.experience}</div>}<div className="profile-section-title"><h3>Formação</h3></div>{editing?<textarea className="profile-textarea" value={profile.education} onChange={e=>setProfile({...profile,education:e.target.value})} rows={2} aria-label="Formação"/>:<p className="profile-bio">{profile.education}</p>}</div></div><div className="profile-side"><div className="panel visibility-card"><span className="stat-icon stat-green"><ShieldCheck size={18}/></span><h3>{profile.visible?"Seu perfil está visível":"Perfil oculto"}</h3><p>{profile.visible?"Empresas podem encontrar seu perfil quando buscam profissionais como você.":"Seu perfil não aparece nas buscas de recrutadores."}</p><button className="text-link" onClick={()=>{const next={...profile,visible:!profile.visible};saveProfile(next);notify(next.visible?"Perfil visível para empresas.":"Perfil ocultado das buscas.");}}>{profile.visible?"Ocultar perfil":"Tornar perfil visível"} <ArrowRight size={14}/></button></div><div className="panel profile-preferences"><h3>Preferências profissionais</h3><div><MapPin size={16}/><span><small>Cidade e UF</small><b>{profile.city} · Brasil</b></span></div><div><TrendingUp size={16}/><span><small>Pretensão bruta mensal (valor único)</small>{editing?<input className="preference-input" type="number" min="1" step="1" value={profile.salaryMonthly ?? ""} onChange={e=>setProfile({...profile,salaryMonthly:e.target.value?Number(e.target.value):null})}/>:<b>{formatMonthlySalary(profile.salaryMonthly)}</b>}</span></div><button className="preferences-edit" onClick={()=>setEditing(true)}>Editar preferências <ArrowRight size={14}/></button></div><div className="panel skills-prompt"><div className="prompt-icon"><Sparkles size={17}/></div><h3>Valide suas competências</h3><p>Mostre o que você sabe com avaliações práticas reconhecidas.</p><button onClick={()=>setActive("evolution")}>Ver avaliações <ArrowRight size={14}/></button></div></div></div></>}

          {/* Evolução: recomendações educativas e resultados de autoavaliações locais. */} {active === "evolution" && <><div className="page-heading"><div><div className="eyebrow">SEU DESENVOLVIMENTO, NO SEU RITMO</div><h1>Minha evolução</h1><p className="page-subtitle">Reconheça seus pontos fortes e descubra onde crescer.</p></div></div><div className="evolution-hero"><div><div className="hero-pill"><Sparkles size={13}/> SUA JORNADA PROFISSIONAL</div><h2>Todo passo conta<br/>na sua <em>evolução.</em></h2><p>Use feedbacks e avaliações para transformar seus objetivos em próximos passos concretos.</p><button className="hero-button" onClick={()=>notify("Em breve: avaliações de competências.")}>Explorar avaliações <ArrowRight size={15}/></button></div><div className="evolution-score"><div className="score-ring"><div><b>{profileCompletion}</b><small>/ 100</small></div></div><span>Perfil profissional</span><small>+8 pontos nos últimos 30 dias</small></div></div><div className="section-heading evolution-heading"><div><div className="section-kicker"><Target size={13}/> PLANO DE DESENVOLVIMENTO</div><h2>Próximos passos recomendados</h2><p>Pequenas ações para deixar seu perfil ainda mais forte.</p></div></div><div className="recommendation-grid"><div className="panel recommendation"><span className="recommendation-icon icon-lavender"><ChartNoAxesColumnIncreasing size={18}/></span><span className="recommendation-tag">HARD SKILL</span><h3>Faça uma autoavaliação de SQL</h3><p>Responda questões básicas e registre seu resultado neste dispositivo.</p><button onClick={()=>setShowAssessment(true)}>Fazer avaliação <ArrowRight size={14}/></button></div><div className="panel recommendation"><span className="recommendation-icon icon-sky"><MessageSquareText size={18}/></span><span className="recommendation-tag">SOFT SKILL</span><h3>Destaque sua comunicação</h3><p>Complete seu perfil com exemplos de como você colabora e compartilha ideias no dia a dia.</p><button onClick={()=>notify("Não há dicas de perfil cadastradas nesta demonstração.")}>Ver dicas <ArrowRight size={14}/></button></div><div className="panel recommendation"><span className="recommendation-icon icon-mint"><GraduationCap size={18}/></span><span className="recommendation-tag">PERFIL</span><h3>Adicione sua formação</h3><p>Inclua sua formação acadêmica para melhorar a compatibilidade com mais oportunidades.</p><button onClick={()=>notify("Editor de formação em breve.")}>Adicionar formação <ArrowRight size={14}/></button></div></div><section className="panel assessment-history"><h3>Autoavaliações realizadas</h3>{assessmentResults.length?assessmentResults.map((result,i)=><div className="assessment-result" key={i}><span>{result.skill} · {result.date}</span><b>{result.score}%</b></div>):<p>Ainda não há resultados. As autoavaliações são para aprendizado e não são certificações.</p>}</section><section className="panel feedback-panel"><div className="feedback-icon"><MessageSquareText size={18}/></div><div><h3>Feedbacks das suas candidaturas</h3><p>Os retornos registrados pela empresa nesta demonstração aparecem abaixo.</p></div><span className="feedback-empty">{applications.filter(app=>app.recruiterNote).length} feedback(s)</span></section>{applications.filter(app=>app.recruiterNote).map(app=><div className="candidate-feedback" key={app.jobId}><b>{byId(app.jobId)?.role||"Candidatura"} · retorno da empresa</b><p>{app.recruiterNote}</p></div>)}</>}

          {active === "saved" && <><div className="page-heading"><div><div className="eyebrow">OPORTUNIDADES QUE VOCÊ GUARDOU</div><h1>Vagas salvas</h1><p className="page-subtitle">Volte quando quiser e candidate-se no seu tempo.</p></div><button className="outline-button" onClick={()=>setActive("jobs")}><Search size={16}/> Buscar vagas</button></div><div className="all-jobs-list">{allJobs.filter(j=>saved.includes(j.id)).map(job=><JobCard key={job.id} job={job} saved={true} applied={applications.some(a=>a.jobId===job.id)} onSave={()=>toggleSaved(job.id)} onOpen={()=>setSelected(job)} horizontal/>)}{saved.length===0&&<EmptyState title="Ainda não há vagas salvas" text="Salve oportunidades interessantes para encontrá-las facilmente depois." action="Encontrar vagas" onAction={()=>setActive("jobs")}/>}</div></>}

          {/* Painel da empresa: indicadores derivados das vagas e candidaturas da conta. */} {companyMode && active === "company" && <><div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> ÁREA DA EMPRESA</div><h1>Olá, {employer.name || "Empresa"}!</h1><p className="page-subtitle">Veja como estão seus processos seletivos.</p></div><button className="primary-button" onClick={openNewJob}><Plus size={17}/> {supabase&&authUser&&!authCompanyVerified?"Criar rascunho de vaga":"Publicar vaga"}</button></div>{supabase&&authUser&&!authCompanyVerified&&<div className="company-notice">Empresa aguardando validação administrativa. Você já pode cadastrar, editar e gerenciar vagas em <b>Rascunho</b> e configurar o perfil da empresa; a publicação pública para candidatos é liberada após a validação pelo administrador.</div>}<div className="company-stats"><div className="stat-card"><span className="stat-icon stat-violet"><BriefcaseBusiness size={18}/></span><span className="stat-change">{authUser?"Registros no banco":"Registro local"}</span><b>{posted.filter(job=>job.status==="Ativa").length}</b><small>vagas com status Ativa</small></div><div className="stat-card"><span className="stat-icon stat-blue"><Users size={18}/></span><span className="stat-change">{authUser?"Conta autenticada":"Registro local"}</span><b>{applications.length}</b><small>candidaturas registradas</small></div><div className="stat-card"><span className="stat-icon stat-green"><Clock3 size={18}/></span><span className="stat-change">Etapa alterada</span><b>{respondedCount}</b><small>de {applications.length} candidaturas</small></div><div className="stat-card"><span className="stat-icon stat-amber"><MessageSquareText size={18}/></span><span className="stat-change">Texto salvo</span><b>{feedbackCount}</b><small>candidaturas com feedback</small></div></div><div className="company-content-grid"><section className="panel company-vacancies"><div className="panel-heading"><div><h3>Suas vagas</h3><p>Gerencie vagas e acompanhe candidaturas.</p></div><button className="small-link" onClick={()=>setActive("companyJobs")}>Ver todas <ArrowRight size={14}/></button></div>{posted.length?posted.slice(0,4).map(job=><div className="vacancy-row" key={job.id}><span className="vacancy-dot"/><div><b>{job.role}</b><small>{job.mode} · {job.location}</small></div><span className="candidate-count"><Users size={14}/>{applications.filter(app=>app.jobId===job.id).length}</span><Status status={job.status||"Ativa"}/><button className="icon-button" onClick={()=>setActive("companyJobs")} aria-label="Gerenciar vaga"><ChevronRight size={16}/></button></div>):<div className="company-empty">Cadastre sua primeira vaga para começar a organizar seus processos seletivos.</div>}</section><div className="company-side-cards"><div className="panel response-card"><span className="response-icon"><MessageSquareText size={18}/></span><div><span className="section-kicker">TRANSPARÊNCIA</span><h3>Bom trabalho!</h3><p>{respondedCount} de {applications.length} candidaturas têm status diferente de "Inscrição enviada".</p><div className="response-bar"><span style={{width:applications.length?`${respondedCount/applications.length*100}%`:"0%"}}/></div><small>{respondedCount} de {applications.length} candidaturas</small></div></div><div className="panel hiring-tip"><Sparkles size={17}/><b>Dica para sua próxima vaga</b><p>Informe competências exigidas, cidade e UF ou abrangência remota, modalidade e salário bruto mensal único.</p></div></div></div></>}

          {/* Privacidade: consentimento, visibilidade, cópia e exclusão dos dados locais. */} {active === "settings" && !companyMode && <><div className="page-heading"><div><div className="eyebrow">CONTROLE DOS SEUS DADOS</div><h1>Privacidade e dados</h1><p className="page-subtitle">Escolha como seus dados são usados neste protótipo local.</p></div></div><div className="panel privacy-panel"><div className="privacy-row"><div><b>Compartilhar meu perfil ao me candidatar</b><p>Seu perfil profissional é incluído nas candidaturas realizadas na conta autenticada.</p></div><label className="switch"><input type="checkbox" checked={privacyConsent} onChange={async e=>{const granted=e.target.checked;if(supabase&&authUser){const {error}=await supabase.rpc("record_privacy_consent",{target_purpose:"application_profile_sharing",is_granted:granted});if(error){notify("O banco recusou o consentimento: "+error.message);return;}}setPrivacyConsent(granted);localStorage.setItem("ec-privacy-consent",JSON.stringify(granted));if(!granted){const next=applications.map(({candidateSnapshot,...application})=>application);persistApps(next);}}}/><span/></label></div><div className="privacy-row"><div><b>Visibilidade nas buscas</b><p>Empresas podem visualizar seu perfil demonstrativo quando ele está público.</p></div><label className="switch"><input type="checkbox" checked={profile.visible} onChange={async e=>{const visible=e.target.checked;if(supabase&&authUser){const {error}=await supabase.rpc("record_privacy_consent",{target_purpose:"profile_discovery",is_granted:visible});if(error){notify("O banco recusou o consentimento: "+error.message);return;}}saveProfile({...profile,visible});}}/><span/></label></div><div className="privacy-row"><div><b>Baixar uma cópia dos dados</b><p>Exporte perfil, candidaturas, vagas salvas e vagas publicadas em JSON.</p></div><button className="outline-button" onClick={exportData}><FileText size={15}/> Baixar meus dados</button></div><div className="privacy-row privacy-danger"><div><b>Apagar os dados deste navegador</b><p>Remove os dados locais do Emprego Certo na conta autenticada.</p></div><button className="danger-button" onClick={deleteLocalData}>Apagar dados</button></div><p className="local-note">Este controle não apaga dados de um servidor: o protótipo não envia dados para serviços externos.</p></div></>}
          {/* Gestão de vagas: edição e transição entre rascunho, ativa, pausada e encerrada. */} {companyMode && active === "companyJobs" && <><div className="page-heading"><div><div className="eyebrow">GESTÃO DE OPORTUNIDADES</div><h1>Minhas vagas</h1><p className="page-subtitle">Edite, pause, reative ou encerre as vagas da empresa.</p></div><button className="primary-button" onClick={openNewJob}><Plus size={16}/> {supabase&&authUser&&!authCompanyVerified?"Criar rascunho de vaga":"Publicar vaga"}</button></div>{supabase&&authUser&&!authCompanyVerified&&<div className="company-notice">Empresa aguardando validação administrativa. Novas vagas são salvas como <b>Rascunho</b> até a validação pelo administrador.</div>}<div className="company-job-list">{posted.map(job=><div className="panel managed-job" key={job.id}><CompanyLogo job={job}/><div className="managed-job-info"><b>{job.role}</b><small>{job.mode} · {job.location} · {formatMonthlySalary(job.salaryMonthly)}</small><span>Competências: {job.tags.join(", ")||"não informadas"}</span></div><Status status={job.status||"Ativa"}/><button className="small-link" onClick={()=>{setEditingJob(job);setShowNewJob(true)}}>Editar</button>{job.status==="Rascunho"?<button className="small-link" onClick={()=>{if(supabase&&authUser&&!authCompanyVerified){notify("A administração precisa validar a empresa antes de publicar vagas publicamente.");return;}void saveJob({...job,status:"Ativa"},"Vaga publicada com sucesso!");}}>Publicar</button>:job.status==="Encerrada"?<button className="small-link" onClick={()=>{const nextStatus=supabase&&authUser&&!authCompanyVerified?"Rascunho":"Ativa";void saveJob({...job,status:nextStatus},nextStatus==="Rascunho"?"Vaga reaberta como rascunho.":"Vaga reativada.");}}>Reabrir</button>:<button className="small-link danger-link" onClick={()=>{const nextStatus=job.status==="Pausada"?(supabase&&authUser&&!authCompanyVerified?"Rascunho":"Ativa"):"Pausada";void saveJob({...job,status:nextStatus},nextStatus==="Pausada"?"Vaga pausada.":"Vaga reativada.");}}>{job.status==="Pausada"?"Reativar":"Pausar"}</button>}{job.status!=="Encerrada"&&<button className="icon-button" aria-label="Encerrar vaga" title="Encerrar vaga" onClick={()=>void saveJob({...job,status:"Encerrada"},"Vaga encerrada.")}><X size={16}/></button>}</div>)}{posted.length===0&&<EmptyState title="Cadastre sua primeira vaga" text="Inclua salário bruto mensal, modalidade, requisitos e benefícios." action={supabase&&authUser&&!authCompanyVerified?"Criar rascunho de vaga":"Criar vaga"} onAction={openNewJob}/>}</div></>}
          {/* Recrutamento: atualizar etapa e salvar feedback por candidatura. */} {companyMode && active === "talents" && <><div className="page-heading"><div><div className="eyebrow">PROCESSOS SELETIVOS</div><h1>Candidatos</h1><p className="page-subtitle">Atualize a etapa e deixe feedback para cada candidatura.</p></div></div><div className="applications-board">{applications.map(app=>{const job=byId(app.jobId);const shared=app.candidateSnapshot;const appKey=app.id??app.jobId;if(!job)return null;return <div className="application-detail-card" key={appKey}><div className="app-card-top"><span className="avatar">{shared?shared.name.slice(0,2).toUpperCase():"—"}</span><span className="app-date">Candidatura registrada em {app.date}</span><span className="match-pill">{shared?`${getMatchedSkills(job,shared).length} competências coincidentes`:"Perfil não compartilhado"}</span></div><h3>{shared?`${shared.name} · ${shared.role}`:"Dados de perfil não compartilhados"}</h3><p>Vaga: {job.role} · {job.company}</p>{shared?<><div className="skill-tags">{shared.skills.map(skill=><span className="skill-tag" key={skill}>{skill}</span>)}</div><p className="local-note">Os dados exibidos são a cópia autorizada no envio desta candidatura.</p></>:<p className="local-note">Este registro antigo não contém uma cópia de perfil autorizada; nenhum dado do perfil ativo do navegador é exibido.</p>}<label className="field-label">Etapa registrada<select className="pipeline-select" value={app.status} onChange={e=>changeApplication(appKey,{status:e.target.value})}>{["Inscrição enviada","Em análise","Teste técnico","Entrevista","Oferta","Contratado","Não selecionado","Desistiu"].map(s=><option key={s}>{s}</option>)}</select></label><form className="feedback-form" onSubmit={e=>{e.preventDefault();const note=new FormData(e.currentTarget).get("feedback");changeApplication(appKey,{recruiterNote:String(note??"")});}}><label className="field-label">Feedback para a pessoa candidata<textarea name="feedback" className="profile-textarea" defaultValue={app.recruiterNote||""} placeholder="Informe o texto exato do retorno." rows={3}/></label><button className="outline-button" type="submit"><Check size={15}/> Salvar feedback</button></form><small className="local-note">{authUser?"Registro salvo no banco local com controle de consentimento.":"Registro fictício local; não corresponde a uma candidatura real."}</small></div>})}{applications.length===0&&<EmptyState title="Nenhuma candidatura recebida" text="Candidaturas às vagas publicadas aparecerão aqui."/>}</div></>}
          {/* Relatórios recalculados dos registros cadastrados. */} {companyMode && active === "reports" && <><div className="page-heading"><div><div className="eyebrow">INDICADORES DA EMPRESA</div><h1>Relatórios</h1><p className="page-subtitle">Indicadores calculados com as candidaturas e vagas cadastradas.</p></div></div><div className="panel reports-placeholder"><div className="report-metric"><span>Candidaturas com etapa diferente de Inscrição enviada</span><b>{respondedCount} de {applications.length}</b></div><div className="report-metric"><span>Vagas cadastradas pela empresa</span><b>{posted.length}</b><small>Contagem de vagas em todos os status cadastrados.</small></div><div className="report-metric"><span>Vagas com salário mensal cadastrado</span><b>{posted.filter(job=>job.salaryMonthly !== null).length} de {posted.length}</b></div></div></>}
          {/* Perfil institucional editável da empresa. */} {companyMode && active === "companyProfile" && <><div className="page-heading"><div><div className="eyebrow">SUA ORGANIZAÇÃO</div><h1>Perfil da empresa</h1><p className="page-subtitle">Edite as informações exibidas nas suas vagas.</p></div><div className="page-heading-actions"><button className="outline-button" type="button" onClick={handleLogout}><LogOut size={16}/> Sair da conta</button></div></div><form className="panel company-profile-form" onSubmit={async e=>{e.preventDefault();const nextEmployer={name:employer.name.trim(),website:employer.website.trim(),description:employer.description.trim()};if(supabase&&authUser&&authCompanyId){const {error}=await supabase.from("companies").update({name:nextEmployer.name,website:nextEmployer.website||null,description:nextEmployer.description||null}).eq("id",authCompanyId);if(error){notify("Perfil da empresa não foi salvo: "+error.message);return;}setEmployer(nextEmployer);setAuthCompany(nextEmployer.name);setPosted(current=>current.map(job=>({...job,company:nextEmployer.name,initials:nextEmployer.name.slice(0,2).toUpperCase()})));notify("Perfil da empresa salvo no banco.");}else{setEmployer(nextEmployer);localStorage.setItem("ec-employer",JSON.stringify(nextEmployer));notify("Perfil da empresa salvo neste navegador.");}}}><label className="field-label">Nome da empresa<input value={employer.name} onChange={e=>setEmployer({...employer,name:e.target.value})} required/></label><label className="field-label">Site<input value={employer.website} onChange={e=>setEmployer({...employer,website:e.target.value})} placeholder="https://empresa.com.br"/></label><label className="field-label">Sobre a empresa<textarea className="profile-textarea" value={employer.description} onChange={e=>setEmployer({...employer,description:e.target.value})} rows={5} placeholder="Conte sobre a empresa, a equipe e a cultura."/></label><button className="primary-button" type="submit"><Check size={15}/> Salvar perfil</button></form></>}        </div>
        <footer className="footer"><span>© 2026 Emprego Certo</span><span>Protótipo: vagas e empresas são exemplos ilustrativos.</span><a href="#privacidade" onClick={e=>{e.preventDefault();notify("Política de privacidade em breve.")}}>Privacidade</a></footer>
      </main>
      {/* Modal de vaga: detalhes, faixa salarial, competências, match e candidatura. */} {selected && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="job-modal" role="dialog" aria-modal="true" aria-labelledby="job-title"><button className="modal-close icon-button" onClick={()=>setSelected(null)} aria-label="Fechar"><X size={20}/></button><div className="modal-company"><CompanyLogo job={selected}/><span className="match-pill">{getMatchedSkills(selected,profile).length} competências coincidentes</span></div><h2 id="job-title">{selected.role}</h2><p className="modal-company-name">{selected.company} · {selected.location}</p><div className="job-quickfacts"><span><MapPin size={15}/>{selected.mode}</span><span><BriefcaseBusiness size={15}/>{selected.level}</span><span><Clock3 size={15}/>{selected.posted}</span></div><div className="salary-highlight"><span>SALÁRIO BRUTO MENSAL</span><b>{formatMonthlySalary(selected.salaryMonthly)}</b><small>Valor fixo do anúncio demonstrativo; não representa oferta real.</small></div><h3>Sobre a oportunidade</h3><p className="modal-description">{selected.description}</p><h3>Competências para esta vaga</h3><div className="skill-tags">{selected.tags.map(t=><span className="skill-tag" key={t}>{t}</span>)}</div>{selected.benefits&&<><h3>Benefícios</h3><p className="modal-description">{selected.benefits}</p></>}<div className="match-explanation"><span className="match-explanation-icon"><Sparkles size={16}/></span><span><b>Competências coincidentes</b><small>{getMatchedSkills(selected,profile).length} de {selected.tags.length} competências exigidas têm igualdade textual com o perfil. Esta contagem não avalia proficiência.</small></span></div><div className="modal-actions"><button className="primary-button apply-button" onClick={()=>apply(selected)}>{applications.some(a=>a.jobId===selected.id)?<><Check size={17}/> Candidatura enviada</>:<>Candidatar-se agora <ArrowRight size={17}/></>}</button><button className={`save-button ${saved.includes(selected.id)?"save-active":""}`} onClick={()=>toggleSaved(selected.id)}><Heart size={17} fill={saved.includes(selected.id)?"currentColor":"none"}/>{saved.includes(selected.id)?"Salva":"Salvar vaga"}</button></div><p className="modal-privacy"><ShieldCheck size={13}/> Seus dados só serão compartilhados com esta empresa quando você se candidatar.</p></div></div>}
      {showNewJob && <NewJobModal initial={editingJob} draftOnly={Boolean(supabase && authUser && !authCompanyVerified)} onClose={()=>{setShowNewJob(false);setEditingJob(null)}} onCreate={async job=>{const ok=await saveJob(job);if(ok){setShowNewJob(false);setEditingJob(null);setActive("companyJobs");}}}/>}
      {showAssessment && <SkillAssessmentModal onClose={()=>setShowAssessment(false)} onComplete={score=>{const next=[{skill:"SQL básico",score,date:new Intl.DateTimeFormat("pt-BR").format(new Date())},...assessmentResults];setAssessmentResults(next);localStorage.setItem("ec-assessments",JSON.stringify(next));setShowAssessment(false);notify(`Autoavaliação registrada: ${score}%`);}}/>}
      {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
    </div>
  );
}

/** Apresenta as iniciais e aplica a classe de cor definida na vaga. */
function CompanyLogo({job}:{job:Job}) { return <span className={`company-logo logo-${job.color}`}>{job.initials}</span>; }
/**
 * Converte o texto de status em classes CSS para manter a mesma aparência nos
 * painéis. Os status não reconhecidos usam o estilo padrão de etapa ativa.
 */
function Status({status}:{status:string}) { const cls=status==="Entrevista"?"status-interview":status==="Rascunho"?"status-draft":status==="Em análise"||status==="Pausada"?"status-analysis":status==="Inscrição enviada"||status==="Encerrada"?"status-sent":"status-active";return <span className={`status ${cls}`}><i/>{status}</span>; }
/**
 * Informa que uma lista ainda não tem registros e, quando fornecido, mostra um
 * botão para levar a pessoa à próxima ação disponível naquela tela.
 */
function EmptyState({title,text,action,onAction}:{title:string;text:string;action?:string;onAction?:()=>void}) { return <div className="empty-state"><span><Search size={22}/></span><h3>{title}</h3><p>{text}</p>{action&&<button className="primary-button" onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>; }
/**
 * Cartão reutilizado nas listas de vagas. Recebe ações por propriedades para
 * deixar busca, destaques e itens salvos compartilharem o mesmo componente.
 */
function JobCard({job,saved,applied,onSave,onOpen,horizontal=false}:{job:MatchedJob;saved:boolean;applied:boolean;onSave:()=>void;onOpen:()=>void;horizontal?:boolean}) { return <article className={`job-card ${horizontal?"job-horizontal":""}`}><div className="job-card-top"><CompanyLogo job={job}/><button className={`save-icon icon-button ${saved?"is-saved":""}`} onClick={onSave} aria-label={saved?"Remover vaga salva":"Salvar vaga"}><Heart size={17} fill={saved?"currentColor":"none"}/></button></div>{job.featured&&!horizontal&&<span className="featured-label"><Sparkles size={12}/> DADO DE DEMONSTRAÇÃO</span>}<button className="job-card-title" onClick={onOpen}>{job.role}</button><div className="job-company-line">{job.company}<span>·</span>{job.level}</div><div className="job-location"><MapPin size={14}/>{job.location}<span>·</span>{job.mode}</div><div className="job-salary"><b>{formatMonthlySalary(job.salaryMonthly)}</b></div><div className="job-tags">{job.tags.slice(0,3).map(t=><span key={t}>{t}</span>)}</div>{horizontal&&<div className="horizontal-match"><b>{job.matchedSkills.length} de {job.tags.length} competências da vaga também estão no perfil</b></div>}<div className="job-card-footer"><span className="job-posted">{job.posted}</span><span className="match-label">{job.matchedSkills.length} competências coincidentes</span><button onClick={onOpen} className="job-open-button">{applied?"Candidatura registrada":"Consultar vaga"}<ArrowRight size={14}/></button></div></article>; }

/**
 * Formulário controlado para criar ou editar vagas demonstrativas. Mantém os
 * valores em estado local, valida título/descrição/salário e só então devolve
 * a vaga pronta ao painel da empresa; nenhuma publicação vai para um servidor.
 */
function NewJobModal({initial,draftOnly=false,onClose,onCreate}:{initial?:Job|null;draftOnly?:boolean;onClose:()=>void;onCreate:(job:Job)=>void|Promise<void>}) {
  const [role,setRole]=useState(initial?.role||"");
  const [salaryMonthly,setSalaryMonthly]=useState(initial?.salaryMonthly?.toString()||"");
  const [location,setLocation]=useState(initial?.location||"");
  const [mode,setMode]=useState<Job["mode"]>(initial?.mode||"Remoto");
  const [level,setLevel]=useState(initial?.level||"Pleno");
  const [description,setDescription]=useState(initial?.description||"");
  const [tags,setTags]=useState(initial?.tags.join(", ")||"");
  const [benefits,setBenefits]=useState(initial?.benefits||"");
  const [error,setError]=useState("");
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="new-job-modal" role="dialog" aria-modal="true"><div className="new-job-heading"><span className="stat-icon stat-violet"><Plus size={18}/></span><button className="icon-button" onClick={onClose}><X size={19}/></button><div><h2>{initial?"Editar vaga":draftOnly?"Cadastrar rascunho de vaga":"Cadastrar vaga"}</h2><p>Campos obrigatórios: cargo, salário bruto mensal inteiro, local, modalidade e competências exigidas.</p></div></div><form onSubmit={e=>{e.preventDefault();const amount=Number(salaryMonthly);if(!role.trim()||!description.trim()||!location.trim()||!tags.trim()){setError("Preencha cargo, local, competências exigidas e descrição.");return;}if(!Number.isSafeInteger(amount)||amount<=0){setError("Informe um único salário mensal inteiro, maior que zero.");return;}void onCreate({id:initial?.id||Date.now(),role:role.trim(),company:initial?.company||"Empresa demonstrativa",initials:initial?.initials||"DE",color:initial?.color||"blue",location:location.trim(),mode,level,salaryMonthly:amount,posted:initial?.posted||`Publicado em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`,tags:tags.split(",").map(t=>t.trim()).filter(Boolean),description:description.trim(),benefits:benefits.trim(),status:initial?.status||(draftOnly?"Rascunho":"Ativa")});}}><label>Título exato da vaga<input value={role} onChange={e=>setRole(e.target.value)} placeholder="Ex.: Analista de Produto" required/></label><div className="form-row"><label>Salário bruto mensal em reais<input type="number" min="1" step="1" inputMode="numeric" value={salaryMonthly} onChange={e=>setSalaryMonthly(e.target.value)} placeholder="Ex.: 5000" required/><small>Informe um único valor bruto mensal em reais.</small></label><label>Nível<select value={level} onChange={e=>setLevel(e.target.value)}><option>Estágio</option><option>Júnior</option><option>Pleno</option><option>Sênior</option><option>Liderança</option></select></label></div><div className="form-row"><label>Local de trabalho (cidade e UF, ou abrangência remota)<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Ex.: Campinas, SP" required/></label><label>Modalidade<select value={mode} onChange={e=>setMode(e.target.value as Job["mode"])}><option>Remoto</option><option>Híbrido</option><option>Presencial</option></select></label></div><label>Competências exigidas, separadas por vírgulas<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Ex.: Excel, SQL, comunicação" required/></label><label>Atividades e responsabilidades objetivas<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descreva tarefas e entregas específicas." rows={4} required/></label><label>Benefícios definidos<textarea value={benefits} onChange={e=>setBenefits(e.target.value)} placeholder="Informe os benefícios definidos para esta vaga." rows={2}/></label><div className="salary-required-note"><ShieldCheck size={15}/> {draftOnly?"Como a empresa ainda aguarda validação administrativa, a vaga será salva como rascunho e poderá ser publicada após a aprovação.":"O valor digitado será exibido como salário mensal bruto único."}</div>{error&&<div className="form-error">{error}</div>}<div className="new-job-actions"><button type="button" className="save-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{initial?"Salvar alterações":draftOnly?"Salvar rascunho":"Cadastrar vaga"} <ArrowRight size={15}/></button></div></form></div></div>;
}

/**
 * Perguntas fixas de prática de SQL. A ordem e o índice correto são usados pelo
 * modal abaixo; o conteúdo é educativo e não representa certificação.
 */
const sqlQuestions = [
  { prompt: "Qual comando seleciona dados de uma tabela?", choices: ["SELECT", "PUSH", "FETCHFILE", "OPEN"], answer: 0 },
  { prompt: "Qual cláusula filtra linhas antes do agrupamento?", choices: ["ORDER BY", "WHERE", "JOIN", "AS"], answer: 1 },
  { prompt: "Qual função conta linhas?", choices: ["SUM(*)", "TOTAL()", "COUNT(*)", "NUMBER()"], answer: 2 },
  { prompt: "Qual comando combina linhas relacionadas de duas tabelas?", choices: ["JOIN", "MERGE TEXT", "APPEND", "LINK"], answer: 0 },
  { prompt: "Qual cláusula agrupa linhas por valores iguais?", choices: ["GROUP BY", "ORDER BY", "HAVING BY", "PARTITION"], answer: 0 },
];

/**
 * Quiz local que exige uma escolha antes de avançar. Calcula a porcentagem de
 * respostas corretas e entrega o resultado ao componente pai para persistência.
 */
function SkillAssessmentModal({onClose,onComplete}:{onClose:()=>void;onComplete:(score:number)=>void}) {
  // Mantém uma resposta por pergunta; -1 significa que ainda não foi respondida.
  const [answers,setAnswers]=useState<number[]>(Array(sqlQuestions.length).fill(-1));
  const [question,setQuestion]=useState(0);
  const [finished,setFinished]=useState(false);
  // Conta respostas idênticas ao gabarito e normaliza a soma como percentual.
  const score=Math.round(answers.filter((answer,index)=>answer===sqlQuestions[index].answer).length/sqlQuestions.length*100);
  // Troca apenas a resposta da pergunta atual sem apagar as demais escolhas.
  const choose=(answer:number)=>setAnswers(current=>current.map((value,index)=>index===question?answer:value));
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="new-job-modal assessment-modal" role="dialog" aria-modal="true" aria-labelledby="assessment-title"><div className="new-job-heading"><span className="stat-icon stat-violet"><ChartNoAxesColumnIncreasing size={18}/></span><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19}/></button><div><h2 id="assessment-title">Autoavaliação de SQL básico</h2><p>5 perguntas · resultado pessoal, sem certificação</p></div></div>{finished?<div className="assessment-complete"><span className="score-ring"><div><b>{score}</b><small>%</small></div></span><h3>{score>=80?"Ótimo trabalho!":score>=60?"Bom começo!":"Continue praticando."}</h3><p>Este resultado fica salvo somente neste navegador e não foi validado por uma avaliação supervisionada.</p><button className="primary-button" onClick={()=>onComplete(score)}>Salvar resultado <Check size={15}/></button></div>:<><div className="assessment-progress"><span>Pergunta {question+1} de {sqlQuestions.length}</span><div className="progress-track"><span style={{width:((question+1)/sqlQuestions.length*100)+"%"}}/></div></div><h3 className="assessment-question">{sqlQuestions[question].prompt}</h3><div className="assessment-options">{sqlQuestions[question].choices.map((choice,index)=><button key={choice} className={answers[question]===index?"assessment-option selected-option":"assessment-option"} onClick={()=>choose(index)}><span>{String.fromCharCode(65+index)}</span>{choice}</button>)}</div><div className="new-job-actions"><button className="save-button" disabled={question===0} onClick={()=>setQuestion(question-1)}>Voltar</button>{question<sqlQuestions.length-1?<button className="primary-button" disabled={answers[question]<0} onClick={()=>setQuestion(question+1)}>Próxima <ArrowRight size={15}/></button>:<button className="primary-button" disabled={answers[question]<0} onClick={()=>setFinished(true)}>Ver resultado <ArrowRight size={15}/></button>}</div></>}</div></div>;
}

/**
 * Tela inicial que separa candidato e empregador. Os formulários criam apenas
 * perfis demonstrativos e passam os dados ao painel; não coletam senha, não
 * validam identidade e não criam contas autenticadas.
 */
const adminTables = ["auth_users", "profiles", "companies", "company_members", "skills", "candidate_skills", "candidate_experiences", "candidate_educations", "saved_jobs", "skill_assessments", "skill_assessment_attempts", "consent_records", "jobs", "job_skills", "applications", "application_events", "application_feedback"];
const adminPrimaryKeys: Record<string,string[]> = { auth_users:["id"], profiles:["id"], companies:["id"], company_members:["company_id","profile_id"], skills:["id"], candidate_skills:["profile_id","skill_id"], candidate_experiences:["id"], candidate_educations:["id"], saved_jobs:["profile_id","job_id"], skill_assessments:["id"], skill_assessment_attempts:["id"], consent_records:["id"], jobs:["id"], job_skills:["job_id","skill_id"], applications:["id"], application_events:["id"], application_feedback:["id"] };

function AdminPanel({client}:{client:NonNullable<typeof supabase>}) {
  const [table,setTable]=useState(adminTables[0]);const [rows,setRows]=useState<Record<string,unknown>[]>([]);const [loading,setLoading]=useState(false);const [message,setMessage]=useState("");
  const loadRows=async()=>{setLoading(true);setMessage("");const {data,error}=await client.rpc("admin_list_records",{table_name:table,row_limit:200});if(error)setMessage(error.message);else setRows(Array.isArray(data)?data as Record<string,unknown>[]:[]);setLoading(false);};
  useEffect(()=>{void loadRows();},[table]);
  const keyFor=(row:Record<string,unknown>)=>Object.fromEntries(adminPrimaryKeys[table].map(key=>[key,row[key]]));
  const edit=async(row:Record<string,unknown>)=>{const input=window.prompt("Revise o registro JSON completo. Alterações são aplicadas diretamente no banco.",JSON.stringify(row,null,2));if(!input)return;try{const values=JSON.parse(input);const {error}=await client.rpc("admin_update_record",{table_name:table,key_values:keyFor(row),new_values:values});if(error)throw error;setMessage("Registro atualizado no banco.");await loadRows();}catch(error){setMessage(error instanceof Error?error.message:"JSON inválido ou atualização recusada pelo banco.");}};
  const toggleCompanyVerification=async(row:Record<string,unknown>)=>{const {error}=await client.rpc("admin_update_record",{table_name:"companies",key_values:keyFor(row),new_values:{verified_at:row.verified_at?null:new Date().toISOString()}});if(error)setMessage(error.message);else{setMessage(row.verified_at?"Validação revogada.":"Empresa validada; a equipe deve entrar novamente para atualizar as permissões.");await loadRows();}};
  const remove=async(row:Record<string,unknown>)=>{if(!window.confirm("Excluir permanentemente este registro? Relações dependentes podem ser excluídas em cascata."))return;const {error}=await client.rpc("admin_delete_record",{table_name:table,key_values:keyFor(row)});if(error)setMessage(error.message);else{setMessage("Registro excluído.");await loadRows();}};
  return <><div className="page-heading"><div><div className="eyebrow">ACESSO ADMINISTRATIVO AUTORIZADO PELO BANCO</div><h1>Administração</h1><p className="page-subtitle">Leitura, alteração e exclusão de registros. Cada operação valida o papel admin no servidor PostgreSQL.</p></div></div><section className="panel admin-console"><div className="admin-toolbar"><label className="field-label">Tabela<select value={table} onChange={event=>setTable(event.target.value)}>{adminTables.map(name=><option key={name} value={name}>{name}</option>)}</select></label><button className="outline-button" onClick={()=>void loadRows()} disabled={loading}>Atualizar</button><span>{rows.length} registros exibidos (limite: 200)</span></div>{message&&<p role="status" className="local-note">{message}</p>}{loading?<p>Carregando registros...</p>:rows.length===0?<p>Nenhum registro encontrado.</p>:<div className="admin-record-list">{rows.map((row,index)=><article className="admin-record" key={JSON.stringify(keyFor(row))||index}><pre>{JSON.stringify(row,null,2)}</pre><div>{table!=="auth_users"&&<button className="small-link" onClick={()=>void edit(row)}>Alterar JSON</button>}{table==="companies"&&<button className="small-link" onClick={()=>void toggleCompanyVerification(row)}>{row.verified_at?"Revogar validação":"Validar empresa"}</button>}<button className="small-link danger-link" onClick={()=>void remove(row)}>Excluir</button></div></article>)}</div>}</section></>;
}

function AuthPortal({client,notice,onClearNotice}:{client:NonNullable<typeof supabase>;notice?:string;onClearNotice?:()=>void}) {
  const [entry,setEntry]=useState<"landing"|"candidate"|"recruiter"|"admin">("landing");
  const [registering,setRegistering]=useState(false);
  const [role,setRole]=useState<"candidate"|"recruiter">("candidate");
  const [name,setName]=useState("");const [company,setCompany]=useState("");const [headline,setHeadline]=useState("");const [city,setCity]=useState("");const [salary,setSalary]=useState("");
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  const chooseEntry=(next:"candidate"|"recruiter"|"admin")=>{setEntry(next);setRole(next==="recruiter"?"recruiter":"candidate");setRegistering(false);setMessage("");onClearNotice?.();};
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setBusy(true);setMessage("");onClearNotice?.();
    try {
      localStorage.setItem("ec-entry-kind",entry);
      if(registering){
        const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:name.trim(),role,company_name:role==="recruiter"?company.trim():"",headline:role==="candidate"?headline.trim():"",city:role==="candidate"?city.trim():"",salary_monthly:role==="candidate"&&salary?Number(salary):null}}});
        if(error)throw error;
        if(!data.session){setMessage("Cadastro criado. Confirme o e-mail e depois entre. No Supabase local, confira as mensagens em Mailpit: http://127.0.0.1:54324.");return;}
        setMessage("Conta criada. Carregando seu espaço...");
      } else {
        const {error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;
      }
    } catch(error) { setMessage(error instanceof Error?error.message:"Não foi possível autenticar."); }
    finally {setBusy(false);}
  };
  if(entry==="landing") return <main className="entry-page"><header className="entry-header"><a className="brand" href="#inicio"><span className="brand-mark"><BriefcaseBusiness size={19}/></span><span>emprego<span className="brand-light">certo</span><i>.</i></span></a><span className="entry-local"><ShieldCheck size={14}/> Acesso seguro pelo Supabase</span></header><section className="entry-content"><div className="eyebrow"><span className="live-dot"/> PLATAFORMA EMPREGO CERTO</div><h1>Oportunidades certas<br/>para pessoas e empresas.</h1><p className="entry-subtitle">Entre na sua conta ou crie um acesso para testar a plataforma.</p>{notice&&<div className="form-error" role="alert" style={{marginTop:16}}>{notice}</div>}<div className="entry-cards"><button className="entry-card candidate-entry" onClick={()=>chooseEntry("candidate")}><span className="entry-card-icon"><UserRound size={22}/></span><span className="entry-card-copy"><b>Área do candidato</b><small>Perfil, vagas, candidaturas e acompanhamento.</small></span><ArrowRight size={18}/></button><button className="entry-card employer-entry" onClick={()=>chooseEntry("recruiter")}><span className="entry-card-icon"><Building2 size={22}/></span><span className="entry-card-copy"><b>Área da empresa</b><small>Perfil institucional, vagas e processos seletivos.</small></span><ArrowRight size={18}/></button></div><div className="entry-note"><ShieldCheck size={16}/><p>Os dados autenticados são armazenados no Supabase deste ambiente e as permissões são verificadas pelo banco.</p></div><button className="text-link" onClick={()=>chooseEntry("admin")}>Acesso administrativo especial</button></section><footer className="entry-footer">Emprego Certo · Ambiente local para testes · Use dados fictícios.</footer></main>;
  return <main className="entry-page"><header className="entry-header"><a className="brand" href="#inicio" onClick={event=>{event.preventDefault();setEntry("landing");setRegistering(false);setMessage("")}}><span className="brand-mark"><BriefcaseBusiness size={19}/></span><span>emprego<span className="brand-light">certo</span><i>.</i></span></a><span className="entry-local"><ShieldCheck size={14}/> {entry==="admin"?"Acesso administrativo":"Autenticação pelo Supabase"}</span></header><section className="entry-content"><div className="entry-form-card"><button className="entry-back" onClick={()=>{setEntry("landing");setRegistering(false);setMessage("")}}><ArrowLeft size={15}/> Página inicial</button><span className="entry-form-icon"><ShieldCheck size={21}/></span><div className="eyebrow">{entry==="admin"?"ACESSO ADMINISTRATIVO ESPECIAL":entry==="recruiter"?"ÁREA DA EMPRESA":"ÁREA DO CANDIDATO"}</div><h2>{registering?"Criar conta":"Entrar"}</h2><p>{entry==="admin"?"Somente uma conta já promovida no banco tem acesso ao painel administrativo.":"Use seu e-mail e senha para acessar a conta."}</p><form onSubmit={submit}>{registering&&<><label className="field-label">Nome completo<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required/></label>{entry==="recruiter"?<label className="field-label">Nome da empresa<input value={company} onChange={e=>setCompany(e.target.value)} required/></label>:<><label className="field-label">Cargo ou objetivo<input value={headline} onChange={e=>setHeadline(e.target.value)} required/></label><label className="field-label">Cidade e UF<input value={city} onChange={e=>setCity(e.target.value)} required/></label><label className="field-label">Pretensão bruta mensal em reais<input type="number" min="1" step="1" value={salary} onChange={e=>setSalary(e.target.value)} required/></label></>}</>}<label className="field-label">E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label><label className="field-label">Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={registering?"new-password":"current-password"} minLength={8} required/><small>Mínimo de 8 caracteres.</small></label><button className="primary-button entry-submit" disabled={busy}>{busy?"Aguarde...":registering?"Criar conta":"Entrar"}<ArrowRight size={16}/></button></form>{message&&<p role="status" className="local-note">{message}</p>}{entry!=="admin"&&<button className="text-link" onClick={()=>{setRegistering(!registering);setMessage("")}}>{registering?"Já tenho conta. Entrar":"Criar uma conta"}</button>}{entry==="admin"&&<p className="local-note">Contas administrativas não podem ser criadas nesta tela.</p>}</div></section><footer className="entry-footer">Emprego Certo · Dados de conta enviados ao Supabase deste ambiente.</footer></main>;
}

function EntryPage({mode,onMode,onEnter}:{mode:"choose"|"candidate"|"employer";onMode:(mode:"choose"|"candidate"|"employer")=>void;onEnter:(role:"candidate"|"employer",profile?:Profile,employer?:{name:string;website:string;description:string})=>void}) {
  // Estados isolados para os campos dos dois formulários de demonstração.
  const [name,setName]=useState("");const [role,setRole]=useState("");const [city,setCity]=useState("");const [salaryMonthly,setSalaryMonthly]=useState("");const [skills,setSkills]=useState("");const [visible,setVisible]=useState(false);
  const [company,setCompany]=useState("");const [website,setWebsite]=useState("");const [description,setDescription]=useState("");
  return <main className="entry-page"><header className="entry-header"><a className="brand" href="#inicio" onClick={e=>{e.preventDefault();onMode("choose")}}><span className="brand-mark"><BriefcaseBusiness size={19}/></span><span>emprego<span className="brand-light">certo</span><i>.</i></span></a><span className="entry-local"><ShieldCheck size={14}/> Ambiente de demonstração local</span></header><section className="entry-content">{mode==="choose"?<><div className="eyebrow"><span className="live-dot"/> SEU PRÓXIMO PASSO COMEÇA AQUI</div><h1>Oportunidades certas<br/>para pessoas e empresas.</h1><p className="entry-subtitle">Escolha como você quer entrar na demonstração da plataforma.</p><div className="entry-cards"><button className="entry-card candidate-entry" onClick={()=>onMode("candidate")}><span className="entry-card-icon"><UserRound size={22}/></span><span className="entry-card-copy"><b>Sou candidato(a)</b><small>Encontre vagas, candidate-se e acompanhe seu desenvolvimento.</small></span><ArrowRight size={18}/></button><button className="entry-card employer-entry" onClick={()=>onMode("employer")}><span className="entry-card-icon"><Building2 size={22}/></span><span className="entry-card-copy"><b>Sou empregador</b><small>Publique vagas, avalie candidaturas e acompanhe seleções.</small></span><ArrowRight size={18}/></button></div><div className="entry-note"><ShieldCheck size={16}/><p>Esta versão salva as informações somente neste navegador. Cadastro e login reais, validação de e-mail e sincronização entre dispositivos dependem da integração com um serviço de autenticação.</p></div></>:mode==="candidate"?<div className="entry-form-card"><button className="entry-back" onClick={()=>onMode("choose")}><ArrowLeft size={15}/> Voltar</button><span className="entry-form-icon"><UserRound size={21}/></span><div className="eyebrow">ÁREA DO CANDIDATO</div><h2>Monte seu perfil inicial</h2><p>Use dados de demonstração para conhecer a experiência do candidato.</p><form onSubmit={e=>{e.preventDefault();onEnter("candidate",{...initialProfile,name,role,city,salaryMonthly:Number(salaryMonthly),skills:skills.split(",").map(x=>x.trim()).filter(Boolean),visible,bio:"",education:"",experience:""})}}><label className="field-label">Seu nome<input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome e sobrenome" required/></label><label className="field-label">Cargo ou objetivo profissional<input value={role} onChange={e=>setRole(e.target.value)} placeholder="Ex.: Analista de dados" required/></label><div className="form-row"><label className="field-label">Cidade<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Cidade, UF" required/></label><label className="field-label">Pretensão bruta mensal (valor único em reais)<input type="number" min="1" step="1" inputMode="numeric" value={salaryMonthly} onChange={e=>setSalaryMonthly(e.target.value)} placeholder="Ex.: 5000" required/><small>Informe um único valor bruto mensal em reais.</small></label></div><label className="field-label">Competências separadas por vírgula<input value={skills} onChange={e=>setSkills(e.target.value)} placeholder="Ex.: Excel, atendimento, vendas"/></label><label className="entry-consent"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/> Quero permitir que empresas vejam meu perfil demonstrativo.</label><button className="primary-button entry-submit" type="submit">Continuar como candidato <ArrowRight size={16}/></button></form></div>:<div className="entry-form-card"><button className="entry-back" onClick={()=>onMode("choose")}><ArrowLeft size={15}/> Voltar</button><span className="entry-form-icon employer-icon"><Building2 size={21}/></span><div className="eyebrow">ÁREA DA EMPRESA</div><h2>Configure o perfil da empresa</h2><p>Crie um perfil demonstrativo para explorar publicação e gestão de vagas.</p><form onSubmit={e=>{e.preventDefault();onEnter("employer",undefined,{name:company,website,description})}}><label className="field-label">Nome da empresa<input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Ex.: Acme Tecnologia" required/></label><label className="field-label">Site (opcional)<input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://empresa.com.br"/></label><label className="field-label">Sobre a empresa<textarea className="profile-textarea" value={description} onChange={e=>setDescription(e.target.value)} rows={4} placeholder="Conte sobre a empresa e a equipe."/></label><button className="primary-button entry-submit" type="submit">Continuar como empresa <ArrowRight size={16}/></button></form></div>}</section><footer className="entry-footer">Emprego Certo · Protótipo para demonstração · Os dados não são enviados para um servidor.</footer></main>;
}
