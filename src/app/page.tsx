"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { hardSkillsCatalog } from "../lib/hardSkillsCatalog";
import { softSkillCategories, softSkillsCatalog } from "../lib/softSkillsCatalog";
import {
  cnhCategoryOptions, commonLanguages, commonOtherLicenses,
  educationCategories, educationCategoryLabel,
  internationalExperienceTypeLabel, internationalExperienceTypes,
  languageProficiencies, languageProficiencyLabel,
  maritalStatusLabel, maritalStatusOptions,
  pcdTypeOptions, travelAvailabilityLabel, travelAvailabilityOptions,
  type EducationCategory, type InternationalExperienceType,
  type LanguageProficiency, type MaritalStatus, type TravelAvailability,
} from "../lib/profileOptions";
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

type WorkplaceMode = "Remoto" | "Híbrido" | "Presencial";
const workplaceModes: WorkplaceMode[] = ["Remoto", "Híbrido", "Presencial"];
const dbWorkplaceToUi: Record<string, WorkplaceMode> = { remote: "Remoto", hybrid: "Híbrido", onsite: "Presencial" };
const uiWorkplaceToDb: Record<WorkplaceMode, "remote" | "hybrid" | "onsite"> = { Remoto: "remote", "Híbrido": "hybrid", Presencial: "onsite" };

const workScheduleOptions = ["Comercial", "Manhã", "Tarde", "Noite", "Madrugada", "Flexível"] as const;
const contractTypeOptions = ["CLT", "PJ", "Estágio", "Temporário", "Autônomo", "Jovem Aprendiz"] as const;
const workShiftOptions = ["5x2", "6x1", "12x36", "4x3", "Escala flexível"] as const;
const dbContractToUi: Record<string, string> = {
  full_time: "CLT",
  internship: "Estágio",
  CLT: "CLT",
  PJ: "PJ",
  "Estágio": "Estágio",
  "Temporário": "Temporário",
  "Autônomo": "Autônomo",
  "Jovem Aprendiz": "Jovem Aprendiz",
};
const locationPresets: { label: string; city: string; state: string; lat: number; lng: number }[] = [
  { label: "São José dos Campos — Centro (SP)", city: "São José dos Campos", state: "SP", lat: -23.1896, lng: -45.8841 },
  { label: "São José dos Campos — Zona Sul (SP)", city: "São José dos Campos", state: "SP", lat: -23.2237, lng: -45.8999 },
  { label: "São Paulo — Av. Paulista (SP)", city: "São Paulo", state: "SP", lat: -23.5614, lng: -46.6559 },
  { label: "Campinas — Centro (SP)", city: "Campinas", state: "SP", lat: -22.9056, lng: -47.0608 },
  { label: "Curitiba — Centro (PR)", city: "Curitiba", state: "PR", lat: -25.4284, lng: -49.2733 },
];

type HardSkillLevel = "junior" | "pleno" | "senior";
const hardSkillLevels: { value: HardSkillLevel; label: string }[] = [
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
];
const hardSkillLevelLabel: Record<HardSkillLevel, string> = {
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
};
const allowedProofMimeTypes = ["application/pdf"];
const maxProofSizeBytes = 10 * 1024 * 1024;
const isPdfFileName = (fileName: string) => fileName.trim().toLocaleLowerCase("pt-BR").endsWith(".pdf");
const hasPdfMagicHeader = async (file: File) => {
  try {
    const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    return bytes.length === 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  } catch {
    return false;
  }
};

type CandidateHardSkillDetail = {
  id: string;
  skillName: string;
  proficiency: HardSkillLevel;
  experienceMonths: number;
  proofInstitution: string;
  proofPath: string | null;
  proofFileName: string;
  proofMimeType: string;
  proofSizeBytes: number | null;
};

type CandidateExperience = {
  id: string; jobTitle: string; companyName: string; employmentType: string;
  city: string; startedOn: string; endedOn: string; isCurrent: boolean; description: string;
};
type CandidateEducation = {
  id: string; category: EducationCategory; institution: string; degree: string; fieldOfStudy: string;
  startedOn: string; endedOn: string; isCurrent: boolean;
  workloadHours: number | null; credentialCode: string; expiresOn: string; description: string;
  proofPath: string | null; proofFileName: string; proofMimeType: string; proofSizeBytes: number | null;
};
type CandidateLanguage = {
  id: string; language: string; proficiency: LanguageProficiency; certification: string;
  proofPath: string | null; proofFileName: string; proofMimeType: string; proofSizeBytes: number | null;
};
type CandidateInternationalExperience = {
  id: string; experienceType: InternationalExperienceType; country: string; city: string;
  institutionOrCompany: string; startedOn: string; endedOn: string; isCurrent: boolean; description: string;
};

/**
 * Modelo de vaga com todos os critérios essenciais de match 100%:
 * hard/soft skills, horário, formato de contratação, modalidade, escala e distância fixa.
 */
type Job = {
  id: number | string; role: string; company: string; initials: string; color: string; location: string;
  mode: WorkplaceMode; level: string; salaryMonthly: number | null; posted: string; publishedAt?: string;
  tags: string[]; softSkills: string[]; workSchedule: string; contractType: string; workShift: string;
  isFixedLocation: boolean; latitude: number | null; longitude: number | null;
  featured?: boolean; description: string; status?: "Ativa" | "Pausada" | "Encerrada" | "Rascunho"; benefits?: string;
};
/** Vaga compatível acompanhada das competências coincidentes, distância calculada e motivos do match. */
type MatchedJob = Job & { matchedSkills: string[]; matchedSoftSkills: string[]; distanceKm: number | null; matchReasons: string[] };
/**
 * Registro local que liga uma pessoa demonstrativa a uma vaga e acompanha o
 * processo. Os campos de feedback e nome são preenchidos pelos fluxos locais.
 */
type ApplicationEventItem = { status: string; date: string; rawDate?: string };
type ConsentRecordItem = { id: string; purpose: string; policyVersion: string; granted: boolean; recordedAt: string };
const consentPurposeLabel: Record<string, string> = {
  application_profile_sharing: "Compartilhamento de perfil em candidaturas",
  profile_discovery: "Visibilidade do perfil nas buscas",
};
type Application = { id?: string; feedbackId?: string; jobId: number | string; job?: Job; status: string; date: string; rawDate?: string; feedback?: string; recruiterNote?: string; candidateSnapshot?: Profile; events?: ApplicationEventItem[] };
/** Campos do perfil usados no match automático 100%, candidatura e edição. */
type Profile = {
  name: string; role: string; city: string; state: string; salaryMonthly: number | null;
  workplacePreferences: WorkplaceMode[]; workSchedules: string[]; contractTypes: string[]; workShifts: string[];
  maxDistanceKm: number | null; latitude: number | null; longitude: number | null;
  skills: string[]; softSkills: string[]; hardSkillDetails?: CandidateHardSkillDetail[];
  educationsSnapshot?: CandidateEducation[]; languagesSnapshot?: CandidateLanguage[]; internationalSnapshot?: CandidateInternationalExperience[];
  travelAvailability: TravelAvailability | ""; relocationAvailability: boolean; travelNotes: string;
  cnhCategories: string[]; cnhEar: boolean; hasOwnVehicle: boolean; otherLicenses: string[];
  maritalStatus: MaritalStatus; hasChildren: boolean | null; childrenCount: number | null; familyNotes: string;
  isPcd: boolean | null; pcdTypes: string[]; pcdCid: string; accessibilityNeeds: string;
  pcdProofPath: string | null; pcdProofFileName: string; pcdProofMimeType: string; pcdProofSizeBytes: number | null;
  shareSensitiveInApplications: boolean;
  education: string; experience: string; bio: string; visible: boolean;
};

/** Perfil inicial vazio para novos acessos sem dados fictícios pré-preenchidos. */
const initialProfile: Profile = {
  name: "", role: "", city: "", state: "", salaryMonthly: null,
  workplacePreferences: [], workSchedules: [], contractTypes: [], workShifts: [],
  maxDistanceKm: null, latitude: null, longitude: null,
  skills: [], softSkills: [], hardSkillDetails: [],
  travelAvailability: "", relocationAvailability: false, travelNotes: "",
  cnhCategories: [], cnhEar: false, hasOwnVehicle: false, otherLicenses: [],
  maritalStatus: "nao_informar", hasChildren: null, childrenCount: null, familyNotes: "",
  isPcd: null, pcdTypes: [], pcdCid: "", accessibilityNeeds: "",
  pcdProofPath: null, pcdProofFileName: "", pcdProofMimeType: "", pcdProofSizeBytes: null,
  shareSensitiveInApplications: false,
  education: "", experience: "", bio: "", visible: false,
};

function mapDatabaseHardSkill(row: Record<string, any>): CandidateHardSkillDetail {
  const rawLevel = String(row.proficiency || "junior");
  const proficiency: HardSkillLevel = rawLevel === "senior" ? "senior" : rawLevel === "pleno" ? "pleno" : "junior";
  return {
    id: String(row.id || `hs-${row.skill_name}`),
    skillName: String(row.skill_name || row.skillName || ""),
    proficiency,
    experienceMonths: Number(row.experience_months ?? row.experienceMonths ?? 12),
    proofInstitution: String(row.proof_institution || row.proofInstitution || ""),
    proofPath: row.proof_path || row.proofPath || null,
    proofFileName: String(row.proof_file_name || row.proofFileName || ""),
    proofMimeType: String(row.proof_mime_type || row.proofMimeType || ""),
    proofSizeBytes: row.proof_size_bytes != null ? Number(row.proof_size_bytes) : null,
  };
}

function formatExperienceDuration(totalMonths: number) {
  const months = Math.max(1, Math.round(totalMonths));
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years > 0 && remMonths > 0) return `${years} ${years === 1 ? "ano" : "anos"} e ${remMonths} ${remMonths === 1 ? "mês" : "meses"}`;
  if (years > 0) return `${years} ${years === 1 ? "ano" : "anos"}`;
  return `${remMonths} ${remMonths === 1 ? "mês" : "meses"}`;
}

function mapDatabaseExperience(row: Record<string, any>): CandidateExperience {
  return {
    id: String(row.id),
    jobTitle: String(row.job_title || ""),
    companyName: String(row.company_name || ""),
    employmentType: String(row.employment_type || ""),
    city: String(row.city || ""),
    startedOn: String(row.started_on || ""),
    endedOn: String(row.ended_on || ""),
    isCurrent: Boolean(row.is_current),
    description: String(row.description || ""),
  };
}

function mapDatabaseEducation(row: Record<string, any>): CandidateEducation {
  const rawCat = String(row.category || "graduacao");
  const validCats: EducationCategory[] = ["graduacao", "pos_graduacao", "tecnico", "curso", "certificacao_especial"];
  const category: EducationCategory = validCats.includes(rawCat as EducationCategory) ? (rawCat as EducationCategory) : "graduacao";
  return {
    id: String(row.id || `edu-${row.institution || Date.now()}`),
    category,
    institution: String(row.institution || ""),
    degree: String(row.degree || ""),
    fieldOfStudy: String(row.field_of_study || row.fieldOfStudy || ""),
    startedOn: String(row.started_on || row.startedOn || ""),
    endedOn: String(row.ended_on || row.endedOn || ""),
    isCurrent: Boolean(row.is_current ?? row.isCurrent),
    workloadHours: (row.workload_hours ?? row.workloadHours) != null ? Number(row.workload_hours ?? row.workloadHours) : null,
    credentialCode: String(row.credential_code || row.credentialCode || ""),
    expiresOn: String(row.expires_on || row.expiresOn || ""),
    description: String(row.description || ""),
    proofPath: row.proof_path || row.proofPath || null,
    proofFileName: String(row.proof_file_name || row.proofFileName || ""),
    proofMimeType: String(row.proof_mime_type || row.proofMimeType || ""),
    proofSizeBytes: (row.proof_size_bytes ?? row.proofSizeBytes) != null ? Number(row.proof_size_bytes ?? row.proofSizeBytes) : null,
  };
}

function mapDatabaseLanguage(row: Record<string, any>): CandidateLanguage {
  const rawProf = String(row.proficiency || "intermediario");
  const validProf: LanguageProficiency[] = ["basico", "intermediario", "avancado", "fluente", "nativo"];
  const proficiency: LanguageProficiency = validProf.includes(rawProf as LanguageProficiency) ? (rawProf as LanguageProficiency) : "intermediario";
  return {
    id: String(row.id || `lang-${row.language || Date.now()}`),
    language: String(row.language || ""),
    proficiency,
    certification: String(row.certification || ""),
    proofPath: row.proof_path || row.proofPath || null,
    proofFileName: String(row.proof_file_name || row.proofFileName || ""),
    proofMimeType: String(row.proof_mime_type || row.proofMimeType || ""),
    proofSizeBytes: (row.proof_size_bytes ?? row.proofSizeBytes) != null ? Number(row.proof_size_bytes ?? row.proofSizeBytes) : null,
  };
}

function mapDatabaseInternational(row: Record<string, any>): CandidateInternationalExperience {
  const rawType = String(row.experience_type || row.experienceType || "intercambio_academico");
  const validTypes: InternationalExperienceType[] = ["intercambio_academico", "intercambio_idiomas", "trabalho_exterior", "voluntariado", "residencia_exterior", "outro"];
  const experienceType: InternationalExperienceType = validTypes.includes(rawType as InternationalExperienceType) ? (rawType as InternationalExperienceType) : "outro";
  return {
    id: String(row.id || `intl-${row.country || Date.now()}`),
    experienceType,
    country: String(row.country || ""),
    city: String(row.city || ""),
    institutionOrCompany: String(row.institution_or_company || row.institutionOrCompany || ""),
    startedOn: String(row.started_on || row.startedOn || ""),
    endedOn: String(row.ended_on || row.endedOn || ""),
    isCurrent: Boolean(row.is_current ?? row.isCurrent),
    description: String(row.description || ""),
  };
}

function formatDateMonthYear(value: string) {
  if (!value) return "";
  const [year, month] = value.split("-");
  return year && month ? `${month}/${year}` : value;
}

function formatPeriod(startedOn: string, endedOn: string, isCurrent: boolean, currentLabel: string) {
  const start = formatDateMonthYear(startedOn);
  const end = isCurrent ? currentLabel : formatDateMonthYear(endedOn);
  if (start && end) return `${start} – ${end}`;
  return start || end || "Período não informado";
}

/** Vagas fictícias de demonstração; não representam oportunidades abertas reais. */
const jobs: Job[] = [];

/** A conta local começa sem candidaturas; novas inscrições são criadas pelo fluxo de candidatura. */
const initialApps: Application[] = [];

type FaqItem = { id: string; category: string; question: string; answer: string; actionLabel?: string; actionTab?: string };
const candidateFaqItems: FaqItem[] = [
  {
    id: "match-skills",
    category: "Vagas e salários",
    question: "Como funciona o match automático de vagas compatíveis?",
    answer: "O match automático exibe apenas vagas que cumprem 100% de todos os critérios essenciais sem ordem de prioridade: 100% das hard skills e 100% das soft skills exigidas pela vaga, 100% de compatibilidade em horário, formato de contratação, formato de trabalho, formato de escala e distância máxima até o local fixo (quando presencial em local fixo). A única exceção de desigualdade é o salário: se sua pretensão for menor ou igual ao salário bruto mensal da vaga, ela fica disponível para você.",
    actionLabel: "Ajustar critérios no Meu perfil",
    actionTab: "profile",
  },
  {
    id: "single-salary",
    category: "Vagas e salários",
    question: "Por que todas as vagas mostram um único salário bruto mensal?",
    answer: "Para garantir transparência salarial desde o início, o cadastro de vagas exige um único valor inteiro bruto mensal em reais (BRL), sem intervalos ambíguos nem \"a combinar\". Você também pode filtrar por salário mínimo e ordenar por maior salário em Encontrar vagas.",
    actionLabel: "Explorar vagas",
    actionTab: "jobs",
  },
  {
    id: "profile-completion",
    category: "Perfil e competências",
    question: "Como é calculado o percentual de completude do meu perfil?",
    answer: "A completude divide igualmente 8 blocos do perfil (12,5% cada): nome completo, cargo ou objetivo, cidade, pretensão bruta mensal, resumo (Sobre mim), ao menos uma competência, ao menos uma experiência profissional e ao menos uma formação.",
    actionLabel: "Completar meu perfil",
    actionTab: "profile",
  },
  {
    id: "skills-limit",
    category: "Perfil e competências",
    question: "Quantas competências posso adicionar e onde ficam minhas experiências e formações?",
    answer: "Você pode cadastrar até 50 competências individuais em chips no seu perfil. Experiências profissionais, formações acadêmicas, UF e modalidades preferidas (Remoto, Híbrido, Presencial) são salvos nas tabelas estruturadas do banco local com controle de acesso por conta.",
    actionLabel: "Abrir Meu perfil",
    actionTab: "profile",
  },
  {
    id: "consent-diff",
    category: "Privacidade e LGPD",
    question: "Qual a diferença entre visibilidade nas buscas e compartilhamento ao se candidatar?",
    answer: "São dois consentimentos independentes, registrados separadamente com data, hora e versão da política: \"Visibilidade nas buscas\" permite que empresas validadas descubram seu perfil; \"Compartilhar perfil ao me candidatar\" autoriza incluir seus dados básicos nas vagas em que você se inscrever.",
    actionLabel: "Ir para Privacidade e dados",
    actionTab: "settings",
  },
  {
    id: "snapshot",
    category: "Privacidade e LGPD",
    question: "O que a empresa vê quando eu envio uma candidatura?",
    answer: "No momento da inscrição, o sistema guarda uma cópia instantânea (snapshot) dos seus dados básicos autorizados. A empresa consulta essa cópia vinculada à candidatura enquanto seu consentimento de compartilhamento estiver ativo; se você revogar o consentimento, o acesso dos recrutadores é interrompido.",
    actionLabel: "Ver histórico de consentimentos",
    actionTab: "settings",
  },
  {
    id: "timeline",
    category: "Candidaturas e retorno",
    question: "Como acompanho as etapas e o histórico de cada candidatura?",
    answer: "Cada candidatura exibe uma linha do tempo fiel ao status atual (Inscrição enviada, Em análise, Teste técnico, Entrevista, Oferta, Contratado, Não selecionado ou Desistiu). Clique em \"Histórico\" no cartão para ver o registro cronológico completo das mudanças de etapa.",
    actionLabel: "Ver minhas candidaturas",
    actionTab: "applications",
  },
  {
    id: "paused-job",
    category: "Candidaturas e retorno",
    question: "O que acontece se a empresa pausar ou encerrar uma vaga depois da minha inscrição?",
    answer: "Sua candidatura continua visível em Minhas candidaturas com os dados da vaga preservados e a indicação de que a oportunidade foi pausada ou encerrada. Você também pode retirar uma candidatura em andamento a qualquer momento.",
  },
  {
    id: "feedback",
    category: "Candidaturas e retorno",
    question: "Quando o feedback da empresa aparece para mim?",
    answer: "Os feedbacks registrados pela equipe recrutadora só ficam visíveis após aprovação explícita pela empresa. Quando liberados, aparecem no cartão da candidatura, na aba Minha evolução e no sino de Notificações no topo da página.",
    actionLabel: "Consultar feedbacks",
    actionTab: "evolution",
  },
  {
    id: "sql-assessment",
    category: "Evolução e conta",
    question: "A autoavaliação de SQL gera certificado ou vale como teste técnico?",
    answer: "Não. A autoavaliação de SQL em Minha evolução tem caráter exclusivamente educativo, fica salva apenas neste navegador e não representa certificação nem competência verificada de forma supervisionada.",
    actionLabel: "Abrir Minha evolução",
    actionTab: "evolution",
  },
  {
    id: "export-delete",
    category: "Privacidade e LGPD",
    question: "Posso baixar uma cópia dos meus dados ou limpar os registros deste navegador?",
    answer: "Sim. Em Privacidade e dados você pode baixar um arquivo JSON com seu perfil, experiências, formações, candidaturas, vagas salvas e histórico de consentimentos, além de apagar os dados locais guardados no navegador atual.",
    actionLabel: "Baixar ou gerenciar dados",
    actionTab: "settings",
  },
  {
    id: "test-env",
    category: "Evolução e conta",
    question: "As empresas e vagas deste ambiente são reais?",
    answer: "Não. O Emprego Certo nesta versão é um protótipo de testes conectado apenas ao Supabase local. Não há envio de candidaturas a empresas reais nem sincronização em produção — utilize apenas dados fictícios.",
  },
];
const faqCategories = ["Todas", "Perfil e competências", "Vagas e salários", "Candidaturas e retorno", "Privacidade e LGPD", "Evolução e conta"];

