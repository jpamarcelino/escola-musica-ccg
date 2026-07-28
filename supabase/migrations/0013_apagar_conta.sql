-- Permite a qualquer conta apagar-se a si própria (botão "Apagar conta" na
-- app). Isto tem de ser feito com uma função "security definer" porque só
-- o Supabase (via service role) consegue apagar diretamente de auth.users
-- — a app nunca tem essa chave, só a anon key.
--
-- Apagar auth.users cascateia (profiles.id -> auth.users.id on delete
-- cascade) até profiles, e daí até matrículas, disponibilidades,
-- horários e instrumentos do professor. O histórico de mensalidades já
-- sobrevive a isto (0008_historico_mensalidades.sql desligou o cascade).
-- O histórico de presenças ainda não — corrige-se abaixo.
create or replace function public.apagar_propria_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.apagar_propria_conta() to authenticated;

-- Histórico de presenças: tal como as mensalidades, tem de sobreviver a
-- uma conta (aluno ou professor) ser apagada — só o vínculo à matrícula
-- (e às contas) se desliga, o registo em si fica. Guardamos aluno_id,
-- professor_id e o nome do instrumento diretamente na presença para o
-- registo continuar a fazer sentido mesmo que a matrícula (ou as contas)
-- deixem de existir.
alter table presencas add column aluno_id uuid references profiles(id) on delete set null;
alter table presencas add column professor_id uuid references profiles(id) on delete set null;
alter table presencas add column instrumento_nome text;

update presencas p
set aluno_id = m.aluno_id,
    professor_id = m.professor_id,
    instrumento_nome = i.nome
from matriculas m
left join instrumentos i on i.id = m.instrumento_id
where p.matricula_id = m.id;

alter table presencas drop constraint presencas_matricula_id_fkey;
alter table presencas alter column matricula_id drop not null;
alter table presencas add constraint presencas_matricula_id_fkey
  foreign key (matricula_id) references matriculas(id) on delete set null;
