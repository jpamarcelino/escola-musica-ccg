-- Repõe o apagar da própria conta, partido desde a migração 0021.
--
-- O que estava a acontecer: a função lia o tipo de conta de
-- "profiles.tipo", mas a 0021 mudou as colunas escolares — tipo,
-- programa, admin, super_admin — de "profiles" para "perfis_escola",
-- para "profiles" ficar a servir só identidade genérica. A função não
-- acompanhou a mudança e passou a rebentar logo na primeira linha:
--
--   ERROR: 42703: column "tipo" does not exist
--
-- Consequência: NENHUM utilizador consegue apagar a sua conta. Numa app
-- que guarda dados de menores, isso é matéria de RGPD e não só um
-- incómodo.
--
-- A correção é uma linha — ler de perfis_escola em vez de profiles. O
-- resto do corpo é reproduzido tal e qual da 0017, sem uma vírgula
-- mudada, porque "create or replace function" obriga a reescrever a
-- função inteira e não há forma de remendar só a linha. Se comparares
-- com a 0017, a única diferença é o "from public.perfis_escola".
--
-- Nota sobre o lugar onde falhava: era mesmo na primeira instrução, por
-- isso a conta nunca chegava a ser apagada nem parcialmente. Não há
-- estado meio-apagado para limpar.

create or replace function public.apagar_propria_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text;
  v_hoje date := (now() at time zone 'Europe/Lisbon')::date;
  v_chave_atual int := extract(year from v_hoje)::int * 12 + extract(month from v_hoje)::int;
  v_aluno record;
  m record;
begin
  -- ÚNICA alteração face à 0017: o tipo de conta vive em perfis_escola
  -- desde a 0021.
  select tipo into v_tipo from public.perfis_escola where id = auth.uid();

  if v_tipo = 'aluno' then
    for v_aluno in select id, nome from public.alunos where encarregado_id = auth.uid()
    loop
      for m in
        select mat.professor_id, ins.nome as instrumento_nome
        from public.matriculas mat
        left join public.instrumentos ins on ins.id = mat.instrumento_id
        where mat.aluno_id = v_aluno.id
          and mat.estado = 'confirmado'
          and mat.valor_mensal is not null
      loop
        insert into public.mensalidades (
          aluno_id, professor_id, instrumento_nome, aluno_nome, ano, mes,
          valor, pago, desistencia
        )
        select v_aluno.id, m.professor_id, m.instrumento_nome, v_aluno.nome, meses.ano, meses.mes,
               null, true, true
        from (values
          (2026,9),(2026,10),(2026,11),(2026,12),
          (2027,1),(2027,2),(2027,3),(2027,4),(2027,5),(2027,6),(2027,7),(2027,8)
        ) as meses(ano, mes)
        where meses.ano * 12 + meses.mes > v_chave_atual
        on conflict (aluno_id, professor_id, ano, mes) do nothing;
      end loop;
    end loop;
  end if;

  -- O cascade de auth.users -> profiles -> alunos.encarregado_id ->
  -- matriculas.aluno_id apaga o resto sozinho (perfis dependentes
  -- incluídos); presenças e mensalidades já geradas ficam, tal como
  -- antes.
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.apagar_propria_conta() to authenticated;
