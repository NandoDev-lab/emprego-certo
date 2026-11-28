-- Restringe o upload de certificados e documentos comprobatórios exclusivamente ao formato PDF.

update storage.buckets
set allowed_mime_types = array['application/pdf']
where id = 'skill-proofs';

alter table public.candidate_hard_skills
  drop constraint if exists candidate_hard_skills_proof_pdf_only;

alter table public.candidate_hard_skills
  add constraint candidate_hard_skills_proof_pdf_only check (
    (proof_mime_type is null or proof_mime_type = 'application/pdf')
    and (proof_file_name is null or lower(proof_file_name) like '%.pdf')
    and (proof_path is null or lower(proof_path) like '%.pdf')
  );

drop policy if exists "Candidates upload own skill proofs" on storage.objects;
create policy "Candidates upload own skill proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'skill-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(name) like '%.pdf'
  );

drop policy if exists "Candidates update own skill proofs" on storage.objects;
create policy "Candidates update own skill proofs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'skill-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'skill-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(name) like '%.pdf'
  );

comment on table public.candidate_hard_skills is 'Hard skills do candidato com nível (Júnior, Pleno, Sênior), tempo de experiência, instituição e comprovante privado apenas em PDF.';
