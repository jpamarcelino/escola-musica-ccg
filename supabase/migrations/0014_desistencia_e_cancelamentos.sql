-- Um aluno passa a poder cancelar a sua própria matrícula já confirmada
-- (não só um pedido pendente, como já era possível).
create policy "Aluno cancela a sua matrícula confirmada"
  on matriculas for delete
  to authenticated
  using (auth.uid() = aluno_id and estado = 'confirmado');

-- Histórico de mensalidades: até agora, quando um aluno apagava a conta,
-- mensalidades.aluno_id ficava a null (0008_historico_mensalidades.sql) —
-- o registo sobrevivia na tabela, mas ficava impossível de agrupar por
-- aluno ou até de mostrar (a tabela de histórico já não conseguia dizer
-- de quem era). Passa a guardar-se o nome do aluno diretamente (tal como
-- já se guardava o nome do instrumento) e o aluno_id deixa de se desligar
-- ao apagar a conta — fica como um identificador histórico, sem
-- constraint de integridade referencial viva.
alter table mensalidades add column aluno_nome text;
update mensalidades men set aluno_nome = p.nome from profiles p where p.id = men.aluno_id;

alter table mensalidades drop constraint mensalidades_aluno_id_fkey;

-- Marca uma célula do histórico como "DT" (desistência) em vez de real —
-- sem valor a cobrar, só a indicar que o aluno saiu nesse mês em diante.
alter table mensalidades add column desistencia boolean not null default false;
alter table mensalidades alter column valor drop not null;

-- Apaga a própria conta (chamada pela app através de rpc, com a sessão do
-- próprio utilizador — só assim consegue apagar de auth.users, que a app
-- não tem permissões para tocar diretamente).
--
-- Quando é um aluno a apagar-se: o mês corrente já deve ter mensalidade
-- gerada (dia 1) e essa sobrevive sozinha (só o vínculo à matrícula se
-- desliga, o registo fica). Para os meses seguintes do ano letivo, em vez
-- de desaparecerem da tabela de histórico sem explicação — o que parece
-- um esquecimento do admin — ficam marcados como "DT", um por cada
-- disciplina/professor que o aluno tinha confirmada com valor definido.
create or replace function public.apagar_propria_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text;
  v_nome text;
  v_hoje date := (now() at time zone 'Europe/Lisbon')::date;
  v_chave_atual int := extract(year from v_hoje)::int * 12 + extract(month from v_hoje)::int;
  m record;
begin
  select tipo, nome into v_tipo, v_nome from public.profiles where id = auth.uid();

  if v_tipo = 'aluno' then
    for m in
      select mat.professor_id, ins.nome as instrumento_nome
      from public.matriculas mat
      left join public.instrumentos ins on ins.id = mat.instrumento_id
      where mat.aluno_id = auth.uid()
        and mat.estado = 'confirmado'
        and mat.valor_mensal is not null
    loop
      insert into public.mensalidades (
        aluno_id, professor_id, instrumento_nome, aluno_nome, ano, mes,
        valor, pago, desistencia
      )
      select auth.uid(), m.professor_id, m.instrumento_nome, v_nome, meses.ano, meses.mes,
             null, true, true
      from (values
        (2026,9),(2026,10),(2026,11),(2026,12),
        (2027,1),(2027,2),(2027,3),(2027,4),(2027,5),(2027,6),(2027,7),(2027,8)
      ) as meses(ano, mes)
      where meses.ano * 12 + meses.mes > v_chave_atual
      on conflict (aluno_id, professor_id, ano, mes) do nothing;
    end loop;
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;