/** Opções de navegação da área do candidato; a área da empresa usa seu próprio menu. */
const nav = [
  { key: "home", label: "Visão geral", icon: LayoutDashboard },
  { key: "jobs", label: "Vagas compatíveis", icon: Search },
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

/** Normaliza texto removendo acentos e diferenças de caixa para comparação objetiva. */
function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Calcula distância geodésica aproximada em quilômetros usando a fórmula de Haversine. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Retorna somente hard skills com igualdade textual após normalização de caixa e espaços. */
function getMatchedSkills(job: Job, profile: Profile) {
  const candidateSkills = new Set(profile.skills.map(skill => skill.trim().toLocaleLowerCase("pt-BR")).filter(Boolean));
  return job.tags.filter(skill => candidateSkills.has(skill.trim().toLocaleLowerCase("pt-BR")));
}

/** Retorna somente soft skills com igualdade textual após normalização de caixa e espaços. */
function getMatchedSoftSkills(job: Job, profile: Profile) {
  const candidateSoft = new Set(profile.softSkills.map(skill => skill.trim().toLocaleLowerCase("pt-BR")).filter(Boolean));
  return job.softSkills.filter(skill => candidateSoft.has(skill.trim().toLocaleLowerCase("pt-BR")));
}

/**
 * Motor de match estrito 100% sem ordem de prioridade:
 * - 100% das hard skills e 100% das soft skills da vaga
 * - 100% de match em horário, formato de contratação, modalidade e escala
 * - Distância <= distância máxima quando presencial em local fixo
 * - Única exceção de desigualdade: salário pretendido <= salário da vaga
 */
function evaluateJobMatch(job: Job, profile: Profile): {
  compatible: boolean; matchedSkills: string[]; matchedSoftSkills: string[]; distanceKm: number | null; reasons: string[];
} {
  const matchedSkills = getMatchedSkills(job, profile);
  const matchedSoftSkills = getMatchedSoftSkills(job, profile);
  let distanceKm: number | null = null;
  if (profile.latitude != null && profile.longitude != null && job.latitude != null && job.longitude != null) {
    distanceKm = Math.round(haversineKm(profile.latitude, profile.longitude, job.latitude, job.longitude) * 10) / 10;
  }

  // 1. 100% das Hard Skills da vaga
  if (job.tags.length === 0 || matchedSkills.length !== job.tags.length) {
    return { compatible: false, matchedSkills, matchedSoftSkills, distanceKm, reasons: [] };
  }
  // 2. 100% das Soft Skills da vaga
  if (job.softSkills.length > 0 && matchedSoftSkills.length !== job.softSkills.length) {
    return { compatible: false, matchedSkills, matchedSoftSkills, distanceKm, reasons: [] };
  }
  // 3. 100% em escolha de horário
  if (!profile.workSchedules.includes(job.workSchedule)) {
    return { compatible: false, matchedSkills, matchedSoftSkills, distanceKm, reasons: [] };
  }
  // 4. 100% em formato de contratação
  if (!profile.contractTypes.includes(job.contractType)) {
    return { compatible: false, matchedSkills, matchedSoftSkills, distanceKm, reasons: [] };
  }
  // 5. 100% em formato de trabalho (modalidade)
  if (!profile.workplacePreferences.includes(job.mode)) {
    return { compatible: false, matchedSkills, matchedSoftSkills, distanceKm, reasons: [] };
  }
  // 6. 100% em formato de escala aceita
  if (!profile.workShifts.includes(job.workShift)) {
    return { compatible: false, matchedSkills, matchedSoftSkills, distanceKm, reasons: [] };
  }
  // 7. Distância até o local de trabalho quando presencial em local fixo
  const reasons: string[] = [
    `100% hard (${matchedSkills.length}/${job.tags.length}) e soft skills (${matchedSoftSkills.length}/${job.softSkills.length})`,
    `${job.contractType} · ${job.mode} · ${job.workSchedule} · ${job.workShift}`,
  ];
  if (job.mode === "Presencial" && job.isFixedLocation) {
    if (profile.maxDistanceKm == null || distanceKm == null || distanceKm > profile.maxDistanceKm) {
      return { compatible: false, matchedSkills, matchedSoftSkills, distanceKm, reasons: [] };
    }
    reasons.push(`Distância ${distanceKm.toLocaleString("pt-BR")} km (máx. ${profile.maxDistanceKm} km)`);
  }
  // 8. Salário bruto mensal (única exceção: pretensão <= salário da vaga)
  if (profile.salaryMonthly == null || job.salaryMonthly == null || profile.salaryMonthly > job.salaryMonthly) {
    return { compatible: false, matchedSkills, matchedSoftSkills, distanceKm, reasons: [] };
  }
  reasons.push(job.salaryMonthly > profile.salaryMonthly ? "Salário acima da pretensão" : "Salário igual à pretensão");

  return { compatible: true, matchedSkills, matchedSoftSkills, distanceKm, reasons };
}

function mapDatabaseJob(row: Record<string, any>): Job {
  const company = row.companies?.name || "Empresa";
  const status: Job["status"] = row.status === "draft" ? "Rascunho" : row.status === "paused" ? "Pausada" : row.status === "closed" ? "Encerrada" : "Ativa";
  const mode: Job["mode"] = row.workplace_mode === "remote" ? "Remoto" : row.workplace_mode === "hybrid" ? "Híbrido" : "Presencial";
  const date = row.published_at || row.created_at;
  const softSkills = Array.isArray(row.soft_skills) ? row.soft_skills.map((s: unknown) => String(s).trim()).filter(Boolean) : [];
  return {
    id: row.id,
    role: row.title,
    company,
    initials: company.slice(0,2).toUpperCase(),
    color: "blue",
    location: [row.city,row.state].filter(Boolean).join(", ") || "Brasil",
    mode,
    level: row.experience_level || "Não informado",
    salaryMonthly: row.salary_monthly,
    posted: date ? `Publicado em ${new Intl.DateTimeFormat("pt-BR").format(new Date(date))}` : "Data não informada",
    publishedAt: date ? String(date) : undefined,
    tags: String(row.requirements || "").split(/[,;\n]/).map((tag:string)=>tag.trim()).filter(Boolean),
    softSkills,
    workSchedule: String(row.work_schedule || "Comercial"),
    contractType: dbContractToUi[String(row.employment_type || "CLT")] || String(row.employment_type || "CLT"),
    workShift: String(row.work_shift || "5x2"),
    isFixedLocation: row.is_fixed_location !== false,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    description: row.description || "",
    benefits: row.benefits || "",
    status,
  };
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
  const [appFilter, setAppFilter] = useState<"all" | "active" | "closed">("all");
  const [expandedAppKey, setExpandedAppKey] = useState<string | number | null>(null);
  const [saved, setSaved] = useState<Array<number | string>>([]);
  const [query, setQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [mode, setMode] = useState("Todas");
  const [levelFilter, setLevelFilter] = useState("Todos");
  const [minSalaryFilter, setMinSalaryFilter] = useState("");
  const [sortBy, setSortBy] = useState<"match" | "salary" | "recent">("match");
  const [modalConsentAccepted, setModalConsentAccepted] = useState(false);
  const [selected, setSelected] = useState<Job | null>(null);
  const [toast, setToast] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  // Dados editáveis do candidato e da empresa.
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [profileBackup, setProfileBackup] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [skillDraft, setSkillDraft] = useState("");
  const [softSkillDraft, setSoftSkillDraft] = useState("");
  const [showSoftSkillsTable, setShowSoftSkillsTable] = useState(false);
  const [hardSkillDetails, setHardSkillDetails] = useState<CandidateHardSkillDetail[]>([]);
  const [pendingHardSkill, setPendingHardSkill] = useState<{ skillName: string; existing?: CandidateHardSkillDetail | null; queue?: string[] } | null>(null);
  const [experiences, setExperiences] = useState<CandidateExperience[]>([]);
  const [educations, setEducations] = useState<CandidateEducation[]>([]);
  const [languages, setLanguages] = useState<CandidateLanguage[]>([]);
  const [internationalExps, setInternationalExps] = useState<CandidateInternationalExperience[]>([]);
  const [eduCategoryFilter, setEduCategoryFilter] = useState<"todas" | EducationCategory>("todas");
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState<CandidateExperience | null>(null);
  const [showEduForm, setShowEduForm] = useState(false);
  const [editingEdu, setEditingEdu] = useState<CandidateEducation | null>(null);
  const [showLangForm, setShowLangForm] = useState(false);
  const [editingLang, setEditingLang] = useState<CandidateLanguage | null>(null);
  const [showIntlForm, setShowIntlForm] = useState(false);
  const [editingIntl, setEditingIntl] = useState<CandidateInternationalExperience | null>(null);
  const [otherLicenseDraft, setOtherLicenseDraft] = useState("");
  const [uploadingPcdProof, setUploadingPcdProof] = useState(false);
  const [companyMode, setCompanyMode] = useState(false);
  const [posted, setPosted] = useState<Job[]>([]);
  const [showNewJob, setShowNewJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  // Controles de privacidade, notificações, ajuda e autoavaliação.
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [consentHistory, setConsentHistory] = useState<ConsentRecordItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seenNotifications, setSeenNotifications] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [faqQuery, setFaqQuery] = useState("");
  const [faqCategory, setFaqCategory] = useState("Todas");
  const [openFaqIds, setOpenFaqIds] = useState<string[]>(["match-skills"]);
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
        ["ec-profile", "ec-hard-skills", "ec-experiences", "ec-educations", "ec-languages", "ec-international", "ec-applications", "ec-saved", "ec-posted", "ec-privacy-consent", "ec-employer", "ec-assessments", "ec-demo-entered", "ec-seen-notifications"].forEach(key => localStorage.removeItem(key));
        setApplications([]); setSaved([]); setPosted([]); setPrivacyConsent(false); setConsentHistory([]); setAssessmentResults([]); setProfile(initialProfile); setHardSkillDetails([]); setExperiences([]); setEducations([]); setLanguages([]); setInternationalExps([]); setSeenNotifications(0);
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
      if (role === "candidate" && !profileData?.headline && !profileData?.city && profileData?.salary_monthly == null && (user.user_metadata?.headline || user.user_metadata?.city || user.user_metadata?.salary_monthly)) {
        const metadataProfile = { headline: user.user_metadata?.headline || null, city: user.user_metadata?.city || null, salary_monthly: user.user_metadata?.salary_monthly ? Number(user.user_metadata.salary_monthly) : null };
        await supabase.from("profiles").update(metadataProfile).eq("id", user.id);
        profileData = { ...profileData, ...metadataProfile };
      }
      setAccountRole(role);
      setEntered(true);
      setCompanyMode(role === "recruiter");
      setActive(current => {
        if (role === "recruiter") return ["company", "companyJobs", "talents", "reports", "companyProfile"].includes(current) ? current : "company";
        if (role === "admin") return current === "admin" || entryKind === "admin" ? "admin" : current;
        return ["home", "jobs", "applications", "evolution", "profile", "saved", "settings", "faq"].includes(current) ? current : "home";
      });
      const dbPrefs: WorkplaceMode[] = Array.isArray(profileData?.workplace_preferences)
        ? profileData.workplace_preferences.map((m: string) => dbWorkplaceToUi[m]).filter(Boolean)
        : [];
      setProfile(current => ({
        ...current,
        name: profileData?.full_name || String(user.user_metadata?.full_name || ""),
        role: profileData?.headline || "",
        city: profileData?.city || "",
        state: profileData?.state || "",
        salaryMonthly: profileData?.salary_monthly ?? null,
        workplacePreferences: dbPrefs,
        workSchedules: Array.isArray(profileData?.work_schedules) ? profileData.work_schedules : [],
        contractTypes: Array.isArray(profileData?.contract_types) ? profileData.contract_types : [],
        workShifts: Array.isArray(profileData?.work_shifts) ? profileData.work_shifts : [],
        maxDistanceKm: profileData?.max_distance_km != null ? Number(profileData.max_distance_km) : null,
        latitude: profileData?.latitude != null ? Number(profileData.latitude) : null,
        longitude: profileData?.longitude != null ? Number(profileData.longitude) : null,
        skills: profileData?.declared_skills || [],
        softSkills: profileData?.declared_soft_skills || [],
        travelAvailability: (profileData?.travel_availability as TravelAvailability) || "",
        relocationAvailability: Boolean(profileData?.relocation_availability),
        travelNotes: profileData?.travel_notes || "",
        cnhCategories: Array.isArray(profileData?.cnh_categories) ? profileData.cnh_categories : [],
        cnhEar: Boolean(profileData?.cnh_ear),
        hasOwnVehicle: Boolean(profileData?.has_own_vehicle),
        otherLicenses: Array.isArray(profileData?.other_licenses) ? profileData.other_licenses : [],
        maritalStatus: (profileData?.marital_status as MaritalStatus) || "nao_informar",
        hasChildren: typeof profileData?.has_children === "boolean" ? profileData.has_children : null,
        childrenCount: profileData?.children_count != null ? Number(profileData.children_count) : null,
        familyNotes: profileData?.family_notes || "",
        isPcd: typeof profileData?.is_pcd === "boolean" ? profileData.is_pcd : null,
        pcdTypes: Array.isArray(profileData?.pcd_types) ? profileData.pcd_types : [],
        pcdCid: profileData?.pcd_cid || "",
        accessibilityNeeds: profileData?.accessibility_needs || "",
        pcdProofPath: profileData?.pcd_proof_path || null,
        pcdProofFileName: profileData?.pcd_proof_file_name || "",
        pcdProofMimeType: profileData?.pcd_proof_mime_type || "",
        pcdProofSizeBytes: profileData?.pcd_proof_size_bytes != null ? Number(profileData.pcd_proof_size_bytes) : null,
        shareSensitiveInApplications: Boolean(profileData?.share_sensitive_in_applications),
        bio: profileData?.bio || "",
        visible: profileData?.profile_visible ?? false,
      }));
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
      const { data: databaseApplications } = await supabase.from("applications").select("*, jobs(*, companies(name)), application_feedback(id, summary, visible_to_candidate), application_events(status, created_at)").order("submitted_at", { ascending: false });
      if (databaseApplications) setApplications(databaseApplications.map((row:Record<string,any>) => {
        const snapshot=row.candidate_snapshot;
        const mappedJob = row.jobs ? mapDatabaseJob(row.jobs as Record<string, any>) : undefined;
        const feedback=Array.isArray(row.application_feedback)?row.application_feedback[0]:row.application_feedback;
        const rawEvents = Array.isArray(row.application_events) ? row.application_events : [];
        const events: ApplicationEventItem[] = [...rawEvents]
          .sort((a: Record<string, any>, b: Record<string, any>) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((ev: Record<string, any>) => ({
            status: dbApplicationStatus[ev.status] || String(ev.status || "Inscrição enviada"),
            date: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ev.created_at)),
            rawDate: String(ev.created_at),
          }));
        return { id:row.id, feedbackId:feedback?.id, recruiterNote:feedback?.summary, jobId:row.job_id, job:mappedJob, status:dbApplicationStatus[row.status] || "Inscrição enviada", date:new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(row.submitted_at)), rawDate:String(row.submitted_at), events, candidateSnapshot:snapshot?{
          ...initialProfile,
          name:snapshot.name||"",role:snapshot.role||"",city:snapshot.city||"",state:snapshot.state||"",salaryMonthly:snapshot.salaryMonthly??null,
          skills:snapshot.skills||[],softSkills:snapshot.softSkills||[],
          hardSkillDetails:Array.isArray(snapshot.hardSkillDetails)?snapshot.hardSkillDetails.map((d:Record<string,any>)=>mapDatabaseHardSkill(d)):[],
          educationsSnapshot:Array.isArray(snapshot.educations)?snapshot.educations.map((e:Record<string,any>)=>mapDatabaseEducation(e)):[],
          languagesSnapshot:Array.isArray(snapshot.languages)?snapshot.languages.map((l:Record<string,any>)=>mapDatabaseLanguage(l)):[],
          internationalSnapshot:Array.isArray(snapshot.internationalExperiences)?snapshot.internationalExperiences.map((ie:Record<string,any>)=>mapDatabaseInternational(ie)):[],
          travelAvailability:(snapshot.travelAvailability as TravelAvailability)||"",
          relocationAvailability:Boolean(snapshot.relocationAvailability),
          travelNotes:snapshot.travelNotes||"",
          cnhCategories:Array.isArray(snapshot.cnhCategories)?snapshot.cnhCategories:[],
          cnhEar:Boolean(snapshot.cnhEar),
          hasOwnVehicle:Boolean(snapshot.hasOwnVehicle),
          otherLicenses:Array.isArray(snapshot.otherLicenses)?snapshot.otherLicenses:[],
          maritalStatus:(snapshot.maritalStatus as MaritalStatus)||"nao_informar",
          hasChildren:typeof snapshot.hasChildren==="boolean"?snapshot.hasChildren:null,
          childrenCount:snapshot.childrenCount!=null?Number(snapshot.childrenCount):null,
          familyNotes:snapshot.familyNotes||"",
          shareSensitiveInApplications:Boolean(snapshot.shareSensitiveInApplications),
          isPcd:typeof snapshot.isPcd==="boolean"?snapshot.isPcd:null,
          pcdTypes:Array.isArray(snapshot.pcdTypes)?snapshot.pcdTypes:[],
          pcdCid:snapshot.pcdCid||"",
          accessibilityNeeds:snapshot.accessibilityNeeds||"",
          pcdProofPath:snapshot.pcdProofPath||null,
          pcdProofFileName:snapshot.pcdProofFileName||"",
          bio:snapshot.bio||"",visible:snapshot.visible??false,
        }:undefined };
      }));
      if (role === "candidate") {
        const [{ data: savedRows }, { data: consent }, { data: expRows }, { data: eduRows }, { data: consentRows }, { data: hardSkillRows }, { data: langRows }, { data: intlRows }] = await Promise.all([
          supabase.from("saved_jobs").select("job_id").eq("profile_id", user.id),
          supabase.rpc("has_current_privacy_consent", { target_profile: user.id, target_purpose: "application_profile_sharing" }),
          supabase.from("candidate_experiences").select("*").eq("profile_id", user.id).order("is_current", { ascending: false }).order("started_on", { ascending: false }),
          supabase.from("candidate_educations").select("*").eq("profile_id", user.id).order("is_current", { ascending: false }).order("started_on", { ascending: false }),
          supabase.from("consent_records").select("id, purpose, policy_version, granted, recorded_at").eq("profile_id", user.id).order("recorded_at", { ascending: false }).limit(20),
          supabase.from("candidate_hard_skills").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }),
          supabase.from("candidate_languages").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }),
          supabase.from("candidate_international_experiences").select("*").eq("profile_id", user.id).order("is_current", { ascending: false }).order("started_on", { ascending: false }),
        ]);
        if (savedRows) setSaved(savedRows.map(row=>row.job_id));
        setPrivacyConsent(Boolean(consent));
        if (expRows) setExperiences(expRows.map(row => mapDatabaseExperience(row as Record<string, any>)));
        if (eduRows) setEducations(eduRows.map(row => mapDatabaseEducation(row as Record<string, any>)));
        if (hardSkillRows) setHardSkillDetails(hardSkillRows.map(row => mapDatabaseHardSkill(row as Record<string, any>)));
        if (langRows) setLanguages(langRows.map(row => mapDatabaseLanguage(row as Record<string, any>)));
        if (intlRows) setInternationalExps(intlRows.map(row => mapDatabaseInternational(row as Record<string, any>)));
        if (consentRows) setConsentHistory(consentRows.map((row: Record<string, any>) => ({
          id: String(row.id),
          purpose: String(row.purpose || ""),
          policyVersion: String(row.policy_version || ""),
          granted: Boolean(row.granted),
          recordedAt: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(row.recorded_at)),
        })));
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
    setHardSkillDetails(load<CandidateHardSkillDetail[]>("ec-hard-skills", []));
    setExperiences(load<CandidateExperience[]>("ec-experiences", []));
    setEducations(load<CandidateEducation[]>("ec-educations", []));
    setLanguages(load<CandidateLanguage[]>("ec-languages", []));
    setInternationalExps(load<CandidateInternationalExperience[]>("ec-international", []));
    setPosted(load("ec-posted", []));
    setPrivacyConsent(load("ec-privacy-consent", false));
    setEmployer(load("ec-employer", { name: "", website: "", description: "" }));
    setAssessmentResults(load("ec-assessments", []));
    setSeenNotifications(load("ec-seen-notifications", 0));
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
  // Registra uma candidatura após consentimento explícito de compartilhamento do perfil.
  const apply = async (job: Job, allowInlineConsent = false) => {
    const canShare = privacyConsent || allowInlineConsent;
    if (!canShare) { notify("Marque a autorização de compartilhamento do perfil para se candidatar."); return; }
    if (applications.some(a => a.jobId === job.id)) { notify("Você já se candidatou a esta vaga."); return; }
    if (!privacyConsent && allowInlineConsent) {
      setPrivacyConsent(true);
      localStorage.setItem("ec-privacy-consent", JSON.stringify(true));
    }
    if (supabase && authUser && accountRole === "candidate" && typeof job.id === "string") {
      const { error } = await supabase.rpc("record_privacy_consent", { target_purpose: "application_profile_sharing", is_granted: true });
      if (error) { notify("Não foi possível registrar o consentimento: "+error.message); return; }
      void refreshConsentHistory();
      const { data, error: applicationError } = await supabase.from("applications").insert({ job_id: job.id, candidate_id: authUser.id, profile_shared: true }).select("id, submitted_at, status, candidate_snapshot").single();
      if (applicationError) { notify("Não foi possível enviar a candidatura: "+applicationError.message); return; }
      const row=data as Record<string,any>;
      const submittedDate = new Date(row.submitted_at);
      const formattedEventDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(submittedDate);
      persistApps([{id:row.id,jobId:job.id,job,status:dbApplicationStatus[row.status]||"Inscrição enviada",date:new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(submittedDate),rawDate:String(row.submitted_at),events:[{status:dbApplicationStatus[row.status]||"Inscrição enviada",date:formattedEventDate,rawDate:String(row.submitted_at)}],candidateSnapshot:{...profile,skills:[...profile.skills]}},...applications]);
    } else {
      const now = new Date();
      const formattedEventDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(now);
      persistApps([{ jobId: job.id, job, status: "Inscrição enviada", date: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(now), rawDate: now.toISOString(), events: [{ status: "Inscrição enviada", date: formattedEventDate, rawDate: now.toISOString() }], candidateSnapshot: { ...profile, skills: [...profile.skills] } }, ...applications]);
    }
    setModalConsentAccepted(false); setSelected(null); setActive("applications"); notify("Candidatura enviada com sucesso!");
  };
  // Vagas publicadas no catálogo e seleção automática apenas das 100% compatíveis com o perfil.
  const publishedCatalogJobs: MatchedJob[] = useMemo(() => [...jobs, ...posted]
    .filter(j => j.status !== "Pausada" && j.status !== "Encerrada" && j.status !== "Rascunho")
    .map(j => {
      const result = evaluateJobMatch(j, profile);
      return { ...j, matchedSkills: result.matchedSkills, matchedSoftSkills: result.matchedSoftSkills, distanceKm: result.distanceKm, matchReasons: result.reasons };
    }), [posted, profile]);
  const missingMatchCriteria = useMemo(() => {
    const missing: string[] = [];
    if (profile.skills.length === 0) missing.push("Hard skills");
    if (profile.softSkills.length === 0) missing.push("Soft skills");
    if (profile.workSchedules.length === 0) missing.push("Horários aceitos");
    if (profile.contractTypes.length === 0) missing.push("Formato de contratação");
    if (profile.workplacePreferences.length === 0) missing.push("Formato de trabalho");
    if (profile.workShifts.length === 0) missing.push("Formato de escala");
    if (profile.salaryMonthly == null) missing.push("Pretensão salarial");
    if (profile.workplacePreferences.includes("Presencial") && (profile.maxDistanceKm == null || profile.latitude == null || profile.longitude == null)) {
      missing.push("Distância máxima e localização (para presencial fixo)");
    }
    return missing;
  }, [profile]);
  const hasMatchCriteria = missingMatchCriteria.length === 0;
  const activeProfileCriteria = useMemo(() => {
    const items: string[] = [];
    if (profile.skills.length > 0) items.push(`Hard skills: ${profile.skills.length}`);
    if (profile.softSkills.length > 0) items.push(`Soft skills: ${profile.softSkills.length}`);
    if (profile.workSchedules.length > 0) items.push(`Horário: ${profile.workSchedules.join(", ")}`);
    if (profile.contractTypes.length > 0) items.push(`Contratação: ${profile.contractTypes.join(", ")}`);
    if (profile.workplacePreferences.length > 0) items.push(`Trabalho: ${profile.workplacePreferences.join(", ")}`);
    if (profile.workShifts.length > 0) items.push(`Escala: ${profile.workShifts.join(", ")}`);
    if (profile.salaryMonthly != null) items.push(`Salário ≥ ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(profile.salaryMonthly)}`);
    if (profile.maxDistanceKm != null) items.push(`Distância presencial ≤ ${profile.maxDistanceKm} km`);
    return items;
  }, [profile]);
  const allJobs: MatchedJob[] = useMemo(() => publishedCatalogJobs.filter(j => evaluateJobMatch(j, profile).compatible), [publishedCatalogJobs, profile]);
  const activeFilterCount = (mode !== "Todas" ? 1 : 0) + (levelFilter !== "Todos" ? 1 : 0) + (minSalaryFilter.trim() ? 1 : 0) + (locationQuery.trim() ? 1 : 0);
  const clearJobFilters = () => { setQuery(""); setLocationQuery(""); setMode("Todas"); setLevelFilter("Todos"); setMinSalaryFilter(""); };
  // Aplica filtros adicionais sobre as vagas que já deram match automático com o perfil.
  const visibleJobs = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    const loc = locationQuery.trim().toLocaleLowerCase("pt-BR");
    const minSal = Number(minSalaryFilter);
    return allJobs.filter(j => {
      const textOk = !q || `${j.role} ${j.company} ${j.tags.join(" ")} ${j.description}`.toLocaleLowerCase("pt-BR").includes(q);
      const locOk = !loc || normalizeText(j.location).includes(normalizeText(loc));
      const modeOk = mode === "Todas" || j.mode === mode;
      const levelOk = levelFilter === "Todos" || j.level === levelFilter;
      const salOk = !minSalaryFilter.trim() || (!Number.isNaN(minSal) && (j.salaryMonthly ?? 0) >= minSal);
      return textOk && locOk && modeOk && levelOk && salOk;
    }).sort((a, b) => {
      if (sortBy === "salary") return (b.salaryMonthly ?? 0) - (a.salaryMonthly ?? 0);
      if (sortBy === "recent") return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
      return b.matchedSkills.length - a.matchedSkills.length || (b.salaryMonthly ?? 0) - (a.salaryMonthly ?? 0);
    });
  }, [allJobs, query, locationQuery, mode, levelFilter, minSalaryFilter, sortBy]);
  const savedJobs = useMemo(() => publishedCatalogJobs.filter(j => saved.includes(j.id)), [publishedCatalogJobs, saved]);
  // Localiza uma vaga no catálogo ativo ou nos dados preservados da própria candidatura.
  const byId = (id: number | string) => [...jobs, ...posted].find(j => j.id === id) || applications.find(a => a.jobId === id && a.job)?.job;
  const closedAppStatuses = ["Contratado", "Não selecionado", "Desistiu"];
  const filteredApplications = useMemo(() => applications.filter(app => {
    const isClosed = closedAppStatuses.includes(app.status);
    if (appFilter === "active") return !isClosed;
    if (appFilter === "closed") return isClosed;
    return true;
  }), [applications, appFilter]);
  // Funções centralizadas de gravação para que as telas compartilhem os mesmos dados.
  // Persiste alterações do perfil para que formulários, match 100% e cartões usem o mesmo valor.
  const saveProfile = async (next: Profile, silent = false) => {
    const cleanedSkills = next.skills.map(s => s.trim()).filter(Boolean).slice(0, 50);
    const cleanedSoftSkills = next.softSkills.map(s => s.trim()).filter(Boolean).slice(0, 50);
    const normalized: Profile = {
      ...next,
      name: next.name.trim(),
      role: next.role.trim(),
      city: next.city.trim(),
      state: next.state.trim().toLocaleUpperCase("pt-BR").slice(0, 2),
      skills: cleanedSkills,
      softSkills: cleanedSoftSkills,
      travelNotes: next.travelNotes.trim(),
      cnhCategories: next.cnhCategories.filter(Boolean).slice(0, 10),
      otherLicenses: next.otherLicenses.map(s => s.trim()).filter(Boolean).slice(0, 30),
      childrenCount: next.hasChildren === true ? (next.childrenCount ?? 1) : null,
      familyNotes: next.familyNotes.trim(),
      pcdTypes: next.isPcd === true ? next.pcdTypes.filter(Boolean).slice(0, 10) : [],
      pcdCid: next.isPcd === true ? next.pcdCid.trim() : "",
      accessibilityNeeds: next.accessibilityNeeds.trim(),
      bio: next.bio.trim(),
    };
    setProfile(normalized);
    localStorage.setItem("ec-profile", JSON.stringify(normalized));
    if (supabase && authUser) {
      const { error } = await supabase.from("profiles").update({
        full_name: normalized.name,
        headline: normalized.role || null,
        city: normalized.city || null,
        state: normalized.state || null,
        salary_monthly: normalized.salaryMonthly,
        workplace_preferences: normalized.workplacePreferences.map(m => uiWorkplaceToDb[m]),
        work_schedules: normalized.workSchedules,
        contract_types: normalized.contractTypes,
        work_shifts: normalized.workShifts,
        max_distance_km: normalized.maxDistanceKm,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        declared_skills: normalized.skills,
        declared_soft_skills: normalized.softSkills,
        travel_availability: normalized.travelAvailability || null,
        relocation_availability: normalized.relocationAvailability,
        travel_notes: normalized.travelNotes || null,
        cnh_categories: normalized.cnhCategories,
        cnh_ear: normalized.cnhEar,
        has_own_vehicle: normalized.hasOwnVehicle,
        other_licenses: normalized.otherLicenses,
        marital_status: normalized.maritalStatus || "nao_informar",
        has_children: normalized.hasChildren,
        children_count: normalized.childrenCount,
        family_notes: normalized.familyNotes || null,
        is_pcd: normalized.isPcd,
        pcd_types: normalized.pcdTypes,
        pcd_cid: normalized.pcdCid || null,
        accessibility_needs: normalized.accessibilityNeeds || null,
        pcd_proof_path: normalized.pcdProofPath,
        pcd_proof_file_name: normalized.pcdProofFileName || null,
        pcd_proof_mime_type: normalized.pcdProofMimeType || null,
        pcd_proof_size_bytes: normalized.pcdProofSizeBytes,
        share_sensitive_in_applications: normalized.shareSensitiveInApplications,
        bio: normalized.bio || null,
        profile_visible: normalized.visible,
      }).eq("id", authUser.id);
      if (error) {
        notify("Perfil salvo localmente; o banco recusou a atualização: " + error.message);
        return false;
      }
    }
    if (!silent) notify("Perfil salvo com sucesso.");
    return true;
  };
  const refreshConsentHistory = async () => {
    if (!supabase || !authUser) return;
    const { data: consentRows } = await supabase.from("consent_records").select("id, purpose, policy_version, granted, recorded_at").eq("profile_id", authUser.id).order("recorded_at", { ascending: false }).limit(20);
    if (consentRows) setConsentHistory(consentRows.map((row: Record<string, any>) => ({
      id: String(row.id),
      purpose: String(row.purpose || ""),
      policyVersion: String(row.policy_version || ""),
      granted: Boolean(row.granted),
      recordedAt: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(row.recorded_at)),
    })));
  };
  // Registra o consentimento de descoberta antes de alterar a visibilidade do perfil.
  const toggleProfileVisibility = async (visible: boolean) => {
    if (supabase && authUser) {
      const { error } = await supabase.rpc("record_privacy_consent", { target_purpose: "profile_discovery", is_granted: visible });
      if (error) { notify("O banco recusou o consentimento de visibilidade: " + error.message); return; }
      void refreshConsentHistory();
    }
    const ok = await saveProfile({ ...profile, visible }, true);
    if (ok) notify(visible ? "Perfil visível para empresas validadas." : "Perfil ocultado das buscas.");
  };
  const openHardSkillModal = (skillName: string, queue?: string[]) => {
    const clean = skillName.trim();
    if (!clean) return;
    const existing = hardSkillDetails.find(d => d.skillName.toLocaleLowerCase("pt-BR") === clean.toLocaleLowerCase("pt-BR")) || null;
    if (!existing && profile.skills.length >= 50) {
      notify("Limite máximo de 50 hard skills atingido.");
      return;
    }
    setPendingHardSkill({ skillName: existing?.skillName || clean, existing, queue });
  };
  const addSkillTag = () => {
    const clean = skillDraft.trim();
    if (!clean) return;
    setSkillDraft("");
    openHardSkillModal(clean);
  };
  const removeSkillTag = async (skill: string) => {
    const existing = hardSkillDetails.find(d => d.skillName.toLocaleLowerCase("pt-BR") === skill.toLocaleLowerCase("pt-BR"));
    if (supabase && authUser && existing) {
      if (!existing.id.startsWith("local-")) {
        const { error } = await supabase.from("candidate_hard_skills").delete().eq("id", existing.id).eq("profile_id", authUser.id);
        if (error) { notify("Não foi possível remover os detalhes da hard skill: " + error.message); return; }
      }
      if (existing.proofPath) {
        await supabase.storage.from("skill-proofs").remove([existing.proofPath]);
      }
    }
    const nextDetails = hardSkillDetails.filter(d => d.skillName.toLocaleLowerCase("pt-BR") !== skill.toLocaleLowerCase("pt-BR"));
    setHardSkillDetails(nextDetails);
    localStorage.setItem("ec-hard-skills", JSON.stringify(nextDetails));
    const next = { ...profile, skills: profile.skills.filter(s => s.toLocaleLowerCase("pt-BR") !== skill.toLocaleLowerCase("pt-BR")) };
    if (editing) setProfile(next);
    else void saveProfile(next, true).then(ok => { if (ok) notify(`Hard skill "${skill}" removida.`); });
  };
  const toggleHardSkillTag = (skill: string) => {
    openHardSkillModal(skill);
  };
  const addManyHardSkillTags = (skillsToAdd: string[]) => {
    const existingLower = new Set(profile.skills.map(s => s.toLocaleLowerCase("pt-BR")));
    const additions = skillsToAdd.filter(s => !existingLower.has(s.toLocaleLowerCase("pt-BR")));
    if (additions.length === 0) { notify("Todas as hard skills deste cargo já estão no seu perfil."); return; }
    const available = Math.max(0, 50 - profile.skills.length);
    if (available === 0) { notify("Limite máximo de 50 hard skills atingido."); return; }
    const queued = additions.slice(0, available);
    openHardSkillModal(queued[0], queued.slice(1));
  };
  const saveHardSkillDetail = async (input: {
    skillName: string;
    proficiency: HardSkillLevel;
    experienceMonths: number;
    proofInstitution: string;
    file: File | null;
    existing?: CandidateHardSkillDetail | null;
  }) => {
    const cleanName = input.skillName.trim();
    if (!cleanName) { notify("Informe o nome da hard skill."); return false; }
    if (!Number.isFinite(input.experienceMonths) || input.experienceMonths <= 0) {
      notify("Informe o tempo de experiência na hard skill.");
      return false;
    }
    if (!input.proofInstitution.trim()) {
      notify("Informe a instituição emissora do documento comprobatório.");
      return false;
    }
    if (!input.file && !input.existing?.proofFileName) {
      notify("Envie o documento comprobatório (certificado ou diploma) da hard skill.");
      return false;
    }
    if (input.file) {
      if (!isPdfFileName(input.file.name) || (input.file.type && !allowedProofMimeTypes.includes(input.file.type))) {
        notify("Formato não aceito. Envie apenas arquivos em formato PDF (.pdf).");
        return false;
      }
      if (input.file.size > maxProofSizeBytes) {
        notify("O documento PDF excede o limite de 10 MB.");
        return false;
      }
      if (!(await hasPdfMagicHeader(input.file))) {
        notify("Arquivo inválido. Envie um documento PDF (.pdf) autêntico.");
        return false;
      }
    }
    let proofPath = input.existing?.proofPath || null;
    let proofFileName = input.existing?.proofFileName || "";
    let proofMimeType = input.existing?.proofMimeType || "";
    let proofSizeBytes = input.existing?.proofSizeBytes ?? null;

    if (supabase && authUser) {
      if (input.file) {
        const rawBase = input.file.name.replace(/\.pdf$/i, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 72) || "documento";
        const safeName = `${rawBase}.pdf`;
        const nextPath = `${authUser.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("skill-proofs").upload(nextPath, input.file, { contentType: "application/pdf", upsert: false });
        if (uploadError) {
          notify("Não foi possível enviar o comprovante ao armazenamento privado: " + uploadError.message);
          return false;
        }
        if (proofPath && proofPath !== nextPath) {
          await supabase.storage.from("skill-proofs").remove([proofPath]);
        }
        proofPath = nextPath;
        proofFileName = input.file.name;
        proofMimeType = "application/pdf";
        proofSizeBytes = input.file.size;
      }
      const { data, error } = await supabase
        .from("candidate_hard_skills")
        .upsert({
          profile_id: authUser.id,
          skill_name: cleanName,
          proficiency: input.proficiency,
          experience_months: input.experienceMonths,
          proof_institution: input.proofInstitution.trim(),
          proof_path: proofPath,
          proof_file_name: proofFileName,
          proof_mime_type: proofMimeType || null,
          proof_size_bytes: proofSizeBytes,
        }, { onConflict: "profile_id,skill_name" })
        .select("*")
        .single();
      if (error) {
        notify("O banco recusou os detalhes da hard skill: " + error.message);
        return false;
      }
      const savedItem = mapDatabaseHardSkill(data as Record<string, any>);
      const nextDetails = [savedItem, ...hardSkillDetails.filter(d => d.skillName.toLocaleLowerCase("pt-BR") !== cleanName.toLocaleLowerCase("pt-BR"))];
      setHardSkillDetails(nextDetails);
      localStorage.setItem("ec-hard-skills", JSON.stringify(nextDetails));
    } else {
      if (input.file) {
        proofFileName = input.file.name;
        proofMimeType = "application/pdf";
        proofSizeBytes = input.file.size;
      }
      const savedLocal: CandidateHardSkillDetail = {
        id: input.existing?.id || `local-hs-${Date.now()}`,
        skillName: cleanName,
        proficiency: input.proficiency,
        experienceMonths: input.experienceMonths,
        proofInstitution: input.proofInstitution.trim(),
        proofPath,
        proofFileName,
        proofMimeType,
        proofSizeBytes,
      };
      const nextDetails = [savedLocal, ...hardSkillDetails.filter(d => d.skillName.toLocaleLowerCase("pt-BR") !== cleanName.toLocaleLowerCase("pt-BR"))];
      setHardSkillDetails(nextDetails);
      localStorage.setItem("ec-hard-skills", JSON.stringify(nextDetails));
    }

    const hasInSkills = profile.skills.some(s => s.toLocaleLowerCase("pt-BR") === cleanName.toLocaleLowerCase("pt-BR"));
    if (!hasInSkills) {
      const nextProfile = { ...profile, skills: [...profile.skills, cleanName] };
      if (editing) setProfile(nextProfile);
      else await saveProfile(nextProfile, true);
    }
    notify(`Hard skill "${cleanName}" salva (${hardSkillLevelLabel[input.proficiency]} · ${formatExperienceDuration(input.experienceMonths)}).`);

    const remainingQueue = pendingHardSkill?.queue || [];
    if (remainingQueue.length > 0) {
      openHardSkillModal(remainingQueue[0], remainingQueue.slice(1));
    } else {
      setPendingHardSkill(null);
    }
    return true;
  };
  const openProofDocument = async (proofPath: string | null, fileName?: string) => {
    if (!proofPath) {
      notify(fileName ? `Arquivo "${fileName}" registrado somente localmente neste navegador.` : "Nenhum arquivo armazenado para visualização.");
      return;
    }
    if (!supabase) { notify("Armazenamento privado disponível somente com Supabase conectado."); return; }
    const { data, error } = await supabase.storage.from("skill-proofs").createSignedUrl(proofPath, 60);
    if (error || !data?.signedUrl) {
      notify("Não foi possível gerar link temporário do documento: " + (error?.message || "acesso negado"));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const addSoftSkillTag = () => {
    const clean = softSkillDraft.trim();
    if (!clean) return;
    if (profile.softSkills.length >= 50) { notify("Limite máximo de 50 soft skills atingido."); return; }
    if (profile.softSkills.some(s => s.toLocaleLowerCase("pt-BR") === clean.toLocaleLowerCase("pt-BR"))) {
      notify("Esta soft skill já está cadastrada no perfil.");
      setSoftSkillDraft("");
      return;
    }
    const next = { ...profile, softSkills: [...profile.softSkills, clean] };
    setSoftSkillDraft("");
    if (editing) setProfile(next);
    else void saveProfile(next, true).then(ok => { if (ok) notify(`Soft skill "${clean}" adicionada.`); });
  };
  const removeSoftSkillTag = (skill: string) => {
    const next = { ...profile, softSkills: profile.softSkills.filter(s => s !== skill) };
    if (editing) setProfile(next);
    else void saveProfile(next, true).then(ok => { if (ok) notify(`Soft skill "${skill}" removida.`); });
  };
  const toggleSoftSkillTag = (skill: string) => {
    const exists = profile.softSkills.some(s => s.toLocaleLowerCase("pt-BR") === skill.toLocaleLowerCase("pt-BR"));
    if (exists) {
      const next = { ...profile, softSkills: profile.softSkills.filter(s => s.toLocaleLowerCase("pt-BR") !== skill.toLocaleLowerCase("pt-BR")) };
      if (editing) setProfile(next);
      else void saveProfile(next, true).then(ok => { if (ok) notify(`Soft skill "${skill}" removida.`); });
      return;
    }
    if (profile.softSkills.length >= 50) { notify("Limite máximo de 50 soft skills atingido."); return; }
    const next = { ...profile, softSkills: [...profile.softSkills, skill] };
    if (editing) setProfile(next);
    else void saveProfile(next, true).then(ok => { if (ok) notify(`Soft skill "${skill}" adicionada.`); });
  };
  const setManySoftSkillTags = (skillsList: string[], checked: boolean) => {
    const targetLower = new Set(skillsList.map(s => s.toLocaleLowerCase("pt-BR")));
    let nextSoft: string[];
    if (checked) {
      const existingLower = new Set(profile.softSkills.map(s => s.toLocaleLowerCase("pt-BR")));
      const additions = skillsList.filter(s => !existingLower.has(s.toLocaleLowerCase("pt-BR")));
      nextSoft = [...profile.softSkills, ...additions].slice(0, 50);
    } else {
      nextSoft = profile.softSkills.filter(s => !targetLower.has(s.toLocaleLowerCase("pt-BR")));
    }
    const next = { ...profile, softSkills: nextSoft };
    if (editing) setProfile(next);
    else void saveProfile(next, true).then(ok => { if (ok) notify("Lista de soft skills atualizada."); });
  };
  const toggleProfileListOption = (field: "workSchedules" | "contractTypes" | "workShifts", value: string, label: string) => {
    const list = profile[field];
    const nextList = list.includes(value) ? list.filter(x => x !== value) : [...list, value];
    const next = { ...profile, [field]: nextList };
    if (editing) setProfile(next);
    else void saveProfile(next, true).then(ok => { if (ok) notify(`${label} atualizado.`); });
  };
  const applyLocationPresetToProfile = (presetLabel: string) => {
    const preset = locationPresets.find(p => p.label === presetLabel);
    if (!preset) return;
    const next = { ...profile, city: preset.city, state: preset.state, latitude: preset.lat, longitude: preset.lng };
    if (editing) setProfile(next);
    else void saveProfile(next, true).then(ok => { if (ok) notify(`Localização de referência definida: ${preset.label}.`); });
  };
  const captureBrowserLocationForProfile = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { notify("Geolocalização não suportada neste navegador."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const next = { ...profile, latitude: Number(pos.coords.latitude.toFixed(5)), longitude: Number(pos.coords.longitude.toFixed(5)) };
        if (editing) setProfile(next);
        else void saveProfile(next, true).then(ok => { if (ok) notify("Coordenadas capturadas do navegador."); });
      },
      () => notify("Não foi possível obter a localização do navegador. Você pode escolher uma região ou digitar latitude e longitude.")
    );
  };
  const toggleWorkplacePreference = (item: WorkplaceMode) => {
    const has = profile.workplacePreferences.includes(item);
    const nextPrefs = has ? profile.workplacePreferences.filter(m => m !== item) : [...profile.workplacePreferences, item];
    const next = { ...profile, workplacePreferences: nextPrefs };
    if (editing) setProfile(next);
    else void saveProfile(next, true).then(ok => { if (ok) notify("Preferências de modalidade atualizadas."); });
  };
  // CRUD estruturado de experiências profissionais (Supabase ou localStorage).
  const saveExperience = async (exp: Omit<CandidateExperience, "id"> & { id?: string }) => {
    if (!exp.jobTitle.trim() || !exp.companyName.trim()) { notify("Informe o cargo e a empresa."); return false; }
    if (exp.startedOn && exp.endedOn && !exp.isCurrent && exp.endedOn < exp.startedOn) {
      notify("A data de término não pode ser anterior à data de início.");
      return false;
    }
    const payload = {
      job_title: exp.jobTitle.trim(),
      company_name: exp.companyName.trim(),
      employment_type: exp.employmentType.trim() || null,
      city: exp.city.trim() || null,
      started_on: exp.startedOn || null,
      ended_on: exp.isCurrent ? null : (exp.endedOn || null),
      is_current: exp.isCurrent,
      description: exp.description.trim() || null,
    };
    if (supabase && authUser) {
      const isExisting = Boolean(exp.id && !exp.id.startsWith("local-"));
      const result = isExisting
        ? await supabase.from("candidate_experiences").update(payload).eq("id", exp.id!).eq("profile_id", authUser.id).select("*").single()
        : await supabase.from("candidate_experiences").insert({ profile_id: authUser.id, ...payload }).select("*").single();
      if (result.error) { notify("Não foi possível salvar a experiência: " + result.error.message); return false; }
      const savedRow = mapDatabaseExperience(result.data as Record<string, any>);
      const next = isExisting ? experiences.map(item => item.id === savedRow.id ? savedRow : item) : [savedRow, ...experiences];
      setExperiences(next);
      localStorage.setItem("ec-experiences", JSON.stringify(next));
      notify(isExisting ? "Experiência atualizada." : "Experiência adicionada ao perfil.");
      return true;
    }
    const savedLocal: CandidateExperience = {
      id: exp.id || `local-exp-${Date.now()}`,
      jobTitle: payload.job_title,
      companyName: payload.company_name,
      employmentType: payload.employment_type || "",
      city: payload.city || "",
      startedOn: payload.started_on || "",
      endedOn: payload.ended_on || "",
      isCurrent: payload.is_current,
      description: payload.description || "",
    };
    const next = exp.id ? experiences.map(item => item.id === savedLocal.id ? savedLocal : item) : [savedLocal, ...experiences];
    setExperiences(next);
    localStorage.setItem("ec-experiences", JSON.stringify(next));
    notify(exp.id ? "Experiência atualizada." : "Experiência adicionada.");
    return true;
  };
  const deleteExperience = async (id: string) => {
    if (!window.confirm("Remover esta experiência do seu perfil?")) return;
    if (supabase && authUser && !id.startsWith("local-")) {
      const { error } = await supabase.from("candidate_experiences").delete().eq("id", id).eq("profile_id", authUser.id);
      if (error) { notify("Não foi possível excluir a experiência: " + error.message); return; }
    }
    const next = experiences.filter(item => item.id !== id);
    setExperiences(next);
    localStorage.setItem("ec-experiences", JSON.stringify(next));
    notify("Experiência removida.");
  };
  // Upload privado padronizado exclusivamente em formato PDF (.pdf, até 10 MB).
  const uploadPrivatePdf = async (file: File, prefix: string, previousPath?: string | null) => {
    if (!isPdfFileName(file.name) || (file.type && !allowedProofMimeTypes.includes(file.type))) {
      notify("Formato não aceito. Envie apenas arquivos em formato PDF (.pdf).");
      return null;
    }
    if (file.size > maxProofSizeBytes) {
      notify("O documento PDF excede o limite de 10 MB.");
      return null;
    }
    if (!(await hasPdfMagicHeader(file))) {
      notify("Arquivo inválido. Envie um documento PDF (.pdf) autêntico.");
      return null;
    }
    if (supabase && authUser) {
      const rawBase = file.name.replace(/\.pdf$/i, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 64) || "documento";
      const nextPath = `${authUser.id}/${prefix}-${Date.now()}-${rawBase}.pdf`;
      const { error: uploadError } = await supabase.storage.from("skill-proofs").upload(nextPath, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        notify("Não foi possível enviar o PDF ao armazenamento privado: " + uploadError.message);
        return null;
      }
      if (previousPath && previousPath !== nextPath) {
        await supabase.storage.from("skill-proofs").remove([previousPath]);
      }
      return { proofPath: nextPath, proofFileName: file.name, proofMimeType: "application/pdf", proofSizeBytes: file.size };
    }
    return { proofPath: null, proofFileName: file.name, proofMimeType: "application/pdf", proofSizeBytes: file.size };
  };

  // CRUD estruturado de graduações, cursos e certificações especiais (Supabase ou localStorage).
  const saveEducation = async (edu: Omit<CandidateEducation, "id"> & { id?: string; file?: File | null; removeProof?: boolean }) => {
    if (!edu.institution.trim()) { notify("Informe a instituição ou entidade emissora."); return false; }
    if (edu.startedOn && edu.endedOn && !edu.isCurrent && edu.endedOn < edu.startedOn) {
      notify("A data de conclusão não pode ser anterior à data de início.");
      return false;
    }
    let proofPath = edu.removeProof ? null : (edu.proofPath || null);
    let proofFileName = edu.removeProof ? "" : (edu.proofFileName || "");
    let proofMimeType = edu.removeProof ? "" : (edu.proofMimeType || "");
    let proofSizeBytes = edu.removeProof ? null : (edu.proofSizeBytes ?? null);
    if (edu.removeProof && edu.proofPath && supabase && authUser) {
      await supabase.storage.from("skill-proofs").remove([edu.proofPath]);
    }
    if (edu.file) {
      const uploaded = await uploadPrivatePdf(edu.file, "edu", edu.proofPath);
      if (!uploaded) return false;
      proofPath = uploaded.proofPath;
      proofFileName = uploaded.proofFileName;
      proofMimeType = uploaded.proofMimeType;
      proofSizeBytes = uploaded.proofSizeBytes;
    }
    const payload = {
      category: edu.category || "graduacao",
      institution: edu.institution.trim(),
      degree: edu.degree.trim() || null,
      field_of_study: edu.fieldOfStudy.trim() || null,
      started_on: edu.startedOn || null,
      ended_on: edu.isCurrent ? null : (edu.endedOn || null),
      is_current: edu.isCurrent,
      workload_hours: edu.workloadHours != null && edu.workloadHours > 0 ? Math.round(edu.workloadHours) : null,
      credential_code: edu.credentialCode.trim() || null,
      expires_on: edu.expiresOn || null,
      description: edu.description.trim() || null,
      proof_path: proofPath,
      proof_file_name: proofFileName || null,
      proof_mime_type: proofMimeType || null,
      proof_size_bytes: proofSizeBytes,
    };
    if (supabase && authUser) {
      const isExisting = Boolean(edu.id && !edu.id.startsWith("local-"));
      const result = isExisting
        ? await supabase.from("candidate_educations").update(payload).eq("id", edu.id!).eq("profile_id", authUser.id).select("*").single()
        : await supabase.from("candidate_educations").insert({ profile_id: authUser.id, ...payload }).select("*").single();
      if (result.error) { notify("Não foi possível salvar o registro: " + result.error.message); return false; }
      const savedRow = mapDatabaseEducation(result.data as Record<string, any>);
      const next = isExisting ? educations.map(item => item.id === savedRow.id ? savedRow : item) : [savedRow, ...educations];
      setEducations(next);
      localStorage.setItem("ec-educations", JSON.stringify(next));
      notify(isExisting ? "Formação/certificação atualizada." : "Formação/certificação adicionada ao perfil.");
      return true;
    }
    const savedLocal: CandidateEducation = {
      id: edu.id || `local-edu-${Date.now()}`,
      category: payload.category,
      institution: payload.institution,
      degree: payload.degree || "",
      fieldOfStudy: payload.field_of_study || "",
      startedOn: payload.started_on || "",
      endedOn: payload.ended_on || "",
      isCurrent: payload.is_current,
      workloadHours: payload.workload_hours,
      credentialCode: payload.credential_code || "",
      expiresOn: payload.expires_on || "",
      description: payload.description || "",
      proofPath,
      proofFileName,
      proofMimeType,
      proofSizeBytes,
    };
    const next = edu.id ? educations.map(item => item.id === savedLocal.id ? savedLocal : item) : [savedLocal, ...educations];
    setEducations(next);
    localStorage.setItem("ec-educations", JSON.stringify(next));
    notify(edu.id ? "Formação/certificação atualizada." : "Formação/certificação adicionada.");
    return true;
  };
  const deleteEducation = async (id: string) => {
    if (!window.confirm("Remover este item do seu perfil?")) return;
    const target = educations.find(item => item.id === id);
    if (supabase && authUser && !id.startsWith("local-")) {
      const { error } = await supabase.from("candidate_educations").delete().eq("id", id).eq("profile_id", authUser.id);
      if (error) { notify("Não foi possível excluir: " + error.message); return; }
      if (target?.proofPath) await supabase.storage.from("skill-proofs").remove([target.proofPath]);
    }
    const next = educations.filter(item => item.id !== id);
    setEducations(next);
    localStorage.setItem("ec-educations", JSON.stringify(next));
    notify("Registro removido.");
  };

  // CRUD estruturado de idiomas (Supabase ou localStorage).
  const saveLanguage = async (lang: Omit<CandidateLanguage, "id"> & { id?: string; file?: File | null; removeProof?: boolean }) => {
    const cleanLang = lang.language.trim();
    if (!cleanLang) { notify("Informe o idioma."); return false; }
    let proofPath = lang.removeProof ? null : (lang.proofPath || null);
    let proofFileName = lang.removeProof ? "" : (lang.proofFileName || "");
    let proofMimeType = lang.removeProof ? "" : (lang.proofMimeType || "");
    let proofSizeBytes = lang.removeProof ? null : (lang.proofSizeBytes ?? null);
    if (lang.removeProof && lang.proofPath && supabase && authUser) {
      await supabase.storage.from("skill-proofs").remove([lang.proofPath]);
    }
    if (lang.file) {
      const uploaded = await uploadPrivatePdf(lang.file, "lang", lang.proofPath);
      if (!uploaded) return false;
      proofPath = uploaded.proofPath;
      proofFileName = uploaded.proofFileName;
      proofMimeType = uploaded.proofMimeType;
      proofSizeBytes = uploaded.proofSizeBytes;
    }
    const payload = {
      language: cleanLang,
      proficiency: lang.proficiency,
      certification: lang.certification.trim() || null,
      proof_path: proofPath,
      proof_file_name: proofFileName || null,
      proof_mime_type: proofMimeType || null,
      proof_size_bytes: proofSizeBytes,
    };
    if (supabase && authUser) {
      const isExisting = Boolean(lang.id && !lang.id.startsWith("local-"));
      const result = isExisting
        ? await supabase.from("candidate_languages").update(payload).eq("id", lang.id!).eq("profile_id", authUser.id).select("*").single()
        : await supabase.from("candidate_languages").upsert({ profile_id: authUser.id, ...payload }, { onConflict: "profile_id,language" }).select("*").single();
      if (result.error) { notify("Não foi possível salvar o idioma: " + result.error.message); return false; }
      const savedRow = mapDatabaseLanguage(result.data as Record<string, any>);
      const next = [savedRow, ...languages.filter(item => item.id !== savedRow.id && item.language.toLocaleLowerCase("pt-BR") !== savedRow.language.toLocaleLowerCase("pt-BR"))];
      setLanguages(next);
      localStorage.setItem("ec-languages", JSON.stringify(next));
      notify(isExisting ? "Idioma atualizado." : "Idioma adicionado ao perfil.");
      return true;
    }
    const savedLocal: CandidateLanguage = {
      id: lang.id || `local-lang-${Date.now()}`,
      language: cleanLang,
      proficiency: payload.proficiency,
      certification: payload.certification || "",
      proofPath,
      proofFileName,
      proofMimeType,
      proofSizeBytes,
    };
    const next = [savedLocal, ...languages.filter(item => item.id !== savedLocal.id && item.language.toLocaleLowerCase("pt-BR") !== cleanLang.toLocaleLowerCase("pt-BR"))];
    setLanguages(next);
    localStorage.setItem("ec-languages", JSON.stringify(next));
    notify(lang.id ? "Idioma atualizado." : "Idioma adicionado.");
    return true;
  };
  const deleteLanguage = async (id: string) => {
    if (!window.confirm("Remover este idioma do seu perfil?")) return;
    const target = languages.find(item => item.id === id);
    if (supabase && authUser && !id.startsWith("local-")) {
      const { error } = await supabase.from("candidate_languages").delete().eq("id", id).eq("profile_id", authUser.id);
      if (error) { notify("Não foi possível excluir o idioma: " + error.message); return; }
      if (target?.proofPath) await supabase.storage.from("skill-proofs").remove([target.proofPath]);
    }
    const next = languages.filter(item => item.id !== id);
    setLanguages(next);
    localStorage.setItem("ec-languages", JSON.stringify(next));
    notify("Idioma removido.");
  };

  // CRUD estruturado de intercâmbios e vivências no exterior (Supabase ou localStorage).
  const saveInternational = async (item: Omit<CandidateInternationalExperience, "id"> & { id?: string }) => {
    if (!item.country.trim()) { notify("Informe o país da vivência ou intercâmbio."); return false; }
    if (item.startedOn && item.endedOn && !item.isCurrent && item.endedOn < item.startedOn) {
      notify("A data de término não pode ser anterior à data de início.");
      return false;
    }
    const payload = {
      experience_type: item.experienceType,
      country: item.country.trim(),
      city: item.city.trim() || null,
      institution_or_company: item.institutionOrCompany.trim() || null,
      started_on: item.startedOn || null,
      ended_on: item.isCurrent ? null : (item.endedOn || null),
      is_current: item.isCurrent,
      description: item.description.trim() || null,
    };
    if (supabase && authUser) {
      const isExisting = Boolean(item.id && !item.id.startsWith("local-"));
      const result = isExisting
        ? await supabase.from("candidate_international_experiences").update(payload).eq("id", item.id!).eq("profile_id", authUser.id).select("*").single()
        : await supabase.from("candidate_international_experiences").insert({ profile_id: authUser.id, ...payload }).select("*").single();
      if (result.error) { notify("Não foi possível salvar a vivência internacional: " + result.error.message); return false; }
      const savedRow = mapDatabaseInternational(result.data as Record<string, any>);
      const next = isExisting ? internationalExps.map(x => x.id === savedRow.id ? savedRow : x) : [savedRow, ...internationalExps];
      setInternationalExps(next);
      localStorage.setItem("ec-international", JSON.stringify(next));
      notify(isExisting ? "Vivência no exterior atualizada." : "Vivência no exterior adicionada.");
      return true;
    }
    const savedLocal: CandidateInternationalExperience = {
      id: item.id || `local-intl-${Date.now()}`,
      experienceType: payload.experience_type,
      country: payload.country,
      city: payload.city || "",
      institutionOrCompany: payload.institution_or_company || "",
      startedOn: payload.started_on || "",
      endedOn: payload.ended_on || "",
      isCurrent: payload.is_current,
      description: payload.description || "",
    };
    const next = item.id ? internationalExps.map(x => x.id === savedLocal.id ? savedLocal : x) : [savedLocal, ...internationalExps];
    setInternationalExps(next);
    localStorage.setItem("ec-international", JSON.stringify(next));
    notify(item.id ? "Vivência no exterior atualizada." : "Vivência no exterior adicionada.");
    return true;
  };
  const deleteInternational = async (id: string) => {
    if (!window.confirm("Remover esta vivência internacional do perfil?")) return;
    if (supabase && authUser && !id.startsWith("local-")) {
      const { error } = await supabase.from("candidate_international_experiences").delete().eq("id", id).eq("profile_id", authUser.id);
      if (error) { notify("Não foi possível excluir: " + error.message); return; }
    }
    const next = internationalExps.filter(x => x.id !== id);
    setInternationalExps(next);
    localStorage.setItem("ec-international", JSON.stringify(next));
    notify("Vivência internacional removida.");
  };

  // Helpers para mobilidade, CNH, outras habilitações e dados opcionais de PCD/adaptação.
  const toggleProfileChip = (field: "cnhCategories" | "otherLicenses" | "pcdTypes", value: string, label: string) => {
    const current = profile[field];
    const exists = current.some(x => x.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR"));
    const nextList = exists ? current.filter(x => x.toLocaleLowerCase("pt-BR") !== value.toLocaleLowerCase("pt-BR")) : [...current, value];
    const next = { ...profile, [field]: nextList };
    setProfile(next);
    if (!editing) void saveProfile(next, true).then(ok => { if (ok) notify(`${label} atualizado.`); });
  };
  const addCustomOtherLicense = () => {
    const clean = otherLicenseDraft.trim();
    if (!clean) return;
    if (profile.otherLicenses.some(x => x.toLocaleLowerCase("pt-BR") === clean.toLocaleLowerCase("pt-BR"))) {
      setOtherLicenseDraft("");
      return;
    }
    const next = { ...profile, otherLicenses: [...profile.otherLicenses, clean].slice(0, 30) };
    setOtherLicenseDraft("");
    setProfile(next);
    if (!editing) void saveProfile(next, true).then(ok => { if (ok) notify(`Habilitação "${clean}" adicionada.`); });
  };
  const handlePcdProofUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingPcdProof(true);
    const uploaded = await uploadPrivatePdf(file, "pcd", profile.pcdProofPath);
    setUploadingPcdProof(false);
    if (!uploaded) return;
    const next: Profile = {
      ...profile,
      pcdProofPath: uploaded.proofPath,
      pcdProofFileName: uploaded.proofFileName,
      pcdProofMimeType: uploaded.proofMimeType,
      pcdProofSizeBytes: uploaded.proofSizeBytes,
    };
    await saveProfile(next, true);
    notify("Laudo em PDF anexado no armazenamento privado.");
  };
  const removePcdProof = async () => {
    if (profile.pcdProofPath && supabase && authUser) {
      await supabase.storage.from("skill-proofs").remove([profile.pcdProofPath]);
    }
    const next: Profile = { ...profile, pcdProofPath: null, pcdProofFileName: "", pcdProofMimeType: "", pcdProofSizeBytes: null };
    await saveProfile(next, true);
    notify("Laudo removido.");
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
      soft_skills: normalized.softSkills,
      benefits: normalized.benefits || null,
      salary_monthly: normalized.salaryMonthly,
      salary_currency: "BRL",
      employment_type: normalized.contractType || "CLT",
      experience_level: normalized.level,
      workplace_mode: normalized.mode === "Remoto" ? "remote" : normalized.mode === "Híbrido" ? "hybrid" : "onsite",
      work_schedule: normalized.workSchedule || "Comercial",
      work_shift: normalized.workShift || "5x2",
      is_fixed_location: normalized.mode === "Presencial" ? normalized.isFixedLocation : false,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
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
    const appendStatusEvent = (app: Application): ApplicationEventItem[] | undefined => {
      if (!changes.status || changes.status === app.status) return app.events;
      const now = new Date();
      return [...(app.events || []), { status: changes.status, date: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(now), rawDate: now.toISOString() }];
    };
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
        saveApplications(applications.map(app => matchApp(app) ? { ...app, ...changes, feedbackId: nextFeedbackId, events: appendStatusEvent(app) } : app));
        notify(changes.recruiterNote !== undefined ? "Feedback salvo e compartilhado com o candidato." : "Etapa da candidatura atualizada.");
      })();
    } else {
      saveApplications(applications.map(app => matchApp(app) ? { ...app, ...changes, events: appendStatusEvent(app) } : app));
      notify(changes.recruiterNote !== undefined ? "Feedback salvo." : "Etapa da candidatura atualizada.");
    }
  };
  // Gera uma cópia portátil dos dados da conta; nenhum arquivo é enviado a serviços externos.
  const exportData = () => { const data = { exportedAt: new Date().toISOString(), profile, hardSkillDetails, experiences, educations, languages, internationalExperiences: internationalExps, applications, savedJobs: saved, companyJobs: posted, assessments: assessmentResults, privacyConsent, consentHistory }; const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "emprego-certo-meus-dados.json"; link.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000); notify("Cópia dos seus dados baixada."); };
  // Limpa somente chaves pertencentes ao protótipo no navegador atual e pede
  // confirmação porque a operação remove candidaturas, vagas e perfil locais.
  const deleteLocalData = () => { if (!window.confirm("Apagar os dados do Emprego Certo salvos neste navegador? Esta ação não pode ser desfeita.")) return; ["ec-profile","ec-hard-skills","ec-experiences","ec-educations","ec-languages","ec-international","ec-applications","ec-saved","ec-posted","ec-privacy-consent","ec-employer","ec-assessments","ec-demo-entered","ec-data-cleanup-version","ec-seen-notifications"].forEach(k=>localStorage.removeItem(k)); window.location.reload(); };
  // Notificações reais derivadas de mudanças de etapa e feedbacks aprovados das candidaturas.
  const notifications = useMemo(() => {
    const items: { id: string; title: string; detail: string; target: "applications" | "evolution"; appKey?: string | number }[] = [];
    for (const app of applications) {
      const job = byId(app.jobId);
      const appKey = app.id ?? app.jobId;
      const roleTitle = job?.role || "Candidatura";
      const companyTitle = job?.company ? ` · ${job.company}` : "";
      if (app.status !== "Inscrição enviada") {
        items.push({ id: `status-${appKey}-${app.status}`, title: `Etapa atualizada: ${app.status}`, detail: `${roleTitle}${companyTitle}`, target: "applications", appKey });
      }
      if (app.recruiterNote?.trim()) {
        items.push({ id: `fb-${appKey}`, title: "Feedback recebido da empresa", detail: `${roleTitle}${companyTitle}`, target: "evolution", appKey });
      }
    }
    return items;
  }, [applications, posted]);
  const hasUnreadNotifications = notifications.length > seenNotifications;
  const filteredFaq = useMemo(() => {
    const q = faqQuery.trim().toLocaleLowerCase("pt-BR");
    return candidateFaqItems.filter(item =>
      (faqCategory === "Todas" || item.category === faqCategory)
      && (!q || `${item.question} ${item.answer} ${item.category}`.toLocaleLowerCase("pt-BR").includes(q))
    );
  }, [faqQuery, faqCategory]);
  const toggleFaqItem = (id: string) => {
    setOpenFaqIds(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };
  // Indicador de completude transparente (campos opcionais sensíveis como família e PCD não penalizam o percentual).
  const filledProfileBlocks = [
    profile.name,
    profile.role,
    profile.city,
    profile.salaryMonthly,
    profile.bio,
    profile.skills.length ? "skills" : "",
    (educations.length || profile.education) ? "edu" : "",
    (experiences.length || profile.experience) ? "exp" : "",
    languages.length ? "lang" : "",
    (profile.travelAvailability || profile.cnhCategories.length || profile.otherLicenses.length) ? "mobility" : "",
  ].filter(Boolean).length;
  const profileCompletion = Math.round((filledProfileBlocks / 10) * 100);
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
      setExperiences([]);
      localStorage.setItem("ec-experiences", JSON.stringify([]));
      setEducations([]);
      localStorage.setItem("ec-educations", JSON.stringify([]));
      void saveProfile(nextProfile, true);
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
        {!companyMode && <><div className="side-caption side-caption-spaced">SUA CONTA</div><nav className="side-nav"><button className={`nav-item ${active === "profile" ? "nav-active" : ""}`} onClick={() => { setActive("profile"); setMobileMenu(false); }}><UserRound size={18} /><span>Meu perfil</span><span className="profile-dot" /></button><button className={`nav-item ${active === "faq" ? "nav-active" : ""}`} onClick={() => { setActive("faq"); setMobileMenu(false); }}><CircleHelp size={18} /><span>Ajuda e FAQ</span></button></nav></>}
        <div className="sidebar-bottom"><div className="pro-card"><div className="pro-icon"><Sparkles size={17} /></div><b>{companyMode ? "Configure sua empresa" : "Seu próximo passo começa aqui"}</b><p>{companyMode ? "Mantenha os dados institucionais atualizados nas suas vagas." : "Complete seu perfil e tenha mais chances de ser encontrado."}</p><button onClick={() => setActive(companyMode ? "companyProfile" : "profile")}>{companyMode ? "Perfil da empresa" : "Completar perfil"} <ArrowRight size={14} /></button></div>{!companyMode&&<button className="nav-item settings-item" onClick={() => setActive("settings")}><Settings size={18} /><span>Configurações</span></button>}<button className="nav-item settings-item" onClick={handleLogout}><LogOut size={18}/><span>{authUser ? "Sair da conta" : "Sair da demonstração"}</span></button><div className="sidebar-foot"><ShieldCheck size={14} /> {authUser ? "Conectado ao Supabase local" : "Dados salvos neste navegador"}</div></div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu-button icon-button" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu size={19} /></button><div className="breadcrumb">Workspace <ChevronRight size={14} /> <b>{companyMode ? "Empresa" : "Candidato"}</b></div><div className="top-actions"><button className="top-help" onClick={() => companyMode ? setShowHelp(true) : setActive("faq")}><CircleHelp size={17} /> {companyMode ? "Ajuda" : "FAQ e Ajuda"}</button><div className="notification-wrap"><button className="notification-button icon-button" aria-label="Notificações" onClick={() => { const next = !showNotifications; setShowNotifications(next); if (next) { setSeenNotifications(notifications.length); localStorage.setItem("ec-seen-notifications", JSON.stringify(notifications.length)); } }}><Bell size={19} />{hasUnreadNotifications && <i />}</button>{showNotifications && <div className="notification-popover panel" role="dialog" aria-label="Notificações"><div className="notification-popover-head"><b>Notificações</b><button type="button" className="icon-button" aria-label="Fechar notificações" onClick={() => setShowNotifications(false)}><X size={15}/></button></div>{notifications.length ? <div className="notification-list">{notifications.map(item => <button type="button" className="notification-item" key={item.id} onClick={() => { setShowNotifications(false); if (item.appKey !== undefined) setExpandedAppKey(item.appKey); setActive(item.target); }}><b>{item.title}</b><small>{item.detail}</small></button>)}</div> : <p className="notification-empty">Nenhuma atualização recente nas suas candidaturas.</p>}</div>}</div><div className="top-divider" /><button className="top-user" onClick={() => setActive(companyMode ? "companyProfile" : "profile")}><span className="avatar avatar-small">{(companyMode ? employer.name || "EM" : profile.name || "PE").slice(0,2).toUpperCase()}</span><ChevronDown size={14} /></button></div></header>
        <div className="content">
          {accountRole === "admin" && active === "admin" && supabase && <AdminPanel client={supabase}/>}
          {/* Painel do candidato: resume candidaturas, perfil e vagas compatíveis por match automático. */} {active === "home" && !companyMode && <>
            <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> {todayLabel || "DATA ATUAL"}</div><h1>{authUser?`Olá${profile.name ? `, ${profile.name}` : ""}.`:`Perfil demonstrativo${profile.name ? ` de ${profile.name}` : ""}.`}</h1><p className="page-subtitle">{allJobs.length} {allJobs.length === 1 ? "vaga compatível" : "vagas compatíveis"} com seu perfil (de {publishedCatalogJobs.length} publicadas).</p></div><button className="outline-button" onClick={() => setActive("profile")}><UserRound size={16} /> Ajustar perfil</button></div>
            <div className="hero-card"><div className="hero-content"><div className="hero-pill"><Sparkles size={13} /> MATCH AUTOMÁTICO</div><h2>Apenas vagas compatíveis<br />com o seu perfil.</h2><p>O cruzamento automático considera pretensão salarial, localização, modalidade e competências informadas por você e pelas empresas.</p><button className="hero-button" onClick={() => setActive("jobs")}>Ver vagas compatíveis <ArrowRight size={16} /></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-circle"><Target size={48} strokeWidth={1.25}/></div><div className="floating-card floating-match"><span className="mini-check"><Check size={12}/></span><span><b>{allJobs.length} {allJobs.length === 1 ? "match" : "matches"}</b><small>compatíveis com você</small></span></div><div className="floating-card floating-check"><span className="mini-brief"><BriefcaseBusiness size={15}/></span><span><b>{activeProfileCriteria.length} critério(s)</b><small>ativos do seu perfil</small></span></div><span className="sparkle sparkle-a">✳</span><span className="sparkle sparkle-b">✳</span></div></div>
            <div className="stats-grid"><div className="stat-card"><span className="stat-icon stat-violet"><BriefcaseBusiness size={18}/></span><span className="stat-change">de {publishedCatalogJobs.length} publicadas</span><b>{allJobs.length}</b><small>vagas compatíveis com o perfil</small></div><div className="stat-card"><span className="stat-icon stat-blue"><FileText size={18}/></span><span className="stat-change">{authUser?"conta autenticada":"registro local"}</span><b>{applications.length.toString().padStart(2,"0")}</b><small>candidaturas na conta</small></div><div className="stat-card"><span className="stat-icon stat-green"><TrendingUp size={18}/></span><span className="stat-change">{filledProfileBlocks} de 10 blocos</span><b>{profileCompletion}<span className="stat-unit">%</span></b><small>completude do perfil</small><div className="progress-track"><span style={{width:profileCompletion+"%"}}/></div></div><div className="stat-card"><span className="stat-icon stat-amber"><BookmarkCheck size={18}/></span><span className="stat-change">{authUser?"conta autenticada":"registro local"}</span><b>{savedJobs.length.toString().padStart(2,"0")}</b><small>vagas salvas ativas</small></div></div>
            <section className="section-block"><div className="section-heading"><div><div className="section-kicker"><Sparkles size={13}/> MATCH AUTOMÁTICO</div><h2>Vagas compatíveis com você</h2><p>Exibimos somente oportunidades alinhadas aos critérios cadastrados no seu perfil.</p></div><button className="text-link" onClick={() => setActive("jobs")}>Ver todas compatíveis <ArrowRight size={15}/></button></div>{visibleJobs.length ? <div className="job-grid">{visibleJobs.slice(0,3).map(job => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} applied={applications.some(a => a.jobId === job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => { setModalConsentAccepted(false); setSelected(job); }} />)}</div> : <EmptyState title={!hasMatchCriteria ? "Complete seu perfil para ativar o match" : "Nenhuma vaga compatível no momento"} text={!hasMatchCriteria ? "Informe sua pretensão salarial, cidade, modalidades preferidas ou competências para receber apenas vagas compatíveis." : `Das ${publishedCatalogJobs.length} vaga(s) publicada(s), nenhuma atende simultaneamente aos critérios atuais do seu perfil.`} action="Ajustar critérios no perfil" onAction={() => setActive("profile")}/>}</section>
            <div className="bottom-grid"><section className="panel recent-panel"><div className="panel-heading"><div><h3>Candidaturas da conta</h3><p>Etapa atual registrada para cada candidatura.</p></div><button className="small-link" onClick={() => setActive("applications")}>Consultar lista <ArrowRight size={14}/></button></div><div className="application-list">{applications.slice(0,3).map(app => { const job = byId(app.jobId); const appKey = app.id ?? app.jobId; if (!job) return null; return <button type="button" className="application-row application-row-button" key={appKey} onClick={() => { setExpandedAppKey(appKey); setActive("applications"); }}><CompanyLogo job={job}/><div className="application-info"><b>{job.role}</b><small>{job.company} · {app.date}</small></div><Status status={app.status}/><ChevronRight size={15} className="row-chevron"/></button>; })}</div>{applications.length===0&&<p className="local-note">Nenhuma candidatura foi registrada.</p>}</section><section className="panel transparency-panel"><div className="transparency-top"><span className="transparency-icon"><ShieldCheck size={18}/></span><span className="transparency-label">{authUser ? "TRANSPARÊNCIA SALARIAL" : "DADOS DO PROTÓTIPO"}</span></div><h3>Valores fixos<br/>e identificados.</h3><p>Todas as vagas exigem salário bruto mensal único em reais e são filtradas apenas pelos critérios do seu perfil.</p><button type="button" className="transparency-metric transparency-metric-button" onClick={() => setActive("jobs")}><b>{allJobs.length}</b><span>vagas compatíveis<br/>de {publishedCatalogJobs.length} publicadas</span><ArrowUpRight size={16}/></button></section></div>
          </>}

          {/* Busca refinada sobre as vagas que deram match automático com o perfil do candidato. */} {active === "jobs" && <>
            <div className="page-heading"><div><div className="eyebrow">MATCH AUTOMÁTICO COM SEU PERFIL</div><h1>Vagas compatíveis</h1><p className="page-subtitle">Apenas oportunidades alinhadas ao que você e as empresas informaram.</p></div><div className="page-heading-actions"><button className="outline-button" onClick={() => setActive("profile")}><UserRound size={15}/> Ajustar critérios</button><button className="outline-button" onClick={() => { setActive("saved"); }}><Heart size={16}/> Salvas ({savedJobs.length})</button></div></div>
            <div className="panel match-criteria-bar">
              <div className="match-criteria-head">
                <span className="match-criteria-title"><Sparkles size={14}/> Critérios do match automático ativos ({allJobs.length} de {publishedCatalogJobs.length} publicadas)</span>
                <button type="button" className="small-link" onClick={() => setActive("profile")}>Alterar no perfil <ArrowRight size={13}/></button>
              </div>
              {activeProfileCriteria.length > 0 && (
                <div className="match-criteria-chips">
                  {activeProfileCriteria.map(label => <span className="match-criteria-chip" key={label}>{label}</span>)}
                </div>
              )}
              {missingMatchCriteria.length > 0 && (
                <p className="match-missing-note">Critérios obrigatórios pendentes no perfil para ativar o match 100%: <b>{missingMatchCriteria.join(", ")}</b>.</p>
              )}
            </div>
            <div className="job-search">
              <Search size={18}/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Refinar entre as vagas compatíveis (cargo, empresa ou competência)" aria-label="Refinar vagas compatíveis"/>
              <span className="search-divider"/>
              <MapPin size={17}/>
              <input className="location-search" value={locationQuery} onChange={e => setLocationQuery(e.target.value)} placeholder="Cidade ou UF" aria-label="Filtrar por localização"/>
              <button className={`filter-button ${showFilters || activeFilterCount > 0 ? "filter-on" : ""}`} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={16}/> Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</button>
            </div>
            {showFilters && (
              <div className="filters-panel panel">
                <div className="filter-row">
                  <span>Modalidade:</span>
                  {["Todas","Remoto","Híbrido","Presencial"].map(x => <button key={x} className={`filter-chip ${mode === x ? "filter-chip-active" : ""}`} onClick={() => setMode(x)}>{x}</button>)}
                </div>
                <div className="filter-row">
                  <span>Nível:</span>
                  {["Todos","Estágio","Júnior","Pleno","Sênior","Liderança"].map(x => <button key={x} className={`filter-chip ${levelFilter === x ? "filter-chip-active" : ""}`} onClick={() => setLevelFilter(x)}>{x}</button>)}
                </div>
                <div className="filter-row filter-row-extra">
                  <label className="salary-filter-field"><span>Salário mínimo mensal (R$):</span><input type="number" min="0" step="500" value={minSalaryFilter} onChange={e => setMinSalaryFilter(e.target.value)} placeholder="Ex.: 4000"/></label>
                  <span className="filter-hint"><CheckCircle2 size={14}/> Salário bruto mensal informado em todas as vagas</span>
                  {(activeFilterCount > 0 || query.trim()) && <button type="button" className="small-link" onClick={clearJobFilters}>Limpar filtros</button>}
                </div>
              </div>
            )}
            <div className="results-meta">
              <span><b>{visibleJobs.length} {visibleJobs.length === 1 ? "vaga compatível" : "vagas compatíveis"}</b> exibida(s)</span>
              <label className="sort-control"><Filter size={14}/><span>Ordenar:</span><select value={sortBy} onChange={e => setSortBy(e.target.value as "match" | "salary" | "recent")} aria-label="Ordenar vagas"><option value="match">Mais competências coincidentes</option><option value="salary">Maior salário mensal</option><option value="recent">Mais recentes</option></select></label>
            </div>
            <div className="all-jobs-list">
              {visibleJobs.map(job => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} applied={applications.some(a => a.jobId === job.id)} onSave={() => toggleSaved(job.id)} onOpen={() => { setModalConsentAccepted(false); setSelected(job); }} horizontal />)}
              {visibleJobs.length === 0 && (
                <EmptyState
                  title={!hasMatchCriteria ? "Preencha seu perfil para ativar o match" : allJobs.length === 0 ? "Nenhuma vaga compatível com o perfil atual" : "Nenhuma vaga compatível neste filtro"}
                  text={!hasMatchCriteria ? "Informe pretensão salarial, cidade, modalidades preferidas ou competências em Meu perfil para receber apenas vagas compatíveis." : allJobs.length === 0 ? `Nenhuma das ${publishedCatalogJobs.length} vaga(s) publicada(s) atende simultaneamente aos critérios informados no seu perfil.` : "Limpe os filtros adicionais desta tela para ver todas as vagas compatíveis."}
                  action={activeFilterCount > 0 || query.trim() ? "Limpar filtros" : "Ajustar Meu perfil"}
                  onAction={activeFilterCount > 0 || query.trim() ? clearJobFilters : () => setActive("profile")}
                />
              )}
            </div>
          </>}

          {/* Histórico individual: etapas reais, linha do tempo do banco, feedback e retirada. */} {active === "applications" && <>
            <div className="page-heading"><div><div className="eyebrow">ACOMPANHE SEUS PROCESSOS</div><h1>Minhas candidaturas</h1><p className="page-subtitle">Acompanhe cada etapa real registrada e os retornos enviados pelas empresas.</p></div><button className="primary-button" onClick={() => setActive("jobs")}><Search size={16}/> Encontrar vagas</button></div>
            <div className="application-summary">
              <div><b>{applications.length}</b><span>candidaturas enviadas</span></div>
              <div><b>{applications.filter(x=>!closedAppStatuses.includes(x.status)).length}</b><span>em andamento</span></div>
              <div><b>{applications.filter(x=>["Entrevista","Oferta","Contratado"].includes(x.status)).length}</b><span>entrevistas / ofertas</span></div>
            </div>
            {applications.length > 0 && (
              <div className="filter-row" style={{marginBottom:12}}>
                <span>Filtrar:</span>
                {([["all","Todas"],["active","Em andamento"],["closed","Finalizadas"]] as const).map(([key,label]) => (
                  <button key={key} className={`filter-chip ${appFilter === key ? "filter-chip-active" : ""}`} onClick={() => setAppFilter(key)}>{label}</button>
                ))}
              </div>
            )}
            <div className="applications-board">
              {filteredApplications.map(app => {
                const job = byId(app.jobId);
                const appKey = app.id ?? app.jobId;
                const isExpanded = expandedAppKey === appKey;
                if (!job) return null;
                return (
                  <div className="application-detail-card" key={appKey}>
                    <div className="app-card-top">
                      <CompanyLogo job={job}/>
                      <span className="app-date">Inscrição em {app.date}</span>
                      <button className="icon-button app-more" aria-label={isExpanded ? "Ocultar histórico" : "Ver histórico"} title={isExpanded ? "Ocultar histórico" : "Ver histórico"} onClick={() => setExpandedAppKey(isExpanded ? null : appKey)}><ChevronDown size={17} style={{transform: isExpanded ? "rotate(180deg)" : undefined, transition: "transform .16s"}}/></button>
                    </div>
                    <h3>{job.role}</h3>
                    <p>{job.company} · {job.location} · {job.mode}{job.status && job.status !== "Ativa" ? ` · Vaga ${job.status.toLowerCase()}` : ""}</p>
                    <div className="app-salary">{formatMonthlySalary(job.salaryMonthly)} <span>· salário divulgado</span></div>
                    <ApplicationTimeline status={app.status} />
                    {isExpanded && (
                      <div className="app-events-log">
                        <b>Histórico de etapas</b>
                        {app.events && app.events.length > 0 ? app.events.map((ev, i) => (
                          <div className="app-event-row" key={`${ev.status}-${i}`}><span>{ev.status}</span><small>{ev.date}</small></div>
                        )) : <div className="app-event-row"><span>{app.status}</span><small>{app.date}</small></div>}
                      </div>
                    )}
                    {app.recruiterNote && <div className="candidate-feedback"><b>Feedback da empresa</b><p>{app.recruiterNote}</p></div>}
                    <div className="app-card-bottom">
                      <Status status={app.status}/>
                      <button className="small-link" onClick={() => setExpandedAppKey(isExpanded ? null : appKey)}>{isExpanded ? "Ocultar histórico" : "Histórico"}</button>
                      {!closedAppStatuses.includes(app.status) && <button className="small-link danger-link" onClick={()=>{if(window.confirm("Retirar sua candidatura desta vaga?"))changeApplication(appKey,{status:"Desistiu"})}}>Retirar</button>}
                      <button className="small-link" onClick={()=>{setModalConsentAccepted(false);setSelected(job);}}>Ver vaga <ArrowRight size={14}/></button>
                    </div>
                  </div>
                );
              })}
              {filteredApplications.length === 0 && <EmptyState title={applications.length === 0 ? "Sua próxima oportunidade começa aqui" : "Nenhuma candidatura neste filtro"} text={applications.length === 0 ? "Explore vagas com salário transparente e candidate-se em poucos passos." : "Altere o filtro acima para visualizar suas outras candidaturas."} action={applications.length === 0 ? "Explorar vagas" : "Ver todas"} onAction={() => applications.length === 0 ? setActive("jobs") : setAppFilter("all")}/>}
            </div>
          </>}

          {/* Perfil editável: campos básicos, competências por chips, experiências e formação estruturadas. */} {active === "profile" && !companyMode && <>
            <div className="page-heading">
              <div><div className="eyebrow">SEU ESPAÇO PROFISSIONAL</div><h1>Meu perfil</h1><p className="page-subtitle">Mostre o melhor de você. Um perfil completo aumenta sua visibilidade.</p></div>
              <div className="page-heading-actions">
                {editing && <button className="outline-button" onClick={() => { if (profileBackup) setProfile(profileBackup); setProfileBackup(null); setEditing(false); notify("Alterações descartadas."); }}><X size={16} /> Cancelar</button>}
                <button className="primary-button" onClick={async () => {
                  if (editing) {
                    const ok = await saveProfile(profile);
                    if (ok) { setProfileBackup(null); setEditing(false); }
                  } else {
                    setProfileBackup({ ...profile, skills: [...profile.skills], workplacePreferences: [...profile.workplacePreferences] });
                    setEditing(true);
                    notify("Modo de edição ativado.");
                  }
                }}>{editing ? <><Check size={16} /> Salvar alterações</> : <><FileText size={16} /> Editar perfil</>}</button>
                <button className="outline-button" onClick={handleLogout}><LogOut size={16} /> Sair da conta</button>
              </div>
            </div>
            <div className="profile-layout">
              <div className="panel profile-main">
                <div className="profile-cover">
                  <div className="profile-avatar">{profile.name.slice(0,2).toLocaleUpperCase("pt-BR")||"?"}</div>
                  <div className="profile-completion"><span>PERFIL COMPLETO</span><b>{profileCompletion}%</b><div className="progress-track"><span style={{width:profileCompletion+"%"}}/></div></div>
                </div>
                <div className="profile-details">
                  <div className="profile-name-row">
                    <div>{editing ? (
                      <div className="profile-edit-fields">
                        <label>Nome completo<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Seu nome"/></label>
                        <label>Cargo ou objetivo<input value={profile.role} onChange={e=>setProfile({...profile,role:e.target.value})} placeholder="Ex.: Analista de Dados"/></label>
                        <div className="profile-edit-row">
                          <label>Cidade<input value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})} placeholder="Ex.: São Paulo"/></label>
                          <label>UF<input value={profile.state} maxLength={2} onChange={e=>setProfile({...profile,state:e.target.value.toLocaleUpperCase("pt-BR")})} placeholder="SP"/></label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2>{profile.name || "Seu nome"}</h2>
                        <p>{profile.role || "Cargo não informado"} · {[profile.city, profile.state].filter(Boolean).join(", ") || "Cidade não informada"}</p>
                      </>
                    )}</div>
                    <span className={`open-work ${profile.visible ? "" : "open-work-off"}`}><i />{profile.visible ? "Visibilidade ativada" : "Visibilidade desativada"}</span>
                  </div>
                  <div className="detail-divider"/>
                  <div className="profile-section-title"><h3>Sobre mim</h3>{editing&&<span className="editing-label">Editando</span>}</div>
                  {editing
                    ? <textarea className="profile-textarea" value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})} rows={4} placeholder="Resuma sua trajetória, principais resultados e objetivos profissionais." aria-label="Sobre mim"/>
                    : <p className="profile-bio">{profile.bio || "Ainda não há resumo profissional. Clique em Editar perfil para contar sobre sua trajetória."}</p>}
                  <div className="profile-section-title"><h3>Hard skills <span className="section-count">({profile.skills.length}/50)</span></h3></div>
                  <HardSkillsNestedPicker selectedSkills={profile.skills} onToggleSkill={toggleHardSkillTag} onAddMultiple={addManyHardSkillTags} />
                  <div className="skill-add-row" style={{marginTop:10}}>
                    <input value={skillDraft} onChange={e=>setSkillDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addSkillTag();}}} placeholder="Ou digite outra hard skill personalizada e pressione Enter" aria-label="Nova hard skill personalizada" />
                    <button type="button" className="outline-button" onClick={addSkillTag}><Plus size={14}/> Adicionar com comprovante</button>
                  </div>
                  {profile.skills.length ? (
                    <div className="hard-skill-cards">
                      {profile.skills.map(skill => {
                        const detail = hardSkillDetails.find(d => d.skillName.toLocaleLowerCase("pt-BR") === skill.toLocaleLowerCase("pt-BR"));
                        return (
                          <div className="hard-skill-card" key={skill}>
                            <div className="hard-skill-card-main">
                              <div className="hard-skill-card-title">
                                <b>{skill}</b>
                                {detail ? (
                                  <>
                                    <span className="hs-level-badge">{hardSkillLevelLabel[detail.proficiency]}</span>
                                    <span className="hs-exp-badge">{formatExperienceDuration(detail.experienceMonths)}</span>
                                  </>
                                ) : (
                                  <span className="hs-pending-badge">Pendente de nível e comprovante</span>
                                )}
                              </div>
                              {detail ? (
                                <small className="hard-skill-proof-meta">
                                  <FileText size={12}/> {detail.proofInstitution || "Instituição não informada"} · {detail.proofFileName || "Sem arquivo"}
                                </small>
                              ) : (
                                <small className="hard-skill-proof-meta">Clique em Completar para informar nível (Júnior/Pleno/Sênior), tempo de experiência e certificado.</small>
                              )}
                            </div>
                            <div className="hard-skill-card-actions">
                              {detail?.proofFileName && <button type="button" className="small-link" onClick={() => void openProofDocument(detail.proofPath, detail.proofFileName)}>Ver documento</button>}
                              <button type="button" className="small-link" onClick={() => openHardSkillModal(skill)}>{detail ? "Editar" : "Completar"}</button>
                              <button type="button" className="small-link danger-link" onClick={() => void removeSkillTag(skill)}>Remover</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="local-note">Nenhuma hard skill cadastrada. Selecione uma hard skill acima no menu por área para informar nível, tempo de experiência e enviar o comprovante.</span>
                  )}
                  <div className="profile-section-title" style={{marginTop:14}}>
                    <h3>Soft skills <span className="section-count">({profile.softSkills.length}/50)</span></h3>
                    <button type="button" className="tiny-add" onClick={()=>setShowSoftSkillsTable(!showSoftSkillsTable)}><Check size={14}/> {showSoftSkillsTable ? "Ocultar tabela" : "Selecionar na tabela"}</button>
                  </div>
                  {showSoftSkillsTable && (
                    <SoftSkillsTablePicker
                      selectedSkills={profile.softSkills}
                      onToggleSkill={toggleSoftSkillTag}
                      onSetMany={setManySoftSkillTags}
                    />
                  )}
                  <div className="skill-add-row">
                    <input value={softSkillDraft} onChange={e=>setSoftSkillDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addSoftSkillTag();}}} placeholder="Ou digite outra soft skill personalizada e pressione Enter" aria-label="Nova soft skill personalizada" />
                    <button type="button" className="outline-button" onClick={()=>setShowSoftSkillsTable(!showSoftSkillsTable)}><Check size={14}/> {showSoftSkillsTable ? "Fechar tabela" : "Tabela de soft skills"}</button>
                    <button type="button" className="outline-button" onClick={addSoftSkillTag}><Plus size={14}/> Adicionar</button>
                  </div>
                  <div className="skill-tags">{profile.softSkills.length ? profile.softSkills.map(s=><span key={s} className="skill-tag skill-tag-soft skill-tag-removable">{s}<button type="button" aria-label={`Remover ${s}`} onClick={()=>removeSoftSkillTag(s)}><X size={11}/></button></span>) : <span className="local-note">Nenhuma soft skill cadastrada. Abra a tabela acima para marcar suas soft skills como etiquetas.</span>}</div>
                  <div className="detail-divider"/>
                  <div className="profile-section-title"><h3>Experiência profissional</h3><button className="tiny-add" onClick={()=>{setEditingExp(null);setShowExpForm(!showExpForm);}}><Plus size={14}/> {showExpForm && !editingExp ? "Fechar" : "Adicionar"}</button></div>
                  {showExpForm && <ExperienceForm initial={editingExp} onCancel={()=>{setShowExpForm(false);setEditingExp(null);}} onSave={async exp => { const ok = await saveExperience(exp); if (ok) { setShowExpForm(false); setEditingExp(null); } }} />}
                  {experiences.length ? <div className="structured-list">{experiences.map(exp => (
                    <div className="experience-item structured-item" key={exp.id}>
                      <span className="experience-mark">{exp.companyName.slice(0,2).toLocaleUpperCase("pt-BR") || "EX"}</span>
                      <div className="structured-item-body">
                        <b>{exp.jobTitle}</b>
                        <p>{exp.companyName}{exp.employmentType ? ` · ${exp.employmentType}` : ""}{exp.city ? ` · ${exp.city}` : ""}</p>
                        <small>{formatPeriod(exp.startedOn, exp.endedOn, exp.isCurrent, "Atual")}</small>
                        {exp.description && <p className="structured-desc">{exp.description}</p>}
                      </div>
                      <div className="structured-item-actions">
                        <button className="small-link" onClick={()=>{setEditingExp(exp);setShowExpForm(true);}}>Editar</button>
                        <button className="small-link danger-link" onClick={()=>void deleteExperience(exp.id)}>Excluir</button>
                      </div>
                    </div>
                  ))}</div> : <p className="profile-bio">{profile.experience || "Nenhuma experiência profissional cadastrada."}</p>}
                  <div className="detail-divider"/>
                  <div className="profile-section-title">
                    <h3>Graduações, cursos e certificações especiais <span className="section-count">({educations.length})</span></h3>
                    <button type="button" className="tiny-add" onClick={()=>{setEditingEdu(null);setShowEduForm(!showEduForm);}}><Plus size={14}/> {showEduForm && !editingEdu ? "Fechar" : "Adicionar"}</button>
                  </div>
                  <div className="edu-filter-row">
                    <button type="button" className={`filter-chip ${eduCategoryFilter === "todas" ? "filter-chip-active" : ""}`} onClick={()=>setEduCategoryFilter("todas")}>Todos ({educations.length})</button>
                    {educationCategories.map(cat => {
                      const count = educations.filter(e => e.category === cat.value).length;
                      return (
                        <button key={cat.value} type="button" className={`filter-chip ${eduCategoryFilter === cat.value ? "filter-chip-active" : ""}`} onClick={()=>setEduCategoryFilter(cat.value)}>
                          {cat.short}{count > 0 ? ` (${count})` : ""}
                        </button>
                      );
                    })}
                  </div>
                  {showEduForm && <EducationForm initial={editingEdu} onCancel={()=>{setShowEduForm(false);setEditingEdu(null);}} onSave={async edu => { const ok = await saveEducation(edu); if (ok) { setShowEduForm(false); setEditingEdu(null); } }} />}
                  {educations.filter(edu => eduCategoryFilter === "todas" || edu.category === eduCategoryFilter).length ? (
                    <div className="structured-list">
                      {educations.filter(edu => eduCategoryFilter === "todas" || edu.category === eduCategoryFilter).map(edu => (
                        <div className="experience-item structured-item" key={edu.id}>
                          <span className="experience-mark experience-light"><GraduationCap size={15}/></span>
                          <div className="structured-item-body">
                            <div className="structured-title-row">
                              <b>{[edu.degree, edu.fieldOfStudy].filter(Boolean).join(" — ") || edu.institution}</b>
                              <span className="profile-cat-badge">{educationCategoryLabel[edu.category]}</span>
                              {edu.workloadHours ? <span className="hs-exp-badge">{edu.workloadHours}h</span> : null}
                            </div>
                            <p>{edu.institution}{edu.credentialCode ? ` · Credencial: ${edu.credentialCode}` : ""}</p>
                            <small>
                              {formatPeriod(edu.startedOn, edu.endedOn, edu.isCurrent, "Em andamento")}
                              {edu.expiresOn ? ` · Validade: ${new Intl.DateTimeFormat("pt-BR").format(new Date(edu.expiresOn + "T12:00:00"))}` : ""}
                            </small>
                            {edu.description && <p className="structured-desc">{edu.description}</p>}
                            {edu.proofFileName && <small className="hard-skill-proof-meta"><FileText size={12}/> Comprovante PDF: {edu.proofFileName}</small>}
                          </div>
                          <div className="structured-item-actions">
                            {edu.proofFileName && <button type="button" className="small-link" onClick={()=>void openProofDocument(edu.proofPath, edu.proofFileName)}>Ver PDF</button>}
                            <button type="button" className="small-link" onClick={()=>{setEditingEdu(edu);setShowEduForm(true);}}>Editar</button>
                            <button type="button" className="small-link danger-link" onClick={()=>void deleteEducation(edu.id)}>Excluir</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-bio">{educations.length ? "Nenhum item cadastrado nesta categoria." : (profile.education || "Nenhuma graduação, curso ou certificação especial cadastrada.")}</p>
                  )}

                  <div className="detail-divider"/>
                  <div className="profile-section-title">
                    <h3>Idiomas <span className="section-count">({languages.length})</span></h3>
                    <button type="button" className="tiny-add" onClick={()=>{setEditingLang(null);setShowLangForm(!showLangForm);}}><Plus size={14}/> {showLangForm && !editingLang ? "Fechar" : "Adicionar"}</button>
                  </div>
                  {showLangForm && <LanguageForm initial={editingLang} onCancel={()=>{setShowLangForm(false);setEditingLang(null);}} onSave={async lang => { const ok = await saveLanguage(lang); if (ok) { setShowLangForm(false); setEditingLang(null); } }} />}
                  {languages.length ? (
                    <div className="structured-list">
                      {languages.map(lang => (
                        <div className="experience-item structured-item" key={lang.id}>
                          <span className="experience-mark">{lang.language.slice(0,2).toLocaleUpperCase("pt-BR")}</span>
                          <div className="structured-item-body">
                            <div className="structured-title-row">
                              <b>{lang.language}</b>
                              <span className="hs-level-badge">{languageProficiencyLabel[lang.proficiency]}</span>
                            </div>
                            {lang.certification && <p>Certificação / Exame: {lang.certification}</p>}
                            {lang.proofFileName && <small className="hard-skill-proof-meta"><FileText size={12}/> Comprovante PDF: {lang.proofFileName}</small>}
                          </div>
                          <div className="structured-item-actions">
                            {lang.proofFileName && <button type="button" className="small-link" onClick={()=>void openProofDocument(lang.proofPath, lang.proofFileName)}>Ver PDF</button>}
                            <button type="button" className="small-link" onClick={()=>{setEditingLang(lang);setShowLangForm(true);}}>Editar</button>
                            <button type="button" className="small-link danger-link" onClick={()=>void deleteLanguage(lang.id)}>Excluir</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-bio">Nenhum idioma cadastrado. Adicione idiomas e níveis (incluindo Libras e certificações em PDF).</p>
                  )}

                  <div className="detail-divider"/>
                  <div className="profile-section-title">
                    <h3>Intercâmbios e vivências no exterior <span className="section-count">({internationalExps.length})</span></h3>
                    <button type="button" className="tiny-add" onClick={()=>{setEditingIntl(null);setShowIntlForm(!showIntlForm);}}><Plus size={14}/> {showIntlForm && !editingIntl ? "Fechar" : "Adicionar"}</button>
                  </div>
                  {showIntlForm && <InternationalForm initial={editingIntl} onCancel={()=>{setShowIntlForm(false);setEditingIntl(null);}} onSave={async item => { const ok = await saveInternational(item); if (ok) { setShowIntlForm(false); setEditingIntl(null); } }} />}
                  {internationalExps.length ? (
                    <div className="structured-list">
                      {internationalExps.map(item => (
                        <div className="experience-item structured-item" key={item.id}>
                          <span className="experience-mark experience-light"><MapPin size={15}/></span>
                          <div className="structured-item-body">
                            <div className="structured-title-row">
                              <b>{[item.city, item.country].filter(Boolean).join(", ")}</b>
                              <span className="profile-cat-badge">{internationalExperienceTypeLabel[item.experienceType]}</span>
                            </div>
                            {item.institutionOrCompany && <p>{item.institutionOrCompany}</p>}
                            <small>{formatPeriod(item.startedOn, item.endedOn, item.isCurrent, "Em andamento")}</small>
                            {item.description && <p className="structured-desc">{item.description}</p>}
                          </div>
                          <div className="structured-item-actions">
                            <button type="button" className="small-link" onClick={()=>{setEditingIntl(item);setShowIntlForm(true);}}>Editar</button>
                            <button type="button" className="small-link danger-link" onClick={()=>void deleteInternational(item.id)}>Excluir</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-bio">Nenhum intercâmbio ou vivência internacional cadastrada.</p>
                  )}

                  <div className="detail-divider"/>
                  <div className="profile-section-title">
                    <h3>Disponibilidade para viagens e habilitações</h3>
                    <button type="button" className="tiny-add" onClick={()=>void saveProfile(profile)}><Check size={14}/> Salvar bloco</button>
                  </div>
                  <div className="profile-block-card">
                    <div className="profile-subblock">
                      <span className="profile-sublabel">Disponibilidade para viagens</span>
                      <div className="travel-choice-grid">
                        {travelAvailabilityOptions.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`travel-choice-btn ${profile.travelAvailability === opt.value ? "is-selected" : ""}`}
                            onClick={() => {
                              const next = { ...profile, travelAvailability: opt.value };
                              setProfile(next);
                              if (!editing) void saveProfile(next, true).then(ok => { if (ok) notify("Disponibilidade para viagens atualizada."); });
                            }}
                          >
                            <b>{opt.label}</b>
                            <small>{opt.hint}</small>
                          </button>
                        ))}
                      </div>
                      <label className="entry-consent" style={{marginTop:8}}>
                        <input
                          type="checkbox"
                          checked={profile.relocationAvailability}
                          onChange={e => {
                            const next = { ...profile, relocationAvailability: e.target.checked };
                            setProfile(next);
                            if (!editing) void saveProfile(next, true);
                          }}
                        />
                        <span>Disponibilidade para mudança de cidade ou estado</span>
                      </label>
                      <label className="field-label" style={{marginBottom:0}}>
                        Observações sobre viagens ou mobilidade (opcional)
                        <input
                          value={profile.travelNotes}
                          onChange={e => setProfile({ ...profile, travelNotes: e.target.value })}
                          placeholder="Ex.: Passaporte válido, viagens regionais ou internacionais, pernoite..."
                        />
                      </label>
                    </div>

                    <div className="profile-subblock">
                      <span className="profile-sublabel">Habilitação — CNH</span>
                      <div className="pref-chips">
                        {cnhCategoryOptions.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            className={`filter-chip ${profile.cnhCategories.includes(cat) ? "filter-chip-active" : ""}`}
                            onClick={() => toggleProfileChip("cnhCategories", cat, "Categorias de CNH")}
                          >
                            CNH {cat}
                          </button>
                        ))}
                      </div>
                      <div className="inline-checks-row">
                        <label className="entry-consent">
                          <input
                            type="checkbox"
                            checked={profile.cnhEar}
                            onChange={e => {
                              const next = { ...profile, cnhEar: e.target.checked };
                              setProfile(next);
                              if (!editing) void saveProfile(next, true);
                            }}
                          />
                          <span>Exerce Atividade Remunerada (EAR)</span>
                        </label>
                        <label className="entry-consent">
                          <input
                            type="checkbox"
                            checked={profile.hasOwnVehicle}
                            onChange={e => {
                              const next = { ...profile, hasOwnVehicle: e.target.checked };
                              setProfile(next);
                              if (!editing) void saveProfile(next, true);
                            }}
                          />
                          <span>Possui veículo próprio</span>
                        </label>
                      </div>
                    </div>

                    <div className="profile-subblock">
                      <span className="profile-sublabel">Outras habilitações, licenças e registros profissionais</span>
                      <div className="pref-chips">
                        {commonOtherLicenses.map(lic => (
                          <button
                            key={lic}
                            type="button"
                            className={`filter-chip ${profile.otherLicenses.some(x => x.toLocaleLowerCase("pt-BR") === lic.toLocaleLowerCase("pt-BR")) ? "filter-chip-active" : ""}`}
                            onClick={() => toggleProfileChip("otherLicenses", lic, "Outras habilitações")}
                          >
                            {lic}
                          </button>
                        ))}
                      </div>
                      <div className="skill-add-row" style={{marginTop:8, marginBottom:4}}>
                        <input
                          value={otherLicenseDraft}
                          onChange={e => setOtherLicenseDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomOtherLicense(); } }}
                          placeholder="Outra habilitação ou licença (ex.: MOPP, Operador de Pá Carregadeira, CRQ...)"
                          aria-label="Outra habilitação ou licença"
                        />
                        <button type="button" className="outline-button" onClick={addCustomOtherLicense}><Plus size={14}/> Adicionar</button>
                      </div>
                      {profile.otherLicenses.length > 0 && (
                        <div className="skill-tags" style={{marginTop:6}}>
                          {profile.otherLicenses.map(lic => (
                            <span key={lic} className="skill-tag skill-tag-removable">
                              {lic}
                              <button type="button" aria-label={`Remover ${lic}`} onClick={() => toggleProfileChip("otherLicenses", lic, "Outras habilitações")}><X size={11}/></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="detail-divider"/>
                  <div className="profile-section-title">
                    <h3>Informações sobre família <span className="optional-pill">Opcional</span></h3>
                    <button type="button" className="tiny-add" onClick={()=>void saveProfile(profile)}><Check size={14}/> Salvar bloco</button>
                  </div>
                  <div className="profile-block-card">
                    <small className="local-note" style={{marginTop:0}}>Preenchimento voluntário. Estas informações não são usadas como critério eliminatório nem interferem no match automático.</small>
                    <div className="form-row">
                      <label className="field-label">
                        Estado civil
                        <select
                          value={profile.maritalStatus}
                          onChange={e => {
                            const next = { ...profile, maritalStatus: e.target.value as MaritalStatus };
                            setProfile(next);
                            if (!editing) void saveProfile(next, true);
                          }}
                        >
                          {maritalStatusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </label>
                      <label className="field-label">
                        Possui filhos?
                        <select
                          value={profile.hasChildren === null ? "" : profile.hasChildren ? "sim" : "nao"}
                          onChange={e => {
                            const v = e.target.value;
                            const hasChildren = v === "" ? null : v === "sim";
                            const next = { ...profile, hasChildren, childrenCount: hasChildren ? (profile.childrenCount ?? 1) : null };
                            setProfile(next);
                            if (!editing) void saveProfile(next, true);
                          }}
                        >
                          <option value="">Prefiro não informar</option>
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </label>
                    </div>
                    {profile.hasChildren === true && (
                      <label className="field-label">
                        Quantidade de filhos
                        <input
                          type="number"
                          min="1"
                          max="20"
                          step="1"
                          value={profile.childrenCount ?? 1}
                          onChange={e => setProfile({ ...profile, childrenCount: e.target.value ? Math.max(1, Math.min(20, Number(e.target.value))) : 1 })}
                        />
                      </label>
                    )}
                    <label className="field-label" style={{marginBottom:0}}>
                      Observações adicionais (opcional)
                      <input
                        value={profile.familyNotes}
                        onChange={e => setProfile({ ...profile, familyNotes: e.target.value })}
                        placeholder="Ex.: Informações relevantes sobre rotina ou disponibilidade familiar"
                      />
                    </label>
                  </div>

                  <div className="detail-divider"/>
                  <div className="profile-section-title">
                    <h3>Deficiências (PCD) e necessidades de adaptação <span className="sensitive-pill">Dado sensível · LGPD</span></h3>
                    <button type="button" className="tiny-add" onClick={()=>void saveProfile(profile)}><Check size={14}/> Salvar bloco</button>
                  </div>
                  <div className="profile-block-card profile-sensitive-card">
                    <div className="sensitive-notice">
                      <ShieldCheck size={15}/>
                      <span>Preenchimento estritamente voluntário (LGPD Art. 11). Utilizado apenas para acessibilidade, adaptações razoáveis ou vagas afirmativas quando você autorizar o compartilhamento abaixo.</span>
                    </div>
                    <div className="form-row">
                      <label className="field-label">
                        Pessoa com deficiência (PCD)?
                        <select
                          value={profile.isPcd === null ? "" : profile.isPcd ? "sim" : "nao"}
                          onChange={e => {
                            const v = e.target.value;
                            const isPcd = v === "" ? null : v === "sim";
                            const next = { ...profile, isPcd, pcdTypes: isPcd ? profile.pcdTypes : [], pcdCid: isPcd ? profile.pcdCid : "" };
                            setProfile(next);
                            if (!editing) void saveProfile(next, true);
                          }}
                        >
                          <option value="">Prefiro não informar</option>
                          <option value="nao">Não</option>
                          <option value="sim">Sim, sou pessoa com deficiência (PCD)</option>
                        </select>
                      </label>
                      {profile.isPcd === true && (
                        <label className="field-label">
                          Código CID (opcional)
                          <input
                            value={profile.pcdCid}
                            onChange={e => setProfile({ ...profile, pcdCid: e.target.value })}
                            placeholder="Ex.: H90.3, F84.0 (opcional)"
                          />
                        </label>
                      )}
                    </div>
                    {profile.isPcd === true && (
                      <>
                        <div className="profile-subblock">
                          <span className="profile-sublabel">Tipo de deficiência (selecione uma ou mais)</span>
                          <div className="pref-chips">
                            {pcdTypeOptions.map(t => (
                              <button
                                key={t}
                                type="button"
                                className={`filter-chip ${profile.pcdTypes.includes(t) ? "filter-chip-active" : ""}`}
                                onClick={() => toggleProfileChip("pcdTypes", t, "Tipo de deficiência")}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="proof-upload-box" style={{marginTop:8}}>
                          <label>
                            Laudo caracterizador (opcional — apenas formato PDF)
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              disabled={uploadingPcdProof}
                              onChange={e => {
                                const picked = e.target.files?.[0] || null;
                                e.target.value = "";
                                if (picked) void handlePcdProofUpload(picked);
                              }}
                            />
                            <small>{uploadingPcdProof ? "Enviando PDF..." : "Aceita apenas arquivo em formato PDF (.pdf), até 10 MB, em armazenamento privado."}</small>
                          </label>
                          {profile.pcdProofFileName && (
                            <div className="proof-existing-row">
                              <span><FileText size={13}/> Laudo anexado: <b>{profile.pcdProofFileName}</b></span>
                              <div style={{display:"flex",gap:8}}>
                                <button type="button" className="small-link" onClick={()=>void openProofDocument(profile.pcdProofPath, profile.pcdProofFileName)}>Ver PDF</button>
                                <button type="button" className="small-link danger-link" onClick={()=>void removePcdProof()}>Remover</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    <label className="field-label">
                      Necessidades de adaptação e acessibilidade (para entrevistas ou ambiente de trabalho)
                      <textarea
                        className="profile-textarea"
                        rows={3}
                        value={profile.accessibilityNeeds}
                        onChange={e => setProfile({ ...profile, accessibilityNeeds: e.target.value })}
                        placeholder="Ex.: Intérprete de Libras, leitor de tela, estação acessível para cadeira de rodas, iluminação controlada, tempo estendido em testes..."
                      />
                    </label>
                    <label className="entry-consent" style={{marginBottom:0}}>
                      <input
                        type="checkbox"
                        checked={profile.shareSensitiveInApplications}
                        onChange={e => {
                          const next = { ...profile, shareSensitiveInApplications: e.target.checked };
                          setProfile(next);
                          if (!editing) void saveProfile(next, true).then(ok => { if (ok) notify(e.target.checked ? "Dados de PCD/adaptação autorizados no envio de candidaturas." : "Dados de PCD/adaptação mantidos privados nas candidaturas."); });
                        }}
                      />
                      <span>Autorizo incluir minhas informações de PCD e necessidades de adaptação na cópia enviada às empresas ao me candidatar.</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="profile-side">
                <div className="panel visibility-card">
                  <span className="stat-icon stat-green"><ShieldCheck size={18}/></span>
                  <h3>{profile.visible?"Seu perfil está visível":"Perfil oculto"}</h3>
                  <p>{profile.visible?"Empresas validadas podem encontrar seu perfil com base no seu consentimento vigente.":"Seu perfil não aparece nas buscas de recrutadores."}</p>
                  <button className="text-link" onClick={()=>void toggleProfileVisibility(!profile.visible)}>{profile.visible?"Ocultar perfil":"Tornar perfil visível"} <ArrowRight size={14}/></button>
                </div>
                <div className="panel profile-preferences">
                  <h3>Critérios de match 100%</h3>
                  <div><MapPin size={16}/><span><small>Cidade e UF</small><b>{[profile.city, profile.state].filter(Boolean).join(", ") || "Não informada"} · Brasil</b></span></div>
                  <div><TrendingUp size={16}/><span><small>Pretensão bruta mensal (aceita vagas ≥ valor)</small>{editing?<input className="preference-input" type="number" min="1" step="1" value={profile.salaryMonthly ?? ""} onChange={e=>setProfile({...profile,salaryMonthly:e.target.value?Number(e.target.value):null})}/>:<b>{formatMonthlySalary(profile.salaryMonthly)}</b>}</span></div>
                  <div className="pref-modes-block">
                    <small>Formato de trabalho aceito</small>
                    <div className="pref-chips">{workplaceModes.map(item => <button key={item} type="button" className={`filter-chip ${profile.workplacePreferences.includes(item) ? "filter-chip-active" : ""}`} onClick={()=>toggleWorkplacePreference(item)}>{item}</button>)}</div>
                  </div>
                  <div className="pref-modes-block">
                    <small>Formato de contratação pretendido</small>
                    <div className="pref-chips">{contractTypeOptions.map(item => <button key={item} type="button" className={`filter-chip ${profile.contractTypes.includes(item) ? "filter-chip-active" : ""}`} onClick={()=>toggleProfileListOption("contractTypes", item, "Formato de contratação")}>{item}</button>)}</div>
                  </div>
                  <div className="pref-modes-block">
                    <small>Horários aceitos</small>
                    <div className="pref-chips">{workScheduleOptions.map(item => <button key={item} type="button" className={`filter-chip ${profile.workSchedules.includes(item) ? "filter-chip-active" : ""}`} onClick={()=>toggleProfileListOption("workSchedules", item, "Horários aceitos")}>{item}</button>)}</div>
                  </div>
                  <div className="pref-modes-block">
                    <small>Formatos de escala aceitos</small>
                    <div className="pref-chips">{workShiftOptions.map(item => <button key={item} type="button" className={`filter-chip ${profile.workShifts.includes(item) ? "filter-chip-active" : ""}`} onClick={()=>toggleProfileListOption("workShifts", item, "Formatos de escala")}>{item}</button>)}</div>
                  </div>
                  <div className="pref-modes-block pref-distance-box">
                    <small>Presencial em local fixo — distância e coordenadas</small>
                    <label className="pref-inline-field"><span>Distância máxima (km)</span><input className="preference-input" type="number" min="1" max="500" step="1" value={profile.maxDistanceKm ?? ""} onChange={e=>{const val=e.target.value?Number(e.target.value):null;const next={...profile,maxDistanceKm:val};setProfile(next);if(!editing)void saveProfile(next,true);}} placeholder="Ex.: 20"/></label>
                    <select className="preference-input" defaultValue="" onChange={e=>{if(e.target.value)applyLocationPresetToProfile(e.target.value);}} aria-label="Preencher região de referência">
                      <option value="">Escolher região de referência...</option>
                      {locationPresets.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                    </select>
                    <div className="coord-row">
                      <input className="preference-input" type="number" step="0.0001" value={profile.latitude ?? ""} onChange={e=>{const val=e.target.value?Number(e.target.value):null;const next={...profile,latitude:val};setProfile(next);if(!editing)void saveProfile(next,true);}} placeholder="Latitude" aria-label="Latitude do candidato"/>
                      <input className="preference-input" type="number" step="0.0001" value={profile.longitude ?? ""} onChange={e=>{const val=e.target.value?Number(e.target.value):null;const next={...profile,longitude:val};setProfile(next);if(!editing)void saveProfile(next,true);}} placeholder="Longitude" aria-label="Longitude do candidato"/>
                    </div>
                    <button type="button" className="small-link" onClick={captureBrowserLocationForProfile}><MapPin size={12}/> Usar localização do navegador</button>
                  </div>
                  <button className="preferences-edit" onClick={()=>{if(!editing){setProfileBackup({...profile,skills:[...profile.skills],softSkills:[...profile.softSkills],workplacePreferences:[...profile.workplacePreferences],workSchedules:[...profile.workSchedules],contractTypes:[...profile.contractTypes],workShifts:[...profile.workShifts]});setEditing(true);}}}>Editar dados básicos <ArrowRight size={14}/></button>
                </div>
                <div className="panel skills-prompt">
                  <div className="prompt-icon"><Sparkles size={17}/></div>
                  <h3>Valide suas competências</h3>
                  <p>Acompanhe recomendações práticas e registre autoavaliações educativas.</p>
                  <button onClick={()=>setActive("evolution")}>Ver evolução <ArrowRight size={14}/></button>
                </div>
              </div>
            </div>
          </>}

          {/* Evolução: progresso real do perfil, recomendações acionáveis, autoavaliação educativa e feedbacks. */} {active === "evolution" && <>
            <div className="page-heading"><div><div className="eyebrow">SEU DESENVOLVIMENTO, NO SEU RITMO</div><h1>Minha evolução</h1><p className="page-subtitle">Acompanhe a completude do seu perfil, pratique com autoavaliações e consulte retornos recebidos.</p></div></div>
            <div className="evolution-hero">
              <div>
                <div className="hero-pill"><Sparkles size={13}/> SUA JORNADA PROFISSIONAL</div>
                <h2>Todo passo conta<br/>na sua <em>evolução.</em></h2>
                <p>Use o progresso do perfil, feedbacks reais e autoavaliações educativas para orientar seus próximos passos.</p>
                <button className="hero-button" onClick={()=>setShowAssessment(true)}>Iniciar autoavaliação de SQL <ArrowRight size={15}/></button>
              </div>
              <div className="evolution-score">
                <div className="score-ring" style={{background:`conic-gradient(#b8cbff 0 ${profileCompletion}%, #ffffff24 ${profileCompletion}%)`}}><div><b>{profileCompletion}</b><small>/ 100</small></div></div>
                <span>Perfil profissional</span>
                <small>{filledProfileBlocks} de 10 blocos completos</small>
              </div>
            </div>
            <div className="section-heading evolution-heading"><div><div className="section-kicker"><Target size={13}/> PLANO DE DESENVOLVIMENTO</div><h2>Próximos passos recomendados</h2><p>Ações práticas baseadas no que já está preenchido no seu perfil.</p></div></div>
            <div className="recommendation-grid">
              <div className="panel recommendation">
                <span className="recommendation-icon icon-lavender"><ChartNoAxesColumnIncreasing size={18}/></span>
                <span className="recommendation-tag">AUTOAVALIAÇÃO · EDUCATIVA</span>
                <h3>{assessmentResults.length ? `Refaça a prática de SQL (último: ${assessmentResults[0].score}%)` : "Faça uma autoavaliação de SQL"}</h3>
                <p>Responda 5 questões básicas e registre seu resultado pessoal neste dispositivo (não é certificação).</p>
                <button onClick={()=>setShowAssessment(true)}>{assessmentResults.length ? "Praticar novamente" : "Fazer avaliação"} <ArrowRight size={14}/></button>
              </div>
              <div className="panel recommendation">
                <span className="recommendation-icon icon-sky"><MessageSquareText size={18}/></span>
                <span className="recommendation-tag">{profile.bio && profile.skills.length >= 3 ? "PERFIL · CONCLUÍDO" : "PERFIL · RESUMO E COMPETÊNCIAS"}</span>
                <h3>{profile.bio ? "Atualize resumo e competências" : "Complete seu resumo profissional"}</h3>
                <p>{profile.bio ? `Você cadastrou ${profile.skills.length} competência(s) para comparação exata nas vagas.` : "Adicione um resumo objetivo e suas competências para melhorar a correspondência nas vagas."}</p>
                <button onClick={()=>{setProfileBackup({...profile,skills:[...profile.skills],workplacePreferences:[...profile.workplacePreferences]});setEditing(true);setActive("profile");}}>Abrir edição do perfil <ArrowRight size={14}/></button>
              </div>
              <div className="panel recommendation">
                <span className="recommendation-icon icon-mint"><GraduationCap size={18}/></span>
                <span className="recommendation-tag">{educations.length > 0 ? `FORMAÇÃO · ${educations.length} REGISTRO(S)` : "FORMAÇÃO · PENDENTE"}</span>
                <h3>{educations.length > 0 ? "Gerencie sua formação" : "Adicione sua formação"}</h3>
                <p>{educations.length > 0 ? "Mantenha cursos e graduações atualizados no seu perfil estruturado." : "Inclua sua formação acadêmica ou cursos no perfil para enriquecer sua apresentação."}</p>
                <button onClick={()=>{setEditingEdu(null);setShowEduForm(true);setActive("profile");}}>{educations.length > 0 ? "Adicionar outra formação" : "Adicionar formação"} <ArrowRight size={14}/></button>
              </div>
            </div>
            <section className="panel assessment-history"><h3>Autoavaliações realizadas (uso educativo local)</h3>{assessmentResults.length?assessmentResults.map((result,i)=><div className="assessment-result" key={i}><span>{result.skill} · {result.date}</span><b>{result.score}%</b></div>):<p>Ainda não há resultados. As autoavaliações são educativas, ficam salvas neste navegador e não representam certificação.</p>}</section>
            <section className="panel feedback-panel"><div className="feedback-icon"><MessageSquareText size={18}/></div><div><h3>Feedbacks das suas candidaturas</h3><p>{authUser ? "Os retornos aprovados pelas empresas aparecem automaticamente abaixo." : "Os retornos registrados pela empresa nesta demonstração aparecem abaixo."}</p></div><span className="feedback-empty">{applications.filter(app=>app.recruiterNote).length} feedback(s)</span></section>
            {applications.filter(app=>app.recruiterNote).map(app=>{const job=byId(app.jobId);return <div className="candidate-feedback" key={app.id??app.jobId}><b>{job?.role||"Candidatura"}{job?.company?` · ${job.company}`:""} · {app.status} ({app.date})</b><p>{app.recruiterNote}</p></div>;})}
          </>}

          {/* FAQ interativo do candidato: busca, filtros por tema e respostas expansíveis. */} {active === "faq" && !companyMode && <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">CENTRAL DE AJUDA</div>
                <h1>Perguntas frequentes (FAQ)</h1>
                <p className="page-subtitle">Tire dúvidas sobre perfil, competências, salários, candidaturas e privacidade.</p>
              </div>
              <div className="page-heading-actions">
                <button className="outline-button" onClick={() => setOpenFaqIds(openFaqIds.length === filteredFaq.length ? [] : filteredFaq.map(item => item.id))}>
                  {openFaqIds.length === filteredFaq.length && filteredFaq.length > 0 ? "Recolher todas" : "Expandir todas"}
                </button>
              </div>
            </div>
            <div className="job-search faq-search">
              <Search size={18}/>
              <input value={faqQuery} onChange={e => setFaqQuery(e.target.value)} placeholder="Buscar dúvida por palavra-chave (ex.: salário, consentimento, SQL, feedback)" aria-label="Buscar nas perguntas frequentes"/>
              {faqQuery && <button type="button" className="icon-button" aria-label="Limpar busca do FAQ" onClick={() => setFaqQuery("")}><X size={16}/></button>}
            </div>
            <div className="filter-row" style={{margin:"10px 0 14px"}}>
              <span>Tema:</span>
              {faqCategories.map(cat => (
                <button key={cat} className={`filter-chip ${faqCategory === cat ? "filter-chip-active" : ""}`} onClick={() => setFaqCategory(cat)}>{cat}</button>
              ))}
            </div>
            <div className="faq-list">
              {filteredFaq.map(item => {
                const isOpen = openFaqIds.includes(item.id);
                return (
                  <article className={`panel faq-item ${isOpen ? "faq-item-open" : ""}`} key={item.id}>
                    <button type="button" className="faq-trigger" aria-expanded={isOpen} onClick={() => toggleFaqItem(item.id)}>
                      <span className="faq-trigger-text">
                        <small className="faq-category">{item.category}</small>
                        <b>{item.question}</b>
                      </span>
                      <ChevronDown size={17} className="faq-chevron" />
                    </button>
                    {isOpen && (
                      <div className="faq-answer">
                        <p>{item.answer}</p>
                        {item.actionLabel && item.actionTab && (
                          <button type="button" className="small-link" onClick={() => setActive(item.actionTab!)}>{item.actionLabel} <ArrowRight size={14}/></button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
              {filteredFaq.length === 0 && (
                <EmptyState title="Nenhuma pergunta encontrada" text="Tente outro termo de busca ou volte para todos os temas." action="Limpar filtros" onAction={() => { setFaqQuery(""); setFaqCategory("Todas"); }}/>
              )}
            </div>
            <section className="panel faq-footer-card">
              <div>
                <h3>Precisa revisar suas configurações ou dados?</h3>
                <p>Acesse diretamente seu perfil estruturado ou o painel de privacidade e histórico de consentimentos.</p>
              </div>
              <div className="page-heading-actions">
                <button className="outline-button" onClick={() => setActive("profile")}><UserRound size={15}/> Meu perfil</button>
                <button className="primary-button" onClick={() => setActive("settings")}><ShieldCheck size={15}/> Privacidade e dados</button>
              </div>
            </section>
          </>}

          {active === "saved" && <><div className="page-heading"><div><div className="eyebrow">OPORTUNIDADES QUE VOCÊ GUARDOU</div><h1>Vagas salvas</h1><p className="page-subtitle">Volte quando quiser e candidate-se no seu tempo.</p></div><button className="outline-button" onClick={()=>setActive("jobs")}><Search size={16}/> Buscar vagas</button></div>{saved.length > savedJobs.length && <p className="local-note" style={{marginBottom:10}}>{saved.length - savedJobs.length} vaga(s) salva(s) anteriormente foram pausadas ou encerradas pela empresa.</p>}<div className="all-jobs-list">{savedJobs.map(job=><JobCard key={job.id} job={job} saved={true} applied={applications.some(a=>a.jobId===job.id)} onSave={()=>toggleSaved(job.id)} onOpen={()=>{setModalConsentAccepted(false);setSelected(job);}} horizontal/>)}{savedJobs.length===0&&<EmptyState title="Ainda não há vagas salvas disponíveis" text="Salve oportunidades interessantes na busca para encontrá-las facilmente depois." action="Encontrar vagas" onAction={()=>setActive("jobs")}/>}</div></>}

          {/* Painel da empresa: indicadores derivados das vagas e candidaturas da conta. */} {companyMode && active === "company" && <><div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> ÁREA DA EMPRESA</div><h1>Olá, {employer.name || "Empresa"}!</h1><p className="page-subtitle">Veja como estão seus processos seletivos.</p></div><button className="primary-button" onClick={openNewJob}><Plus size={17}/> {supabase&&authUser&&!authCompanyVerified?"Criar rascunho de vaga":"Publicar vaga"}</button></div>{supabase&&authUser&&!authCompanyVerified&&<div className="company-notice">Empresa aguardando validação administrativa. Você já pode cadastrar, editar e gerenciar vagas em <b>Rascunho</b> e configurar o perfil da empresa; a publicação pública para candidatos é liberada após a validação pelo administrador.</div>}<div className="company-stats"><div className="stat-card"><span className="stat-icon stat-violet"><BriefcaseBusiness size={18}/></span><span className="stat-change">{authUser?"Registros no banco":"Registro local"}</span><b>{posted.filter(job=>job.status==="Ativa").length}</b><small>vagas com status Ativa</small></div><div className="stat-card"><span className="stat-icon stat-blue"><Users size={18}/></span><span className="stat-change">{authUser?"Conta autenticada":"Registro local"}</span><b>{applications.length}</b><small>candidaturas registradas</small></div><div className="stat-card"><span className="stat-icon stat-green"><Clock3 size={18}/></span><span className="stat-change">Etapa alterada</span><b>{respondedCount}</b><small>de {applications.length} candidaturas</small></div><div className="stat-card"><span className="stat-icon stat-amber"><MessageSquareText size={18}/></span><span className="stat-change">Texto salvo</span><b>{feedbackCount}</b><small>candidaturas com feedback</small></div></div><div className="company-content-grid"><section className="panel company-vacancies"><div className="panel-heading"><div><h3>Suas vagas</h3><p>Gerencie vagas e acompanhe candidaturas.</p></div><button className="small-link" onClick={()=>setActive("companyJobs")}>Ver todas <ArrowRight size={14}/></button></div>{posted.length?posted.slice(0,4).map(job=><div className="vacancy-row" key={job.id}><span className="vacancy-dot"/><div><b>{job.role}</b><small>{job.mode} · {job.location}</small></div><span className="candidate-count"><Users size={14}/>{applications.filter(app=>app.jobId===job.id).length}</span><Status status={job.status||"Ativa"}/><button className="icon-button" onClick={()=>setActive("companyJobs")} aria-label="Gerenciar vaga"><ChevronRight size={16}/></button></div>):<div className="company-empty">Cadastre sua primeira vaga para começar a organizar seus processos seletivos.</div>}</section><div className="company-side-cards"><div className="panel response-card"><span className="response-icon"><MessageSquareText size={18}/></span><div><span className="section-kicker">TRANSPARÊNCIA</span><h3>Bom trabalho!</h3><p>{respondedCount} de {applications.length} candidaturas têm status diferente de "Inscrição enviada".</p><div className="response-bar"><span style={{width:applications.length?`${respondedCount/applications.length*100}%`:"0%"}}/></div><small>{respondedCount} de {applications.length} candidaturas</small></div></div><div className="panel hiring-tip"><Sparkles size={17}/><b>Dica para sua próxima vaga</b><p>Informe competências exigidas, cidade e UF ou abrangência remota, modalidade e salário bruto mensal único.</p></div></div></div></>}

          {/* Privacidade: consentimento específico por finalidade, histórico LGPD, cópia e exclusão local. */} {active === "settings" && !companyMode && <>
            <div className="page-heading"><div><div className="eyebrow">CONTROLE DOS SEUS DADOS</div><h1>Privacidade e dados</h1><p className="page-subtitle">{authUser ? "Gerencie seus consentimentos específicos e consulte o histórico registrado no banco local." : "Escolha como seus dados são usados neste protótipo local."}</p></div></div>
            <div className="panel privacy-panel">
              <div className="privacy-row"><div><b>Compartilhar meu perfil ao me candidatar</b><p>Permite incluir uma cópia instantânea (snapshot) dos seus dados básicos ao enviar candidaturas. Revogar interrompe novos acessos de recrutadores.</p></div><label className="switch"><input type="checkbox" checked={privacyConsent} onChange={async e=>{const granted=e.target.checked;if(supabase&&authUser){const {error}=await supabase.rpc("record_privacy_consent",{target_purpose:"application_profile_sharing",is_granted:granted});if(error){notify("O banco recusou o consentimento: "+error.message);return;}void refreshConsentHistory();}setPrivacyConsent(granted);localStorage.setItem("ec-privacy-consent",JSON.stringify(granted));if(!granted){const next=applications.map(({candidateSnapshot,...application})=>application);persistApps(next);}notify(granted?"Compartilhamento de perfil autorizado para candidaturas.":"Compartilhamento de perfil revogado.");}}/><span/></label></div>
              <div className="privacy-row"><div><b>Visibilidade nas buscas</b><p>Empresas validadas podem visualizar seu perfil quando ele está público com consentimento vigente.</p></div><label className="switch"><input type="checkbox" checked={profile.visible} onChange={e=>void toggleProfileVisibility(e.target.checked)}/><span/></label></div>
              <div className="privacy-row"><div><b>Baixar uma cópia dos dados</b><p>Exporte perfil, experiências, formações, candidaturas, vagas salvas e histórico de consentimentos em JSON.</p></div><button className="outline-button" onClick={exportData}><FileText size={15}/> Baixar meus dados</button></div>
              <div className="privacy-row privacy-danger"><div><b>Apagar os dados deste navegador</b><p>Remove somente o cache e os registros locais salvos no navegador atual.</p></div><button className="danger-button" onClick={deleteLocalData}>Apagar dados</button></div>
              <p className="local-note">{authUser ? "Ambiente de testes conectado ao Supabase local com RLS. Use apenas dados fictícios; o registro técnico de consentimento não substitui revisão jurídica." : "Este controle não apaga dados de um servidor: o protótipo não envia dados para serviços externos."}</p>
            </div>
            {authUser && (
              <section className="panel consent-history-panel">
                <div className="panel-heading"><div><h3>Histórico de consentimentos</h3><p>Registro imutável em <code>consent_records</code> com finalidade, versão e data/hora definidos pelo servidor.</p></div><button className="small-link" onClick={() => void refreshConsentHistory()}>Atualizar</button></div>
                {consentHistory.length ? (
                  <div className="consent-history-list">
                    {consentHistory.map(item => (
                      <div className="consent-history-row" key={item.id}>
                        <div><b>{consentPurposeLabel[item.purpose] || item.purpose}</b><small>Versão: {item.policyVersion} · {item.recordedAt}</small></div>
                        <span className={`status ${item.granted ? "status-active" : "status-closed"}`}><i/>{item.granted ? "Autorizado" : "Revogado"}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="local-note">Nenhuma decisão de consentimento registrada ainda nesta conta.</p>}
              </section>
            )}
          </>}
          {/* Gestão de vagas: edição e transição entre rascunho, ativa, pausada e encerrada. */} {companyMode && active === "companyJobs" && <><div className="page-heading"><div><div className="eyebrow">GESTÃO DE OPORTUNIDADES</div><h1>Minhas vagas</h1><p className="page-subtitle">Edite, pause, reative ou encerre as vagas da empresa.</p></div><button className="primary-button" onClick={openNewJob}><Plus size={16}/> {supabase&&authUser&&!authCompanyVerified?"Criar rascunho de vaga":"Publicar vaga"}</button></div>{supabase&&authUser&&!authCompanyVerified&&<div className="company-notice">Empresa aguardando validação administrativa. Novas vagas são salvas como <b>Rascunho</b> até a validação pelo administrador.</div>}<div className="company-job-list">{posted.map(job=><div className="panel managed-job" key={job.id}><CompanyLogo job={job}/><div className="managed-job-info"><b>{job.role}</b><small>{job.mode}{job.mode==="Presencial"&&job.isFixedLocation?" (fixo)":""} · {job.contractType} · {job.workSchedule} · {job.workShift} · {job.location} · {formatMonthlySalary(job.salaryMonthly)}</small><span>Hard: {job.tags.join(", ")||"não informadas"}{job.softSkills.length ? ` · Soft: ${job.softSkills.join(", ")}` : ""}</span></div><Status status={job.status||"Ativa"}/><button className="small-link" onClick={()=>{setEditingJob(job);setShowNewJob(true)}}>Editar</button>{job.status==="Rascunho"?<button className="small-link" onClick={()=>{if(supabase&&authUser&&!authCompanyVerified){notify("A administração precisa validar a empresa antes de publicar vagas publicamente.");return;}void saveJob({...job,status:"Ativa"},"Vaga publicada com sucesso!");}}>Publicar</button>:job.status==="Encerrada"?<button className="small-link" onClick={()=>{const nextStatus=supabase&&authUser&&!authCompanyVerified?"Rascunho":"Ativa";void saveJob({...job,status:nextStatus},nextStatus==="Rascunho"?"Vaga reaberta como rascunho.":"Vaga reativada.");}}>Reabrir</button>:<button className="small-link danger-link" onClick={()=>{const nextStatus=job.status==="Pausada"?(supabase&&authUser&&!authCompanyVerified?"Rascunho":"Ativa"):"Pausada";void saveJob({...job,status:nextStatus},nextStatus==="Pausada"?"Vaga pausada.":"Vaga reativada.");}}>{job.status==="Pausada"?"Reativar":"Pausar"}</button>}{job.status!=="Encerrada"&&<button className="icon-button" aria-label="Encerrar vaga" title="Encerrar vaga" onClick={()=>void saveJob({...job,status:"Encerrada"},"Vaga encerrada.")}><X size={16}/></button>}</div>)}{posted.length===0&&<EmptyState title="Cadastre sua primeira vaga" text="Inclua salário bruto mensal, modalidade, requisitos e benefícios." action={supabase&&authUser&&!authCompanyVerified?"Criar rascunho de vaga":"Criar vaga"} onAction={openNewJob}/>}</div></>}
          {/* Recrutamento: atualizar etapa e salvar feedback por candidatura. */} {companyMode && active === "talents" && <><div className="page-heading"><div><div className="eyebrow">PROCESSOS SELETIVOS</div><h1>Candidatos</h1><p className="page-subtitle">Atualize a etapa e deixe feedback para cada candidatura.</p></div></div><div className="applications-board">{applications.map(app=>{const job=byId(app.jobId);const shared=app.candidateSnapshot;const appKey=app.id??app.jobId;if(!job)return null;return <div className="application-detail-card" key={appKey}><div className="app-card-top"><span className="avatar">{shared?shared.name.slice(0,2).toUpperCase():"—"}</span><span className="app-date">Candidatura registrada em {app.date}</span><span className="match-pill">{shared?`${getMatchedSkills(job,shared).length} competências coincidentes`:"Perfil não compartilhado"}</span></div><h3>{shared?`${shared.name} · ${shared.role}`:"Dados de perfil não compartilhados"}</h3><p>Vaga: {job.role} · {job.company}</p>{shared?<>{shared.hardSkillDetails && shared.hardSkillDetails.length > 0 ? <div className="hard-skill-cards" style={{marginTop:8}}>{shared.hardSkillDetails.map(detail=><div className="hard-skill-card" key={detail.skillName}><div className="hard-skill-card-main"><div className="hard-skill-card-title"><b>{detail.skillName}</b><span className="hs-level-badge">{hardSkillLevelLabel[detail.proficiency]}</span><span className="hs-exp-badge">{formatExperienceDuration(detail.experienceMonths)}</span></div><small className="hard-skill-proof-meta"><FileText size={12}/> {detail.proofInstitution || "Instituição"} · {detail.proofFileName || "Comprovante anexado"}</small></div>{detail.proofPath && <div className="hard-skill-card-actions"><button type="button" className="small-link" onClick={()=>void openProofDocument(detail.proofPath, detail.proofFileName)}>Ver certificado</button></div>}</div>)}</div> : <div className="skill-tags">{shared.skills.map(skill=><span className="skill-tag" key={skill}>{skill}</span>)}</div>}<div className="snapshot-extra-grid">{shared.educationsSnapshot && shared.educationsSnapshot.length > 0 && <div><b>Graduações, cursos e certificações</b><ul>{shared.educationsSnapshot.map((ed, idx)=><li key={idx}><span>{educationCategoryLabel[ed.category]}: {[ed.degree, ed.fieldOfStudy].filter(Boolean).join(" — ") || ed.institution} ({ed.institution}){ed.workloadHours ? ` · ${ed.workloadHours}h` : ""}{ed.credentialCode ? ` · ${ed.credentialCode}` : ""}</span>{ed.proofPath && <button type="button" className="small-link" onClick={()=>void openProofDocument(ed.proofPath, ed.proofFileName)}>Ver PDF</button>}</li>)}</ul></div>}{shared.languagesSnapshot && shared.languagesSnapshot.length > 0 && <div><b>Idiomas</b><ul>{shared.languagesSnapshot.map((lg, idx)=><li key={idx}><span>{lg.language} — {languageProficiencyLabel[lg.proficiency]}{lg.certification ? ` (${lg.certification})` : ""}</span>{lg.proofPath && <button type="button" className="small-link" onClick={()=>void openProofDocument(lg.proofPath, lg.proofFileName)}>Ver PDF</button>}</li>)}</ul></div>}{shared.internationalSnapshot && shared.internationalSnapshot.length > 0 && <div><b>Intercâmbios e exterior</b><ul>{shared.internationalSnapshot.map((ie, idx)=><li key={idx}><span>{internationalExperienceTypeLabel[ie.experienceType]} — {[ie.city, ie.country].filter(Boolean).join(", ")}{ie.institutionOrCompany ? ` (${ie.institutionOrCompany})` : ""}</span></li>)}</ul></div>}{(shared.travelAvailability || shared.relocationAvailability || shared.cnhCategories.length > 0 || shared.otherLicenses.length > 0) && <div><b>Viagens e habilitações</b><p>{[shared.travelAvailability ? travelAvailabilityLabel[shared.travelAvailability] : "", shared.relocationAvailability ? "Disponível para mudança" : "", shared.cnhCategories.length ? `CNH ${shared.cnhCategories.join("/")}${shared.cnhEar ? " (EAR)" : ""}` : "", shared.hasOwnVehicle ? "Veículo próprio" : "", shared.otherLicenses.length ? `Licenças: ${shared.otherLicenses.join(", ")}` : ""].filter(Boolean).join(" · ")}</p></div>}{(shared.maritalStatus !== "nao_informar" || shared.hasChildren !== null) && <div><b>Informações familiares (informadas voluntariamente)</b><p>{[shared.maritalStatus !== "nao_informar" ? maritalStatusLabel[shared.maritalStatus] : "", shared.hasChildren === true ? `Filhos: ${shared.childrenCount ?? 1}` : shared.hasChildren === false ? "Sem filhos" : ""].filter(Boolean).join(" · ")}</p></div>}{shared.shareSensitiveInApplications && (shared.isPcd !== null || shared.accessibilityNeeds) && <div><b>PCD e necessidades de adaptação (autorizado pelo candidato)</b><p>{[shared.isPcd === true ? `PCD (${shared.pcdTypes.join(", ") || "Tipo não especificado"})${shared.pcdCid ? ` · CID: ${shared.pcdCid}` : ""}` : shared.isPcd === false ? "Não PCD" : "", shared.accessibilityNeeds ? `Adaptações: ${shared.accessibilityNeeds}` : ""].filter(Boolean).join(" · ")}</p>{shared.pcdProofPath && <button type="button" className="small-link" onClick={()=>void openProofDocument(shared.pcdProofPath, shared.pcdProofFileName)}>Ver laudo PDF</button>}</div>}</div><p className="local-note">Os dados exibidos são a cópia autorizada no envio desta candidatura.</p></>:<p className="local-note">Este registro antigo não contém uma cópia de perfil autorizada; nenhum dado do perfil ativo do navegador é exibido.</p>}<label className="field-label">Etapa registrada<select className="pipeline-select" value={app.status} onChange={e=>changeApplication(appKey,{status:e.target.value})}>{["Inscrição enviada","Em análise","Teste técnico","Entrevista","Oferta","Contratado","Não selecionado","Desistiu"].map(s=><option key={s}>{s}</option>)}</select></label><form className="feedback-form" onSubmit={e=>{e.preventDefault();const note=new FormData(e.currentTarget).get("feedback");changeApplication(appKey,{recruiterNote:String(note??"")});}}><label className="field-label">Feedback para a pessoa candidata<textarea name="feedback" className="profile-textarea" defaultValue={app.recruiterNote||""} placeholder="Informe o texto exato do retorno." rows={3}/></label><button className="outline-button" type="submit"><Check size={15}/> Salvar feedback</button></form><small className="local-note">{authUser?"Registro salvo no banco local com controle de consentimento.":"Registro fictício local; não corresponde a uma candidatura real."}</small></div>})}{applications.length===0&&<EmptyState title="Nenhuma candidatura recebida" text="Candidaturas às vagas publicadas aparecerão aqui."/>}</div></>}
          {/* Relatórios recalculados dos registros cadastrados. */} {companyMode && active === "reports" && <><div className="page-heading"><div><div className="eyebrow">INDICADORES DA EMPRESA</div><h1>Relatórios</h1><p className="page-subtitle">Indicadores calculados com as candidaturas e vagas cadastradas.</p></div></div><div className="panel reports-placeholder"><div className="report-metric"><span>Candidaturas com etapa diferente de Inscrição enviada</span><b>{respondedCount} de {applications.length}</b></div><div className="report-metric"><span>Vagas cadastradas pela empresa</span><b>{posted.length}</b><small>Contagem de vagas em todos os status cadastrados.</small></div><div className="report-metric"><span>Vagas com salário mensal cadastrado</span><b>{posted.filter(job=>job.salaryMonthly !== null).length} de {posted.length}</b></div></div></>}
          {/* Perfil institucional editável da empresa. */} {companyMode && active === "companyProfile" && <><div className="page-heading"><div><div className="eyebrow">SUA ORGANIZAÇÃO</div><h1>Perfil da empresa</h1><p className="page-subtitle">Edite as informações exibidas nas suas vagas.</p></div><div className="page-heading-actions"><button className="outline-button" type="button" onClick={handleLogout}><LogOut size={16}/> Sair da conta</button></div></div><form className="panel company-profile-form" onSubmit={async e=>{e.preventDefault();const nextEmployer={name:employer.name.trim(),website:employer.website.trim(),description:employer.description.trim()};if(supabase&&authUser&&authCompanyId){const {error}=await supabase.from("companies").update({name:nextEmployer.name,website:nextEmployer.website||null,description:nextEmployer.description||null}).eq("id",authCompanyId);if(error){notify("Perfil da empresa não foi salvo: "+error.message);return;}setEmployer(nextEmployer);setAuthCompany(nextEmployer.name);setPosted(current=>current.map(job=>({...job,company:nextEmployer.name,initials:nextEmployer.name.slice(0,2).toUpperCase()})));notify("Perfil da empresa salvo no banco.");}else{setEmployer(nextEmployer);localStorage.setItem("ec-employer",JSON.stringify(nextEmployer));notify("Perfil da empresa salvo neste navegador.");}}}><label className="field-label">Nome da empresa<input value={employer.name} onChange={e=>setEmployer({...employer,name:e.target.value})} required/></label><label className="field-label">Site<input value={employer.website} onChange={e=>setEmployer({...employer,website:e.target.value})} placeholder="https://empresa.com.br"/></label><label className="field-label">Sobre a empresa<textarea className="profile-textarea" value={employer.description} onChange={e=>setEmployer({...employer,description:e.target.value})} rows={5} placeholder="Conte sobre a empresa, a equipe e a cultura."/></label><button className="primary-button" type="submit"><Check size={15}/> Salvar perfil</button></form></>}        </div>
        <footer className="footer"><span>© 2026 Emprego Certo</span><span>Ambiente de testes local — utilize apenas dados fictícios.</span>{!companyMode && <a href="#faq" onClick={e=>{e.preventDefault();setActive("faq");}}>FAQ</a>}<a href="#privacidade" onClick={e=>{e.preventDefault();if(!companyMode)setActive("settings");else setShowHelp(true);}}>Privacidade</a></footer>
      </main>
      {/* Modal de vaga: detalhes, salário bruto mensal, critérios 100% do match e consentimento explícito. */} {selected && (() => {
        const matchEval = evaluateJobMatch(selected, profile);
        const matchedHardSet = new Set(matchEval.matchedSkills.map(s => s.trim().toLocaleLowerCase("pt-BR")));
        const matchedSoftSet = new Set(matchEval.matchedSoftSkills.map(s => s.trim().toLocaleLowerCase("pt-BR")));
        const alreadyApplied = applications.some(a => a.jobId === selected.id);
        return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="job-modal" role="dialog" aria-modal="true" aria-labelledby="job-title"><button className="modal-close icon-button" onClick={()=>setSelected(null)} aria-label="Fechar"><X size={20}/></button><div className="modal-company"><CompanyLogo job={selected}/><span className="match-pill">{matchEval.compatible ? "Match 100% compatível" : "Fora de algum critério atual"}</span></div><h2 id="job-title">{selected.role}</h2><p className="modal-company-name">{selected.company} · {selected.location}</p><div className="job-quickfacts"><span><MapPin size={15}/>{selected.mode}{selected.mode==="Presencial"&&selected.isFixedLocation?" (local fixo)":""}</span><span><BriefcaseBusiness size={15}/>{selected.contractType} · {selected.level}</span><span><Clock3 size={15}/>{selected.workSchedule} · {selected.workShift}</span></div><div className="salary-highlight"><span>SALÁRIO BRUTO MENSAL</span><b>{formatMonthlySalary(selected.salaryMonthly)}</b><small>{matchEval.distanceKm != null && selected.mode === "Presencial" && selected.isFixedLocation ? `Distância calculada até o local fixo: ${matchEval.distanceKm.toLocaleString("pt-BR")} km · ` : ""}Valor bruto mensal único informado pela empresa.</small></div><h3>Sobre a oportunidade</h3><p className="modal-description">{selected.description}</p><h3>Hard skills exigidas (100%)</h3><div className="skill-tags">{selected.tags.map(t=><span className={`skill-tag ${matchedHardSet.has(t.trim().toLocaleLowerCase("pt-BR")) ? "skill-tag-matched" : ""}`} key={t}>{t}</span>)}</div>{selected.softSkills.length > 0 && <><h3>Soft skills exigidas (100%)</h3><div className="skill-tags">{selected.softSkills.map(t=><span className={`skill-tag skill-tag-soft ${matchedSoftSet.has(t.trim().toLocaleLowerCase("pt-BR")) ? "skill-tag-matched" : ""}`} key={t}>{t}</span>)}</div></>}{selected.benefits&&<><h3>Benefícios</h3><p className="modal-description">{selected.benefits}</p></>}<div className="match-explanation"><span className="match-explanation-icon"><Sparkles size={16}/></span><span><b>Critérios do match 100%</b><small>{matchEval.reasons.length ? matchEval.reasons.join(" · ") : `Hard skills coincidentes: ${matchedHardSet.size}/${selected.tags.length} · Soft skills coincidentes: ${matchedSoftSet.size}/${selected.softSkills.length}.`}</small></span></div>{!alreadyApplied && !privacyConsent && <label className="modal-consent-box"><input type="checkbox" checked={modalConsentAccepted} onChange={e=>setModalConsentAccepted(e.target.checked)}/><span>Autorizo compartilhar uma cópia dos dados básicos do meu perfil com <b>{selected.company}</b> ao enviar esta candidatura (você pode revogar em <b>Privacidade e dados</b> a qualquer momento).</span></label>}<div className="modal-actions">{alreadyApplied ? <button className="primary-button apply-button" onClick={()=>{setSelected(null);setActive("applications");}}><Check size={17}/> Ver minha candidatura</button> : <button className="primary-button apply-button" disabled={!privacyConsent && !modalConsentAccepted} onClick={()=>void apply(selected, modalConsentAccepted)}>Candidatar-se agora <ArrowRight size={17}/></button>}<button className={`save-button ${saved.includes(selected.id)?"save-active":""}`} onClick={()=>toggleSaved(selected.id)}><Heart size={17} fill={saved.includes(selected.id)?"currentColor":"none"}/>{saved.includes(selected.id)?"Salva":"Salvar vaga"}</button></div><p className="modal-privacy"><ShieldCheck size={13}/> Seus dados só serão compartilhados com esta empresa quando você se candidatar.</p></div></div>;
      })()}
      {pendingHardSkill && (
        <HardSkillDetailModal
          skillName={pendingHardSkill.skillName}
          existing={pendingHardSkill.existing}
          remainingCount={pendingHardSkill.queue?.length || 0}
          onClose={() => setPendingHardSkill(null)}
          onViewProof={openProofDocument}
          onRemove={pendingHardSkill.existing ? async () => { await removeSkillTag(pendingHardSkill.skillName); setPendingHardSkill(null); } : undefined}
          onSave={saveHardSkillDetail}
        />
      )}
      {showNewJob && <NewJobModal initial={editingJob} draftOnly={Boolean(supabase && authUser && !authCompanyVerified)} onClose={()=>{setShowNewJob(false);setEditingJob(null)}} onCreate={async job=>{const ok=await saveJob(job);if(ok){setShowNewJob(false);setEditingJob(null);setActive("companyJobs");}}}/>}
      {showAssessment && <SkillAssessmentModal onClose={()=>setShowAssessment(false)} onComplete={score=>{const next=[{skill:"SQL básico",score,date:new Intl.DateTimeFormat("pt-BR").format(new Date())},...assessmentResults];setAssessmentResults(next);localStorage.setItem("ec-assessments",JSON.stringify(next));setShowAssessment(false);notify(`Autoavaliação registrada: ${score}%`);}}/>}
      {showHelp && (
        <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowHelp(false)}}>
          <div className="job-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
            <button className="modal-close icon-button" onClick={()=>setShowHelp(false)} aria-label="Fechar"><X size={20}/></button>
            <div className="new-job-heading" style={{marginBottom:12}}>
              <span className="stat-icon stat-violet"><CircleHelp size={18}/></span>
              <div><h2 id="help-title">Central de ajuda — Emprego Certo</h2><p>Orientações rápidas sobre o funcionamento da área do candidato.</p></div>
            </div>
            <div className="help-sections">
              <div><b>1. Perfil estruturado e competências</b><p>Preencha dados básicos, competências (até 50), experiências e formações em <b>Meu perfil</b>. A contagem de coincidência nas vagas usa igualdade textual exata (sem maiúsculas/minúsculas) e não é um critério automático de eliminação.</p></div>
              <div><b>2. Transparência salarial</b><p>Todas as vagas publicadas exibem um único valor bruto mensal em reais. Você pode filtrar por localização, modalidade, nível e salário mínimo na aba <b>Encontrar vagas</b>.</p></div>
              <div><b>3. Privacidade e consentimento</b><p>O compartilhamento de perfil em candidaturas e a visibilidade nas buscas são consentimentos independentes, registrados com data e versão em <b>Privacidade e dados</b>. Ao se candidatar, a empresa recebe apenas uma cópia instantânea (snapshot) do momento do envio.</p></div>
              <div><b>4. Ambiente de testes</b><p>Esta aplicação é um protótipo conectado ao Supabase local. Utilize apenas dados fictícios durante os testes.</p></div>
            </div>
            <div className="new-job-actions" style={{marginTop:14}}>
              {!companyMode && <button type="button" className="outline-button" onClick={()=>{setShowHelp(false);setActive("settings");}}>Ir para Privacidade</button>}
              <button type="button" className="primary-button" onClick={()=>setShowHelp(false)}>Entendi</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
    </div>
  );
}

/** Menu aninhado em 3 níveis (Área > Função principal > Cargo > Hard skills) compartilhado entre candidato e empresa. */
function HardSkillsNestedPicker({
  selectedSkills,
  onToggleSkill,
  onAddMultiple,
  compact = false,
}: {
  selectedSkills: string[];
  onToggleSkill: (skill: string) => void;
  onAddMultiple: (skills: string[]) => void;
  compact?: boolean;
}) {
  const [areaId, setAreaId] = useState(hardSkillsCatalog[0].id);
  const [fnId, setFnId] = useState(hardSkillsCatalog[0].functions[0].id);
  const [roleId, setRoleId] = useState(hardSkillsCatalog[0].functions[0].roles[0].id);
  const [search, setSearch] = useState("");

  const selectedLower = useMemo(
    () => new Set(selectedSkills.map(s => s.trim().toLocaleLowerCase("pt-BR"))),
    [selectedSkills]
  );

  const activeArea = hardSkillsCatalog.find(a => a.id === areaId) || hardSkillsCatalog[0];
  const activeFn = activeArea.functions.find(f => f.id === fnId) || activeArea.functions[0];
  const activeRole = activeFn.roles.find(r => r.id === roleId) || activeFn.roles[0];

  const selectArea = (nextAreaId: string) => {
    const area = hardSkillsCatalog.find(a => a.id === nextAreaId);
    if (!area) return;
    setAreaId(area.id);
    setFnId(area.functions[0].id);
    setRoleId(area.functions[0].roles[0].id);
  };

  const selectFn = (nextFnId: string) => {
    const fn = activeArea.functions.find(f => f.id === nextFnId);
    if (!fn) return;
    setFnId(fn.id);
    setRoleId(fn.roles[0].id);
  };

  const searchResults = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return [];
    const seen = new Set<string>();
    const results: { skill: string; path: string }[] = [];
    for (const area of hardSkillsCatalog) {
      for (const fn of area.functions) {
        for (const role of fn.roles) {
          const path = `${area.name} › ${fn.name} › ${role.name}`;
          const pathMatches = normalizeText(path).includes(q);
          for (const skill of role.skills) {
            if (pathMatches || normalizeText(skill).includes(q)) {
              const key = `${skill.toLocaleLowerCase("pt-BR")}::${role.id}`;
              if (!seen.has(key)) {
                seen.add(key);
                results.push({ skill, path });
              }
            }
          }
        }
      }
    }
    return results.slice(0, 30);
  }, [search]);

  return (
    <div className={`nested-skill-picker ${compact ? "nested-skill-picker-compact" : ""}`}>
      <div className="nested-picker-top">
        <div className="nested-breadcrumb" aria-label="Caminho selecionado">
          <span>{activeArea.name}</span>
          <ChevronRight size={12} />
          <span>{activeFn.name}</span>
          <ChevronRight size={12} />
          <b>{activeRole.name}</b>
        </div>
        <div className="nested-search-box">
          <Search size={13} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar área, cargo ou skill..."
            aria-label="Buscar no catálogo de hard skills"
          />
          {search && (
            <button type="button" aria-label="Limpar busca" onClick={() => setSearch("")}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {search.trim() ? (
        <div className="nested-search-results">
          {searchResults.length > 0 ? (
            searchResults.map((item, idx) => {
              const isSelected = selectedLower.has(item.skill.toLocaleLowerCase("pt-BR"));
              return (
                <button
                  type="button"
                  key={`${item.skill}-${idx}`}
                  className={`nested-skill-chip ${isSelected ? "is-selected" : ""}`}
                  onClick={() => onToggleSkill(item.skill)}
                  title={item.path}
                >
                  {isSelected ? <Check size={12} /> : <Plus size={12} />}
                  <span>{item.skill}</span>
                  <small>{item.path}</small>
                </button>
              );
            })
          ) : (
            <p className="local-note" style={{ margin: 0 }}>
              Nenhuma hard skill encontrada no catálogo para &ldquo;{search}&rdquo;. Você pode digitá-la abaixo como personalizada.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="nested-columns">
            <div className="nested-col">
              <div className="nested-col-title">1. Área</div>
              <div className="nested-col-list">
                {hardSkillsCatalog.map(area => (
                  <button
                    type="button"
                    key={area.id}
                    className={`nested-node ${area.id === activeArea.id ? "is-active" : ""}`}
                    onClick={() => selectArea(area.id)}
                  >
                    <span>{area.name}</span>
                    <ChevronRight size={13} />
                  </button>
                ))}
              </div>
            </div>

            <div className="nested-col">
              <div className="nested-col-title">2. Função principal</div>
              <div className="nested-col-list">
                {activeArea.functions.map(fn => (
                  <button
                    type="button"
                    key={fn.id}
                    className={`nested-node ${fn.id === activeFn.id ? "is-active" : ""}`}
                    onClick={() => selectFn(fn.id)}
                  >
                    <span>{fn.name}</span>
                    <ChevronRight size={13} />
                  </button>
                ))}
              </div>
            </div>

            <div className="nested-col">
              <div className="nested-col-title">3. Cargo / Especialidade</div>
              <div className="nested-col-list">
                {activeFn.roles.map(role => {
                  const countInRole = role.skills.filter(s => selectedLower.has(s.toLocaleLowerCase("pt-BR"))).length;
                  return (
                    <button
                      type="button"
                      key={role.id}
                      className={`nested-node ${role.id === activeRole.id ? "is-active" : ""}`}
                      onClick={() => setRoleId(role.id)}
                    >
                      <span>{role.name}</span>
                      {countInRole > 0 && <em className="nested-node-count">{countInRole}</em>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="nested-skills-tray">
            <div className="nested-tray-head">
              <span>Hard skills de <b>{activeRole.name}</b></span>
              <button type="button" className="small-link" onClick={() => onAddMultiple(activeRole.skills)}>
                <Plus size={12} /> Selecionar todas ({activeRole.skills.length})
              </button>
            </div>
            <div className="nested-skill-chips">
              {activeRole.skills.map(skill => {
                const isSelected = selectedLower.has(skill.toLocaleLowerCase("pt-BR"));
                return (
                  <button
                    type="button"
                    key={skill}
                    className={`nested-skill-chip ${isSelected ? "is-selected" : ""}`}
                    onClick={() => onToggleSkill(skill)}
                  >
                    {isSelected ? <Check size={12} /> : <Plus size={12} />}
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Tabela com checkboxes para selecionar múltiplas soft skills de forma prática como etiquetas/chips. */
function SoftSkillsTablePicker({
  selectedSkills,
  onToggleSkill,
  onSetMany,
  compact = false,
}: {
  selectedSkills: string[];
  onToggleSkill: (skill: string) => void;
  onSetMany: (skills: string[], checked: boolean) => void;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");

  const selectedLower = useMemo(
    () => new Set(selectedSkills.map(s => s.trim().toLocaleLowerCase("pt-BR"))),
    [selectedSkills]
  );

  const visibleItems = useMemo(() => {
    const q = normalizeText(search);
    return softSkillsCatalog.filter(item =>
      (category === "Todas" || item.category === category)
      && (!q || normalizeText(`${item.name} ${item.category} ${item.description}`).includes(q))
    );
  }, [search, category]);

  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every(item => selectedLower.has(item.name.toLocaleLowerCase("pt-BR")));

  return (
    <div className={`soft-table-picker ${compact ? "soft-table-picker-compact" : ""}`}>
      <div className="soft-table-toolbar">
        <div className="nested-search-box" style={{ flex: 1 }}>
          <Search size={13} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar soft skills por nome ou descrição..."
            aria-label="Filtrar tabela de soft skills"
          />
          {search && (
            <button type="button" aria-label="Limpar filtro" onClick={() => setSearch("")}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="soft-table-cats">
          {softSkillCategories.map(cat => (
            <button
              key={cat}
              type="button"
              className={`filter-chip ${category === cat ? "filter-chip-active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="soft-table-wrap">
        <table className="soft-skills-table">
          <thead>
            <tr>
              <th className="soft-col-check">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={e => onSetMany(visibleItems.map(i => i.name), e.target.checked)}
                  aria-label="Marcar ou desmarcar todas as soft skills visíveis"
                  title="Marcar ou desmarcar todas as visíveis"
                />
              </th>
              <th>Soft skill</th>
              <th>Categoria</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map(item => {
              const checked = selectedLower.has(item.name.toLocaleLowerCase("pt-BR"));
              return (
                <tr key={item.name} className={checked ? "soft-row-checked" : ""} onClick={() => onToggleSkill(item.name)}>
                  <td className="soft-col-check" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSkill(item.name)}
                      aria-label={`Selecionar ${item.name}`}
                    />
                  </td>
                  <td><b>{item.name}</b></td>
                  <td><span className="soft-cat-pill">{item.category}</span></td>
                  <td className="soft-desc-cell">{item.description}</td>
                </tr>
              );
            })}
            {visibleItems.length === 0 && (
              <tr>
                <td colSpan={4} className="soft-table-empty">Nenhuma soft skill encontrada para &ldquo;{search}&rdquo;.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Modal para informar nível (Júnior, Pleno, Sênior), tempo de experiência e comprovante de cada hard skill. */
function HardSkillDetailModal({
  skillName,
  existing,
  remainingCount,
  onClose,
  onViewProof,
  onRemove,
  onSave,
}: {
  skillName: string;
  existing?: CandidateHardSkillDetail | null;
  remainingCount: number;
  onClose: () => void;
  onViewProof: (path: string | null, fileName?: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  onSave: (input: {
    skillName: string;
    proficiency: HardSkillLevel;
    experienceMonths: number;
    proofInstitution: string;
    file: File | null;
    existing?: CandidateHardSkillDetail | null;
  }) => Promise<boolean>;
}) {
  const initialMonths = existing?.experienceMonths ?? 12;
  const [proficiency, setProficiency] = useState<HardSkillLevel>(existing?.proficiency || "junior");
  const [years, setYears] = useState(String(Math.floor(initialMonths / 12)));
  const [months, setMonths] = useState(String(initialMonths % 12));
  const [proofInstitution, setProofInstitution] = useState(existing?.proofInstitution || "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const y = Number(years || 0);
    const m = Number(months || 0);
    const totalMonths = y * 12 + m;
    if (!Number.isInteger(y) || y < 0 || y > 50 || !Number.isInteger(m) || m < 0 || m > 11 || totalMonths <= 0) {
      setError("Informe um tempo de experiência válido (ex.: 5 anos ou 6 meses).");
      return;
    }
    if (!proofInstitution.trim()) {
      setError("Informe o nome da instituição válida emissora do certificado ou comprovante.");
      return;
    }
    if (!file && !existing?.proofFileName) {
      setError("Faça o upload do documento comprobatório em formato PDF (.pdf, até 10 MB).");
      return;
    }
    if (file) {
      if (!isPdfFileName(file.name) || (file.type && !allowedProofMimeTypes.includes(file.type))) {
        setError("Formato não aceito. Envie apenas arquivos em formato PDF (.pdf).");
        return;
      }
      if (file.size > maxProofSizeBytes) {
        setError("O arquivo PDF excede o limite de 10 MB.");
        return;
      }
    }
    setBusy(true);
    const ok = await onSave({ skillName, proficiency, experienceMonths: totalMonths, proofInstitution, file, existing });
    setBusy(false);
    if (!ok) return;
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="new-job-modal" role="dialog" aria-modal="true" aria-labelledby="hs-modal-title">
        <div className="new-job-heading">
          <span className="stat-icon stat-violet"><GraduationCap size={18} /></span>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Fechar"><X size={19} /></button>
          <div>
            <h2 id="hs-modal-title">{existing ? `Editar hard skill: ${skillName}` : `Adicionar hard skill: ${skillName}`}</h2>
            <p>
              Informe o nível, o tempo de experiência nesta competência e envie o comprovante de formação ou conhecimento.
              {remainingCount > 0 ? ` (${remainingCount} outra(s) na fila)` : ""}
            </p>
          </div>
        </div>
        <form onSubmit={submit}>
          <label>
            Nível na hard skill
            <div className="level-radio-row">
              {hardSkillLevels.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`level-choice ${proficiency === opt.value ? "is-selected" : ""}`}
                  onClick={() => setProficiency(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </label>
          <div className="form-row">
            <label>
              Tempo de experiência — Anos
              <input type="number" min="0" max="50" step="1" value={years} onChange={e => setYears(e.target.value)} required />
            </label>
            <label>
              Meses adicionais (0 a 11)
              <input type="number" min="0" max="11" step="1" value={months} onChange={e => setMonths(e.target.value)} required />
            </label>
          </div>
          <label>
            Instituição emissora do certificado / formação
            <input
              value={proofInstitution}
              onChange={e => setProofInstitution(e.target.value)}
              placeholder="Ex.: FATEC, SENAI, USP, Alura, Coursera..."
              required
            />
          </label>
          <div className="proof-upload-box">
            <label>
              Documento comprobatório em PDF (certificado, diploma ou declaração)
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={e => {
                  const picked = e.target.files?.[0] || null;
                  if (!picked) {
                    setFile(null);
                    setError("");
                    return;
                  }
                  if (!isPdfFileName(picked.name) || (picked.type && !allowedProofMimeTypes.includes(picked.type))) {
                    e.target.value = "";
                    setFile(null);
                    setError("Formato não aceito. Envie apenas documentos em formato PDF (.pdf).");
                    return;
                  }
                  if (picked.size > maxProofSizeBytes) {
                    e.target.value = "";
                    setFile(null);
                    setError("O arquivo PDF excede o limite de 10 MB.");
                    return;
                  }
                  setError("");
                  setFile(picked);
                }}
              />
              <small>Aceita apenas arquivos em formato PDF (.pdf), até 10 MB. Armazenado em bucket privado com acesso restrito.</small>
            </label>
            {file && <p className="proof-selected-file"><Check size={13} /> Novo arquivo selecionado: <b>{file.name}</b> ({Math.max(1, Math.round(file.size / 1024))} KB)</p>}
            {!file && existing?.proofFileName && (
              <div className="proof-existing-row">
                <span><FileText size={13} /> Comprovante atual: <b>{existing.proofFileName}</b></span>
                <button type="button" className="small-link" onClick={() => void onViewProof(existing.proofPath, existing.proofFileName)}>Visualizar</button>
              </div>
            )}
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="new-job-actions">
            {onRemove && <button type="button" className="danger-button" disabled={busy} onClick={() => void onRemove()} style={{ marginRight: "auto" }}>Remover hard skill</button>}
            <button type="button" className="save-button" disabled={busy} onClick={onClose}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Enviando..." : remainingCount > 0 ? "Salvar e próxima" : existing ? "Salvar alterações" : "Salvar hard skill"} <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Apresenta as iniciais e aplica a classe de cor definida na vaga. */
function CompanyLogo({job}:{job:Job}) { return <span className={`company-logo logo-${job.color}`}>{job.initials}</span>; }

/** Formulário estruturado para cadastrar ou editar uma experiência profissional. */
function ExperienceForm({initial,onCancel,onSave}:{initial?:CandidateExperience|null;onCancel:()=>void;onSave:(exp:Omit<CandidateExperience,"id">&{id?:string})=>Promise<void>}) {
  const [jobTitle,setJobTitle]=useState(initial?.jobTitle||"");
  const [companyName,setCompanyName]=useState(initial?.companyName||"");
  const [employmentType,setEmploymentType]=useState(initial?.employmentType||"");
  const [city,setCity]=useState(initial?.city||"");
  const [startedOn,setStartedOn]=useState(initial?.startedOn||"");
  const [endedOn,setEndedOn]=useState(initial?.endedOn||"");
  const [isCurrent,setIsCurrent]=useState(initial?.isCurrent||false);
  const [description,setDescription]=useState(initial?.description||"");
  const [busy,setBusy]=useState(false);
  return (
    <form className="structured-form" onSubmit={async e=>{e.preventDefault();setBusy(true);await onSave({id:initial?.id,jobTitle,companyName,employmentType,city,startedOn,endedOn:isCurrent?"":endedOn,isCurrent,description});setBusy(false);}}>
      <div className="form-row">
        <label className="field-label">Cargo<input value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder="Ex.: Analista de Produto" required/></label>
        <label className="field-label">Empresa<input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Ex.: Empresa Exemplo" required/></label>
      </div>
      <div className="form-row">
        <label className="field-label">Tipo de vínculo<select value={employmentType} onChange={e=>setEmploymentType(e.target.value)}><option value="">Não informado</option><option>CLT</option><option>PJ</option><option>Estágio</option><option>Freelancer</option><option>Autônomo</option></select></label>
        <label className="field-label">Cidade<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ex.: Campinas, SP"/></label>
      </div>
      <div className="form-row">
        <label className="field-label">Início<input type="date" value={startedOn} onChange={e=>setStartedOn(e.target.value)}/></label>
        <label className="field-label">Término<input type="date" value={isCurrent?"":endedOn} onChange={e=>setEndedOn(e.target.value)} disabled={isCurrent}/></label>
      </div>
      <label className="entry-consent"><input type="checkbox" checked={isCurrent} onChange={e=>setIsCurrent(e.target.checked)}/> Trabalho atual</label>
      <label className="field-label">Atividades e resultados<textarea className="profile-textarea" value={description} onChange={e=>setDescription(e.target.value)} rows={3} placeholder="Principais entregas e responsabilidades."/></label>
      <div className="new-job-actions"><button type="button" className="outline-button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}><Check size={14}/> {initial?"Salvar experiência":"Adicionar experiência"}</button></div>
    </form>
  );
}

/** Formulário estruturado para cadastrar ou editar graduação, pós-graduação, técnico, curso ou certificação especial (com PDF opcional). */
function EducationForm({initial,onCancel,onSave}:{initial?:CandidateEducation|null;onCancel:()=>void;onSave:(edu:Omit<CandidateEducation,"id">&{id?:string;file?:File|null;removeProof?:boolean})=>Promise<void>}) {
  const [category,setCategory]=useState<EducationCategory>(initial?.category||"graduacao");
  const [institution,setInstitution]=useState(initial?.institution||"");
  const [degree,setDegree]=useState(initial?.degree||"");
  const [fieldOfStudy,setFieldOfStudy]=useState(initial?.fieldOfStudy||"");
  const [startedOn,setStartedOn]=useState(initial?.startedOn||"");
  const [endedOn,setEndedOn]=useState(initial?.endedOn||"");
  const [isCurrent,setIsCurrent]=useState(initial?.isCurrent||false);
  const [workloadHours,setWorkloadHours]=useState(initial?.workloadHours!=null?String(initial.workloadHours):"");
  const [credentialCode,setCredentialCode]=useState(initial?.credentialCode||"");
  const [expiresOn,setExpiresOn]=useState(initial?.expiresOn||"");
  const [description,setDescription]=useState(initial?.description||"");
  const [file,setFile]=useState<File|null>(null);
  const [removeProof,setRemoveProof]=useState(false);
  const [fileError,setFileError]=useState("");
  const [busy,setBusy]=useState(false);
  const activeCat = educationCategories.find(c => c.value === category) || educationCategories[0];
  return (
    <form className="structured-form" onSubmit={async e=>{
      e.preventDefault();
      if (fileError) return;
      setBusy(true);
      await onSave({
        id:initial?.id,
        category,
        institution,
        degree,
        fieldOfStudy,
        startedOn,
        endedOn:isCurrent?"":endedOn,
        isCurrent,
        workloadHours:workloadHours?Number(workloadHours):null,
        credentialCode,
        expiresOn,
        description,
        proofPath:initial?.proofPath||null,
        proofFileName:initial?.proofFileName||"",
        proofMimeType:initial?.proofMimeType||"",
        proofSizeBytes:initial?.proofSizeBytes??null,
        file,
        removeProof,
      });
      setBusy(false);
    }}>
      <div className="form-row">
        <label className="field-label">
          Tipo de registro
          <select value={category} onChange={e=>{const nextCat=e.target.value as EducationCategory;setCategory(nextCat);setDegree("");}}>
            {educationCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="field-label">
          Grau / Subtipo
          <select value={degree} onChange={e=>setDegree(e.target.value)}>
            <option value="">Selecionar...</option>
            {activeCat.degrees.map(d => <option key={d} value={d}>{d}</option>)}
            {degree && !activeCat.degrees.includes(degree) && <option value={degree}>{degree}</option>}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className="field-label">Nome do curso, formação ou certificação<input value={fieldOfStudy} onChange={e=>setFieldOfStudy(e.target.value)} placeholder="Ex.: Engenharia de Software, NR-10, AWS Solutions Architect" required/></label>
        <label className="field-label">Instituição / Entidade emissora<input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="Ex.: USP, FATEC, SENAI, PMI, CREA..." required/></label>
      </div>
      <div className="form-row">
        <label className="field-label">Início / Emissão<input type="date" value={startedOn} onChange={e=>setStartedOn(e.target.value)}/></label>
        <label className="field-label">Conclusão<input type="date" value={isCurrent?"":endedOn} onChange={e=>setEndedOn(e.target.value)} disabled={isCurrent}/></label>
      </div>
      <div className="form-row">
        <label className="field-label">Carga horária (horas, opcional)<input type="number" min="1" max="20000" step="1" value={workloadHours} onChange={e=>setWorkloadHours(e.target.value)} placeholder="Ex.: 40, 360, 3200"/></label>
        <label className="field-label">Código da credencial / Registro (opcional)<input value={credentialCode} onChange={e=>setCredentialCode(e.target.value)} placeholder="Ex.: CREA-SP 5061234, AWS-SAA-001"/></label>
      </div>
      {category === "certificacao_especial" && (
        <label className="field-label">Data de validade (opcional)<input type="date" value={expiresOn} onChange={e=>setExpiresOn(e.target.value)}/></label>
      )}
      <label className="entry-consent"><input type="checkbox" checked={isCurrent} onChange={e=>setIsCurrent(e.target.checked)}/> Em andamento</label>
      <label className="field-label">Observações / Ementa (opcional)<textarea className="profile-textarea" rows={2} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Principais tópicos, projetos ou habilitações obtidas."/></label>
      <div className="proof-upload-box">
        <label>
          Diploma ou certificado em PDF (opcional — apenas .pdf até 10 MB)
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={e => {
              const picked = e.target.files?.[0] || null;
              if (!picked) { setFile(null); setFileError(""); return; }
              if (!isPdfFileName(picked.name) || (picked.type && !allowedProofMimeTypes.includes(picked.type))) {
                e.target.value = "";
                setFile(null);
                setFileError("Formato não aceito. Envie apenas arquivo em formato PDF (.pdf).");
                return;
              }
              if (picked.size > maxProofSizeBytes) {
                e.target.value = "";
                setFile(null);
                setFileError("O arquivo PDF excede o limite de 10 MB.");
                return;
              }
              setFileError("");
              setRemoveProof(false);
              setFile(picked);
            }}
          />
          <small>Aceita exclusivamente arquivos PDF (.pdf), armazenados em bucket privado.</small>
        </label>
        {file && <p className="proof-selected-file"><Check size={13}/> PDF selecionado: <b>{file.name}</b></p>}
        {!file && !removeProof && initial?.proofFileName && (
          <div className="proof-existing-row">
            <span><FileText size={13}/> Anexo atual: <b>{initial.proofFileName}</b></span>
            <button type="button" className="small-link danger-link" onClick={()=>setRemoveProof(true)}>Remover anexo</button>
          </div>
        )}
        {fileError && <div className="form-error">{fileError}</div>}
      </div>
      <div className="new-job-actions"><button type="button" className="outline-button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}><Check size={14}/> {initial?"Salvar alterações":"Adicionar registro"}</button></div>
    </form>
  );
}

/** Formulário estruturado para cadastrar ou editar idioma com certificação e PDF opcional. */
function LanguageForm({initial,onCancel,onSave}:{initial?:CandidateLanguage|null;onCancel:()=>void;onSave:(lang:Omit<CandidateLanguage,"id">&{id?:string;file?:File|null;removeProof?:boolean})=>Promise<void>}) {
  const isPreset = !initial?.language || (commonLanguages as readonly string[]).includes(initial.language);
  const [selectedLang,setSelectedLang]=useState(isPreset ? (initial?.language || "Inglês") : "Outro");
  const [customLang,setCustomLang]=useState(isPreset ? "" : (initial?.language || ""));
  const [proficiency,setProficiency]=useState<LanguageProficiency>(initial?.proficiency||"intermediario");
  const [certification,setCertification]=useState(initial?.certification||"");
  const [file,setFile]=useState<File|null>(null);
  const [removeProof,setRemoveProof]=useState(false);
  const [fileError,setFileError]=useState("");
  const [busy,setBusy]=useState(false);
  return (
    <form className="structured-form" onSubmit={async e=>{
      e.preventDefault();
      if (fileError) return;
      const finalLanguage = selectedLang === "Outro" ? customLang.trim() : selectedLang;
      if (!finalLanguage) return;
      setBusy(true);
      await onSave({
        id:initial?.id,
        language:finalLanguage,
        proficiency,
        certification,
        proofPath:initial?.proofPath||null,
        proofFileName:initial?.proofFileName||"",
        proofMimeType:initial?.proofMimeType||"",
        proofSizeBytes:initial?.proofSizeBytes??null,
        file,
        removeProof,
      });
      setBusy(false);
    }}>
      <div className="form-row">
        <label className="field-label">
          Idioma
          <select value={selectedLang} onChange={e=>setSelectedLang(e.target.value)}>
            {commonLanguages.map(l => <option key={l} value={l}>{l}</option>)}
            <option value="Outro">Outro idioma...</option>
          </select>
        </label>
        <label className="field-label">
          Nível de fluência
          <select value={proficiency} onChange={e=>setProficiency(e.target.value as LanguageProficiency)}>
            {languageProficiencies.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
      </div>
      {selectedLang === "Outro" && (
        <label className="field-label">Informe o idioma<input value={customLang} onChange={e=>setCustomLang(e.target.value)} placeholder="Ex.: Holandês, Hebraico, Polonês..." required/></label>
      )}
      <label className="field-label">Certificação ou exame de proficiência (opcional)<input value={certification} onChange={e=>setCertification(e.target.value)} placeholder="Ex.: TOEFL iBT 98, IELTS 7.5, DELE B2, Cambridge FCE, Prolibras"/></label>
      <div className="proof-upload-box">
        <label>
          Comprovante / Certificado de idioma em PDF (opcional — apenas .pdf até 10 MB)
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={e => {
              const picked = e.target.files?.[0] || null;
              if (!picked) { setFile(null); setFileError(""); return; }
              if (!isPdfFileName(picked.name) || (picked.type && !allowedProofMimeTypes.includes(picked.type))) {
                e.target.value = "";
                setFile(null);
                setFileError("Formato não aceito. Envie apenas arquivo em formato PDF (.pdf).");
                return;
              }
              if (picked.size > maxProofSizeBytes) {
                e.target.value = "";
                setFile(null);
                setFileError("O arquivo PDF excede o limite de 10 MB.");
                return;
              }
              setFileError("");
              setRemoveProof(false);
              setFile(picked);
            }}
          />
          <small>Aceita exclusivamente arquivos PDF (.pdf), armazenados em bucket privado.</small>
        </label>
        {file && <p className="proof-selected-file"><Check size={13}/> PDF selecionado: <b>{file.name}</b></p>}
        {!file && !removeProof && initial?.proofFileName && (
          <div className="proof-existing-row">
            <span><FileText size={13}/> Anexo atual: <b>{initial.proofFileName}</b></span>
            <button type="button" className="small-link danger-link" onClick={()=>setRemoveProof(true)}>Remover anexo</button>
          </div>
        )}
        {fileError && <div className="form-error">{fileError}</div>}
      </div>
      <div className="new-job-actions"><button type="button" className="outline-button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}><Check size={14}/> {initial?"Salvar idioma":"Adicionar idioma"}</button></div>
    </form>
  );
}

/** Formulário estruturado para cadastrar ou editar intercâmbio ou vivência no exterior. */
function InternationalForm({initial,onCancel,onSave}:{initial?:CandidateInternationalExperience|null;onCancel:()=>void;onSave:(item:Omit<CandidateInternationalExperience,"id">&{id?:string})=>Promise<void>}) {
  const [experienceType,setExperienceType]=useState<InternationalExperienceType>(initial?.experienceType||"intercambio_academico");
  const [country,setCountry]=useState(initial?.country||"");
  const [city,setCity]=useState(initial?.city||"");
  const [institutionOrCompany,setInstitutionOrCompany]=useState(initial?.institutionOrCompany||"");
  const [startedOn,setStartedOn]=useState(initial?.startedOn||"");
  const [endedOn,setEndedOn]=useState(initial?.endedOn||"");
  const [isCurrent,setIsCurrent]=useState(initial?.isCurrent||false);
  const [description,setDescription]=useState(initial?.description||"");
  const [busy,setBusy]=useState(false);
  return (
    <form className="structured-form" onSubmit={async e=>{e.preventDefault();setBusy(true);await onSave({id:initial?.id,experienceType,country,city,institutionOrCompany,startedOn,endedOn:isCurrent?"":endedOn,isCurrent,description});setBusy(false);}}>
      <label className="field-label">
        Tipo de vivência internacional
        <select value={experienceType} onChange={e=>setExperienceType(e.target.value as InternationalExperienceType)}>
          {internationalExperienceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <div className="form-row">
        <label className="field-label">País<input value={country} onChange={e=>setCountry(e.target.value)} placeholder="Ex.: Canadá, Irlanda, Portugal, Alemanha..." required/></label>
        <label className="field-label">Cidade (opcional)<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ex.: Toronto, Dublin, Lisboa..."/></label>
      </div>
      <label className="field-label">Instituição, programa ou empresa (opcional)<input value={institutionOrCompany} onChange={e=>setInstitutionOrCompany(e.target.value)} placeholder="Ex.: University of Toronto, Programa Ciência sem Fronteiras..."/></label>
      <div className="form-row">
        <label className="field-label">Início<input type="date" value={startedOn} onChange={e=>setStartedOn(e.target.value)}/></label>
        <label className="field-label">Término<input type="date" value={isCurrent?"":endedOn} onChange={e=>setEndedOn(e.target.value)} disabled={isCurrent}/></label>
      </div>
      <label className="entry-consent"><input type="checkbox" checked={isCurrent} onChange={e=>setIsCurrent(e.target.checked)}/> Vivência atual</label>
      <label className="field-label">Atividades e aprendizados (opcional)<textarea className="profile-textarea" rows={2} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Idioma praticado, atividades acadêmicas ou profissionais realizadas no exterior."/></label>
      <div className="new-job-actions"><button type="button" className="outline-button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}><Check size={14}/> {initial?"Salvar vivência":"Adicionar vivência"}</button></div>
    </form>
  );
}
/**
 * Converte o texto de status em classes CSS para manter a mesma aparência nos
 * painéis. Os status não reconhecidos usam o estilo padrão de etapa ativa.
 */
/** Linha do tempo visual derivada diretamente do status atual da candidatura. */
function ApplicationTimeline({status}:{status:string}) {
  const rankMap: Record<string, number> = { "Inscrição enviada": 0, "Em análise": 1, "Teste técnico": 1, "Entrevista": 2, "Oferta": 3, "Contratado": 4 };
  const isNegative = status === "Não selecionado" || status === "Desistiu";
  const rank = rankMap[status] ?? 0;
  const finalLabel = status === "Contratado" ? "Contratado" : status === "Oferta" ? "Oferta" : status === "Desistiu" ? "Retirada" : status === "Não selecionado" ? "Encerrada" : "Resultado";
  const steps = [
    { label: "Enviada", state: "done" },
    { label: status === "Teste técnico" ? "Teste técnico" : "Em análise", state: isNegative ? "done" : rank >= 2 ? "done" : rank === 1 ? "current" : "pending" },
    { label: "Entrevista", state: isNegative ? "pending" : rank >= 3 ? "done" : rank === 2 ? "current" : "pending" },
    { label: finalLabel, state: isNegative ? "closed" : rank === 4 ? "done" : rank === 3 ? "current" : "pending" },
  ];
  return (
    <div className="timeline">
      {steps.map((step, i) => (
        <span key={step.label} style={{display:"contents"}}>
          {i > 0 && <i className={`timeline-line ${step.state === "done" || step.state === "current" ? "done-line" : ""}`} />}
          <div className={`timeline-step ${step.state}`}>
            <span>{step.state === "done" ? <Check size={12}/> : step.state === "closed" ? <X size={12}/> : step.state === "current" ? <Clock3 size={12}/> : <MessageSquareText size={12}/>}</span>
            <small>{step.label}</small>
          </div>
        </span>
      ))}
    </div>
  );
}

function Status({status}:{status:string}) { const cls=status==="Entrevista"||status==="Teste técnico"?"status-interview":status==="Rascunho"?"status-draft":status==="Em análise"||status==="Pausada"?"status-analysis":status==="Não selecionado"||status==="Desistiu"?"status-closed":status==="Inscrição enviada"||status==="Encerrada"?"status-sent":"status-active";return <span className={`status ${cls}`}><i/>{status}</span>; }
/**
 * Informa que uma lista ainda não tem registros e, quando fornecido, mostra um
 * botão para levar a pessoa à próxima ação disponível naquela tela.
 */
function EmptyState({title,text,action,onAction}:{title:string;text:string;action?:string;onAction?:()=>void}) { return <div className="empty-state"><span><Search size={22}/></span><h3>{title}</h3><p>{text}</p>{action&&<button className="primary-button" onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>; }
/**
 * Cartão reutilizado nas listas de vagas. Recebe ações por propriedades para
 * deixar busca, destaques e itens salvos compartilharem o mesmo componente.
 */
function JobCard({job,saved,applied,onSave,onOpen,horizontal=false}:{job:MatchedJob;saved:boolean;applied:boolean;onSave:()=>void;onOpen:()=>void;horizontal?:boolean}) { return <article className={`job-card ${horizontal?"job-horizontal":""}`}><div className="job-card-top"><CompanyLogo job={job}/><button className={`save-icon icon-button ${saved?"is-saved":""}`} onClick={onSave} aria-label={saved?"Remover vaga salva":"Salvar vaga"}><Heart size={17} fill={saved?"currentColor":"none"}/></button></div>{job.featured&&!horizontal&&<span className="featured-label"><Sparkles size={12}/> DADO DE DEMONSTRAÇÃO</span>}<button className="job-card-title" onClick={onOpen}>{job.role}</button><div className="job-company-line">{job.company}<span>·</span>{job.level}</div><div className="job-location"><MapPin size={14}/>{job.location}<span>·</span>{job.mode}</div><div className="job-salary"><b>{formatMonthlySalary(job.salaryMonthly)}</b></div><div className="job-tags">{job.tags.slice(0,3).map(t=><span key={t}>{t}</span>)}</div>{horizontal&&<div className="horizontal-match"><b>{job.matchedSkills.length} de {job.tags.length} competências da vaga também estão no perfil</b></div>}<div className="job-card-footer"><span className="job-posted">{job.posted}</span><span className="match-label">{job.matchReasons.length ? job.matchReasons.slice(0,2).join(" · ") : `${job.matchedSkills.length} competências coincidentes`}</span><button onClick={onOpen} className="job-open-button">{applied?"Candidatura registrada":"Consultar vaga"}<ArrowRight size={14}/></button></div></article>; }

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
  const [contractType,setContractType]=useState(initial?.contractType||"CLT");
  const [workSchedule,setWorkSchedule]=useState(initial?.workSchedule||"Comercial");
  const [workShift,setWorkShift]=useState(initial?.workShift||"5x2");
  const [isFixedLocation,setIsFixedLocation]=useState(initial?.isFixedLocation ?? true);
  const [latitude,setLatitude]=useState(initial?.latitude != null ? String(initial.latitude) : "");
  const [longitude,setLongitude]=useState(initial?.longitude != null ? String(initial.longitude) : "");
  const [description,setDescription]=useState(initial?.description||"");
  const [tags,setTags]=useState(initial?.tags.join(", ")||"");
  const [showHardMenu,setShowHardMenu]=useState(false);
  const [softSkills,setSoftSkills]=useState(initial?.softSkills?.join(", ")||"");
  const [showSoftTable,setShowSoftTable]=useState(false);
  const [benefits,setBenefits]=useState(initial?.benefits||"");
  const [error,setError]=useState("");
  const currentHardList = tags.split(",").map(t=>t.trim()).filter(Boolean);
  const currentSoftList = softSkills.split(",").map(t=>t.trim()).filter(Boolean);
  const toggleModalHardSkill = (skill: string) => {
    const exists = currentHardList.some(s => s.toLocaleLowerCase("pt-BR") === skill.toLocaleLowerCase("pt-BR"));
    const next = exists ? currentHardList.filter(s => s.toLocaleLowerCase("pt-BR") !== skill.toLocaleLowerCase("pt-BR")) : [...currentHardList, skill].slice(0, 50);
    setTags(next.join(", "));
  };
  const addManyModalHardSkills = (skills: string[]) => {
    const existing = new Set(currentHardList.map(s => s.toLocaleLowerCase("pt-BR")));
    const next = [...currentHardList, ...skills.filter(s => !existing.has(s.toLocaleLowerCase("pt-BR")))].slice(0, 50);
    setTags(next.join(", "));
  };
  const toggleModalSoftSkill = (skill: string) => {
    const exists = currentSoftList.some(s => s.toLocaleLowerCase("pt-BR") === skill.toLocaleLowerCase("pt-BR"));
    const next = exists ? currentSoftList.filter(s => s.toLocaleLowerCase("pt-BR") !== skill.toLocaleLowerCase("pt-BR")) : [...currentSoftList, skill].slice(0, 50);
    setSoftSkills(next.join(", "));
  };
  const setManyModalSoftSkills = (skills: string[], checked: boolean) => {
    const targetLower = new Set(skills.map(s => s.toLocaleLowerCase("pt-BR")));
    if (checked) {
      const existing = new Set(currentSoftList.map(s => s.toLocaleLowerCase("pt-BR")));
      setSoftSkills([...currentSoftList, ...skills.filter(s => !existing.has(s.toLocaleLowerCase("pt-BR")))].slice(0, 50).join(", "));
    } else {
      setSoftSkills(currentSoftList.filter(s => !targetLower.has(s.toLocaleLowerCase("pt-BR"))).join(", "));
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="new-job-modal" role="dialog" aria-modal="true">
        <div className="new-job-heading"><span className="stat-icon stat-violet"><Plus size={18}/></span><button className="icon-button" onClick={onClose}><X size={19}/></button><div><h2>{initial?"Editar vaga":draftOnly?"Cadastrar rascunho de vaga":"Cadastrar vaga"}</h2><p>Preencha todos os critérios essenciais para o match 100% com candidatos compatíveis.</p></div></div>
        <form onSubmit={e=>{
          e.preventDefault();
          const amount=Number(salaryMonthly);
          const hardList=tags.split(",").map(t=>t.trim()).filter(Boolean);
          const softList=softSkills.split(",").map(t=>t.trim()).filter(Boolean);
          const latVal=latitude.trim()?Number(latitude):null;
          const lngVal=longitude.trim()?Number(longitude):null;
          if(!role.trim()||!description.trim()||!location.trim()||hardList.length===0||softList.length===0){setError("Preencha cargo, local, hard skills, soft skills e descrição.");return;}
          if(!Number.isSafeInteger(amount)||amount<=0){setError("Informe um único salário mensal inteiro, maior que zero.");return;}
          if(mode==="Presencial"&&isFixedLocation&&(latVal==null||lngVal==null||Number.isNaN(latVal)||Number.isNaN(lngVal))){setError("Para vaga presencial em local fixo, informe a latitude e longitude (ou selecione uma região de referência).");return;}
          void onCreate({
            id:initial?.id||Date.now(),role:role.trim(),company:initial?.company||"Empresa demonstrativa",initials:initial?.initials||"DE",color:initial?.color||"blue",
            location:location.trim(),mode,level,salaryMonthly:amount,
            posted:initial?.posted||`Publicado em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`,
            tags:hardList,softSkills:softList,workSchedule,contractType,workShift,
            isFixedLocation:mode==="Presencial"?isFixedLocation:false,
            latitude:mode==="Presencial"&&isFixedLocation?latVal:null,
            longitude:mode==="Presencial"&&isFixedLocation?lngVal:null,
            description:description.trim(),benefits:benefits.trim(),status:initial?.status||(draftOnly?"Rascunho":"Ativa"),
          });
        }}>
          <label>Título exato da vaga<input value={role} onChange={e=>setRole(e.target.value)} placeholder="Ex.: Analista de Produto" required/></label>
          <div className="form-row">
            <label>Salário bruto mensal em reais<input type="number" min="1" step="1" inputMode="numeric" value={salaryMonthly} onChange={e=>setSalaryMonthly(e.target.value)} placeholder="Ex.: 5000" required/><small>Valor bruto mensal único em reais.</small></label>
            <label>Nível<select value={level} onChange={e=>setLevel(e.target.value)}><option>Estágio</option><option>Júnior</option><option>Pleno</option><option>Sênior</option><option>Liderança</option></select></label>
          </div>
          <div className="form-row">
            <label>Formato de trabalho<select value={mode} onChange={e=>setMode(e.target.value as Job["mode"])}>{workplaceModes.map(m=><option key={m}>{m}</option>)}</select></label>
            <label>Formato de contratação<select value={contractType} onChange={e=>setContractType(e.target.value)}>{contractTypeOptions.map(c=><option key={c}>{c}</option>)}</select></label>
          </div>
          <div className="form-row">
            <label>Horário de trabalho<select value={workSchedule} onChange={e=>setWorkSchedule(e.target.value)}>{workScheduleOptions.map(s=><option key={s}>{s}</option>)}</select></label>
            <label>Formato de escala<select value={workShift} onChange={e=>setWorkShift(e.target.value)}>{workShiftOptions.map(s=><option key={s}>{s}</option>)}</select></label>
          </div>
          <label>Local de trabalho (cidade e UF, ou abrangência remota)<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Ex.: São José dos Campos, SP" required/></label>
          {mode==="Presencial" && (
            <div className="structured-form" style={{margin:"2px 0"}}>
              <label className="entry-consent" style={{margin:"0 0 8px"}}><input type="checkbox" checked={isFixedLocation} onChange={e=>setIsFixedLocation(e.target.checked)}/> Local fixo de trabalho (aplica verificação de distância máxima do candidato)</label>
              {isFixedLocation && <>
                <label>Região de referência rápida<select defaultValue="" onChange={e=>{const p=locationPresets.find(x=>x.label===e.target.value);if(p){setLocation(`${p.city}, ${p.state}`);setLatitude(String(p.lat));setLongitude(String(p.lng));}}}><option value="">Selecionar coordenadas de exemplo...</option>{locationPresets.map(p=><option key={p.label} value={p.label}>{p.label}</option>)}</select></label>
                <div className="form-row" style={{marginTop:6}}>
                  <label>Latitude do local fixo<input type="number" step="0.0001" value={latitude} onChange={e=>setLatitude(e.target.value)} placeholder="-23.1896" required/></label>
                  <label>Longitude do local fixo<input type="number" step="0.0001" value={longitude} onChange={e=>setLongitude(e.target.value)} placeholder="-45.8841" required/></label>
                </div>
              </>}
            </div>
          )}
          <div className="modal-skills-block">
            <div className="modal-skills-head">
              <label style={{flex:1}}>Hard skills exigidas (separadas por vírgulas)<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Ex.: SQL, Power BI, Excel, Python" required/></label>
              <button type="button" className="outline-button" onClick={()=>setShowHardMenu(!showHardMenu)}>{showHardMenu ? "Ocultar menu por área" : "Selecionar por área"}</button>
            </div>
            {showHardMenu && <HardSkillsNestedPicker selectedSkills={currentHardList} onToggleSkill={toggleModalHardSkill} onAddMultiple={addManyModalHardSkills} compact />}
          </div>
          <div className="modal-skills-block">
            <div className="modal-skills-head">
              <label style={{flex:1}}>Soft skills exigidas (separadas por vírgulas)<input value={softSkills} onChange={e=>setSoftSkills(e.target.value)} placeholder="Ex.: Comunicação, Organização, Trabalho em equipe" required/></label>
              <button type="button" className="outline-button" onClick={()=>setShowSoftTable(!showSoftTable)}>{showSoftTable ? "Ocultar tabela" : "Selecionar na tabela"}</button>
            </div>
            {showSoftTable && <SoftSkillsTablePicker selectedSkills={currentSoftList} onToggleSkill={toggleModalSoftSkill} onSetMany={setManyModalSoftSkills} compact />}
          </div>
          <label>Atividades e responsabilidades objetivas<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descreva tarefas e entregas específicas." rows={4} required/></label>
          <label>Benefícios definidos<textarea value={benefits} onChange={e=>setBenefits(e.target.value)} placeholder="Informe os benefícios definidos para esta vaga." rows={2}/></label>
          <div className="salary-required-note"><ShieldCheck size={15}/> {draftOnly?"Como a empresa ainda aguarda validação administrativa, a vaga será salva como rascunho e poderá ser publicada após a aprovação.":"O valor digitado será exibido como salário mensal bruto único."}</div>
          {error&&<div className="form-error">{error}</div>}
          <div className="new-job-actions"><button type="button" className="save-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{initial?"Salvar alterações":draftOnly?"Salvar rascunho":"Cadastrar vaga"} <ArrowRight size={15}/></button></div>
        </form>
      </div>
    </div>
  );
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
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="new-job-modal assessment-modal" role="dialog" aria-modal="true" aria-labelledby="assessment-title"><div className="new-job-heading"><span className="stat-icon stat-violet"><ChartNoAxesColumnIncreasing size={18}/></span><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19}/></button><div><h2 id="assessment-title">Autoavaliação de SQL básico</h2><p>5 perguntas · resultado pessoal, sem certificação</p></div></div>{finished?<div className="assessment-complete"><span className="score-ring" style={{background:`conic-gradient(#44b886 0 ${score}%, #e6e9f0 ${score}%)`}}><div><b>{score}</b><small>%</small></div></span><h3>{score>=80?"Ótimo trabalho!":score>=60?"Bom começo!":"Continue praticando."}</h3><p>Este resultado fica salvo somente neste navegador e não foi validado por uma avaliação supervisionada.</p><button className="primary-button" onClick={()=>onComplete(score)}>Salvar resultado <Check size={15}/></button></div>:<><div className="assessment-progress"><span>Pergunta {question+1} de {sqlQuestions.length}</span><div className="progress-track"><span style={{width:((question+1)/sqlQuestions.length*100)+"%"}}/></div></div><h3 className="assessment-question">{sqlQuestions[question].prompt}</h3><div className="assessment-options">{sqlQuestions[question].choices.map((choice,index)=><button key={choice} className={answers[question]===index?"assessment-option selected-option":"assessment-option"} onClick={()=>choose(index)}><span>{String.fromCharCode(65+index)}</span>{choice}</button>)}</div><div className="new-job-actions"><button className="save-button" disabled={question===0} onClick={()=>setQuestion(question-1)}>Voltar</button>{question<sqlQuestions.length-1?<button className="primary-button" disabled={answers[question]<0} onClick={()=>setQuestion(question+1)}>Próxima <ArrowRight size={15}/></button>:<button className="primary-button" disabled={answers[question]<0} onClick={()=>setFinished(true)}>Ver resultado <ArrowRight size={15}/></button>}</div></>}</div></div>;
}

/**
 * Tela inicial que separa candidato e empregador. Os formulários criam apenas
 * perfis demonstrativos e passam os dados ao painel; não coletam senha, não
 * validam identidade e não criam contas autenticadas.
 */
const adminTables = ["auth_users", "profiles", "companies", "company_members", "skills", "candidate_skills", "candidate_hard_skills", "candidate_experiences", "candidate_educations", "candidate_languages", "candidate_international_experiences", "saved_jobs", "skill_assessments", "skill_assessment_attempts", "consent_records", "jobs", "job_skills", "applications", "application_events", "application_feedback"];
const adminPrimaryKeys: Record<string,string[]> = { auth_users:["id"], profiles:["id"], companies:["id"], company_members:["company_id","profile_id"], skills:["id"], candidate_skills:["profile_id","skill_id"], candidate_hard_skills:["id"], candidate_experiences:["id"], candidate_educations:["id"], candidate_languages:["id"], candidate_international_experiences:["id"], saved_jobs:["profile_id","job_id"], skill_assessments:["id"], skill_assessment_attempts:["id"], consent_records:["id"], jobs:["id"], job_skills:["job_id","skill_id"], applications:["id"], application_events:["id"], application_feedback:["id"] };

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
