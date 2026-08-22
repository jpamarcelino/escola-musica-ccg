-- O professor propõe um horário à escolha dele dentro de um pedido.
--
-- O caso real: a mãe escolheu três horas no assistente, o professor não
-- pode nenhuma delas, telefonam um ao outro e combinam outra. Até aqui a
-- app não tinha caminho para isso — a própria página de pedidos dizia ao
-- professor "combina por telefone e cria o horário em Horários", e
-- depois ele confirmava uma hora que a família nunca tinha visto no ecrã.
-- Funcionava por acordo verbal e não deixava rasto.
--
-- Não há tabela nova. A `propostas_horario` (0037) já é exatamente isto
-- — o professor propõe, a família aceita ou recusa, os dois são avisados
-- — só que estava fechada a matrículas confirmadas, para servir a
-- mudança de horário a meio do ano. Abre-se ao pedido ainda por
-- responder. Uma segunda tabela com os mesmos quatro estados e as mesmas
-- duas respostas seria a mesma coisa escrita duas vezes, e as duas
-- divergiriam à primeira correção.
--
-- O horário NÃO fica reservado enquanto espera resposta. É a regra que a
-- app já segue nas outras propostas e nas reposições, e é deliberada:
-- vagas reservadas à espera de respostas que nunca chegam entopem a
-- grelha. Quem aceitar primeiro fica com a hora; ao segundo é explicado
-- porquê, em vez de ficar com uma aula sobreposta.

begin;

-- ---------------------------------------------------------------------
-- 1. Propor um horário que já existe
-- ---------------------------------------------------------------------
create or replace function public.propor_horario(
  p_matricula_id bigint,
  p_horario_id bigint,
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_m record;
  v_h record;
  v_encarregado uuid;
  v_aluno_nome text;
  v_instrumento text;
  v_id bigint;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  select * into v_m from matriculas where id = p_matricula_id;
  -- Duas condições numa só mensagem, e de propósito: dizer "essa
  -- matrícula não é tua" confirmaria a quem passasse números à sorte que
  -- ela existe.
  if not found or v_m.professor_id <> v_quem then
    raise exception 'Aluno não encontrado entre os teus.';
  end if;

  -- A abertura desta migração. Antes só 'confirmado'; agora também o
  -- pedido por responder, que é o caso novo.
  if v_m.estado not in ('confirmado', 'a_escolher') then
    raise exception 'Esta matrícula já não está ativa.';
  end if;

  select * into v_h from horarios where id = p_horario_id;
  if not found or v_h.professor_id <> v_quem then
    raise exception 'Horário não encontrado.';
  end if;
  if v_h.id is not distinct from v_m.horario_final_id then
    raise exception 'É o horário que o aluno já tem.';
  end if;

  -- Um horário que já tem lá alguém não se propõe. Não é reserva: é não
  -- prometer o que já está dado.
  if exists (
    select 1 from matriculas outra
    where outra.horario_final_id = p_horario_id
      and outra.estado = 'confirmado'
      and outra.id <> p_matricula_id
  ) then
    raise exception 'Esse horário já tem outro aluno.';
  end if;

  -- E não basta a vaga em si estar livre: uma vaga das 17:30 é inútil se
  -- o professor já tem alguém das 17:00 às 18:00. A app permite criar
  -- horários que se sobrepõem entre si, por isso a colisão tem de ser
  -- procurada no tempo e não pelo identificador da vaga.
  if exists (
    select 1
    from matriculas outra
    join horarios ho on ho.id = outra.horario_final_id
    where outra.professor_id = v_quem
      and outra.estado = 'confirmado'
      and outra.id <> p_matricula_id
      and ho.dia_semana = v_h.dia_semana
      and ho.hora_inicio < v_h.hora_fim
      and ho.hora_fim > v_h.hora_inicio
  ) then
    raise exception 'Já tens outra aula confirmada a essa hora.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_m.aluno_id;
  select i.nome into v_instrumento from instrumentos i where i.id = v_m.instrumento_id;

  -- Substitui uma proposta anterior por responder: o professor mudou de
  -- ideias, e a família só deve ver a última. É também o que impede duas
  -- propostas abertas para o mesmo aluno — duas perguntas contraditórias
  -- na mesma caixa de entrada.
  update propostas_horario
  set estado = 'cancelada', respondido_em = now()
  where matricula_id = p_matricula_id and estado = 'pendente';

  insert into propostas_horario (
    matricula_id, aluno_id, professor_id,
    horario_atual_id, horario_novo_id, mensagem
  )
  values (
    p_matricula_id, v_m.aluno_id, v_quem,
    v_m.horario_final_id, p_horario_id,
    nullif(btrim(coalesce(p_mensagem, '')), '')
  )
  returning id into v_id;

  -- Duas mensagens porque são duas situações. Num pedido novo não há
  -- horário "de onde vem", e escrever "propôs mudar" a quem ainda nem
  -- tem aula é uma frase que não quer dizer nada.
  insert into notificacoes (user_id, aluno_id, tipo, mensagem)
  values (
    v_encarregado, v_m.aluno_id, 'proposta_horario',
    case
      when v_m.estado = 'a_escolher' then
        format(
          'O professor propôs um horário para %s (%s): %s, %s–%s. Precisa da tua resposta.',
          v_aluno_nome, coalesce(v_instrumento, 'aulas'),
          v_h.dia_semana,
          to_char(v_h.hora_inicio, 'HH24:MI'), to_char(v_h.hora_fim, 'HH24:MI')
        )
      else
        format(
          'O professor propôs outro horário para %s (%s): %s, %s–%s. Precisa da tua resposta.',
          v_aluno_nome, coalesce(v_instrumento, 'aulas'),
          v_h.dia_semana,
          to_char(v_h.hora_inicio, 'HH24:MI'), to_char(v_h.hora_fim, 'HH24:MI')
        )
    end
  );

  return v_id;
end;
$$;

grant execute on function public.propor_horario(bigint, bigint, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Propor uma hora que ainda não existe na grelha
-- ---------------------------------------------------------------------
--
-- Quando a hora combinada ao telefone não corresponde a nenhuma vaga
-- aberta, o professor escreveria o dia e as horas na página de Horários,
-- voltaria ao pedido e proporia. São três passos e duas páginas para uma
-- decisão só. Esta função faz o mesmo numa chamada.
--
-- Cria a vaga como qualquer outra, e não como um horário especial: no
-- fim disto o professor tem na grelha uma vaga igual às que criou à mão,
-- que continua a servir para o ano todo.
create or replace function public.propor_horario_novo(
  p_matricula_id bigint,
  p_dia_semana text,
  p_hora_inicio time,
  p_hora_fim time,
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_horario_id bigint;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;
  if p_dia_semana not in ('Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo') then
    raise exception 'Dia da semana inválido.';
  end if;
  if p_hora_fim <= p_hora_inicio then
    raise exception 'A hora de fim tem de ser depois da de início.';
  end if;

  -- Reaproveita a vaga se ela já existir, em vez de estoirar contra o
  -- índice único. O professor não tem de saber de cor o que já criou —
  -- escrever a mesma hora duas vezes é normal e não é um erro dele.
  insert into horarios (professor_id, dia_semana, hora_inicio, hora_fim)
  values (v_quem, p_dia_semana, p_hora_inicio, p_hora_fim)
  on conflict (professor_id, dia_semana, hora_inicio, hora_fim) do nothing
  returning id into v_horario_id;

  if v_horario_id is null then
    select id into v_horario_id
    from horarios
    where professor_id = v_quem
      and dia_semana = p_dia_semana
      and hora_inicio = p_hora_inicio
      and hora_fim = p_hora_fim;
  end if;

  -- A validação toda vive na propor_horario: o dono da matrícula, o dono
  -- do horário, a vaga já ocupada, a sobreposição na agenda, a proposta
  -- anterior por cancelar e o aviso. Repeti-la aqui era garantir que as
  -- duas cópias divergiam.
  return public.propor_horario(p_matricula_id, v_horario_id, p_mensagem);
end;
$$;

grant execute on function public.propor_horario_novo(bigint, text, time, time, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Aceitar: agora também confirma um pedido
-- ---------------------------------------------------------------------
create or replace function public.aceitar_proposta_horario(p_proposta_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_p record;
  v_m record;
  v_h record;
  v_encarregado uuid;
  v_aluno_nome text;
  v_instrumento text;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  select * into v_p from propostas_horario where id = p_proposta_id;
  if not found then
    raise exception 'Proposta não encontrada.';
  end if;
  if v_p.estado <> 'pendente' then
    raise exception 'Esta proposta já foi respondida.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_p.aluno_id;

  if v_quem is distinct from v_encarregado then
    raise exception 'Sem permissão para responder a esta proposta.';
  end if;

  -- `for update` porque entre propor e aceitar pode ter passado uma
  -- semana, e a vaga não estava reservada. Quem chega primeiro fica com
  -- ela; o segundo tem de levar com um "já não está livre" e não com
  -- duas matrículas na mesma hora.
  select * into v_h from horarios where id = v_p.horario_novo_id for update;
  if not found then
    raise exception 'Esse horário já não existe.';
  end if;

  select * into v_m from matriculas where id = v_p.matricula_id;
  if not found then
    raise exception 'Essa inscrição já não existe.';
  end if;
  if v_m.estado not in ('confirmado', 'a_escolher') then
    raise exception 'Essa inscrição já não está ativa.';
  end if;

  if exists (
    select 1 from matriculas outra
    where outra.horario_final_id = v_p.horario_novo_id
      and outra.estado = 'confirmado'
      and outra.id <> v_p.matricula_id
  ) then
    raise exception 'Esse horário entretanto ficou ocupado. Fala com o professor.';
  end if;

  -- A mesma verificação de sobreposição da proposta, refeita agora. Não
  -- é zelo a mais: como a vaga não fica reservada, o professor pode ter
  -- preenchido uma hora que colide com esta enquanto a resposta não
  -- chegava.
  if exists (
    select 1
    from matriculas outra
    join horarios ho on ho.id = outra.horario_final_id
    where outra.professor_id = v_p.professor_id
      and outra.estado = 'confirmado'
      and outra.id <> v_p.matricula_id
      and ho.dia_semana = v_h.dia_semana
      and ho.hora_inicio < v_h.hora_fim
      and ho.hora_fim > v_h.hora_inicio
  ) then
    raise exception 'O professor entretanto ficou com outra aula a essa hora. Fala com ele.';
  end if;

  -- O mesmo aluno não pode estar em dois sítios à mesma hora — a regra
  -- que já existe ao confirmar um pedido, aplicada também aqui.
  if exists (
    select 1
    from matriculas outra
    join horarios ho on ho.id = outra.horario_final_id
    where outra.aluno_id = v_p.aluno_id
      and outra.estado = 'confirmado'
      and outra.id <> v_p.matricula_id
      and ho.dia_semana = v_h.dia_semana
      and ho.hora_inicio < v_h.hora_fim
      and ho.hora_fim > v_h.hora_inicio
  ) then
    raise exception 'O aluno tem outra aula a essa hora.';
  end if;

  -- Aceitar um pedido é confirmá-lo. Numa mudança de horário a matrícula
  -- já está confirmada e só muda de vaga; num pedido, este é o momento em
  -- que ele deixa de estar à espera.
  update matriculas
  set horario_final_id = v_p.horario_novo_id,
      estado = 'confirmado'
  where id = v_p.matricula_id;

  -- O horário antigo volta a abrir. Ao contrário do cancelamento (0029),
  -- que o deixa bloqueado, aqui foi o professor que quis a mudança — e
  -- quem liberta uma hora de propósito quer poder preenchê-la.
  if v_m.horario_final_id is not null and v_m.horario_final_id <> v_p.horario_novo_id then
    if not exists (
      select 1 from matriculas outra
      where outra.horario_final_id = v_m.horario_final_id
        and outra.estado = 'confirmado'
        and outra.id <> v_p.matricula_id
    ) then
      update horarios set estado = 'aberto' where id = v_m.horario_final_id;
    end if;
  end if;

  update propostas_horario
  set estado = 'aceite', respondido_em = now()
  where id = p_proposta_id;

  select i.nome into v_instrumento from instrumentos i where i.id = v_m.instrumento_id;

  insert into notificacoes (user_id, tipo, mensagem)
  values (
    v_p.professor_id, 'proposta_aceite',
    case
      when v_m.estado = 'a_escolher' then
        format(
          '%s aceitou o horário proposto para %s: %s, %s–%s. A inscrição está confirmada.',
          v_aluno_nome, coalesce(v_instrumento, 'aulas'), v_h.dia_semana,
          to_char(v_h.hora_inicio, 'HH24:MI'), to_char(v_h.hora_fim, 'HH24:MI')
        )
      else
        format(
          '%s aceitou o novo horário: %s, %s–%s.',
          v_aluno_nome, v_h.dia_semana,
          to_char(v_h.hora_inicio, 'HH24:MI'), to_char(v_h.hora_fim, 'HH24:MI')
        )
    end
  );
end;
$$;

grant execute on function public.aceitar_proposta_horario(bigint) to authenticated;

-- ---------------------------------------------------------------------
-- 4. O título da push
-- ---------------------------------------------------------------------
--
-- Era "Mudança de horário", que deixou de estar certo: numa proposta
-- feita dentro de um pedido não há horário nenhum a ser mudado. O título
-- vive na `tipos_aviso` e é um por tipo, não um por aviso, portanto tem
-- de servir os dois casos — e "Proposta de horário" serve, enquanto
-- "Mudança" só servia um deles.
update tipos_aviso set titulo = 'Proposta de horario' where tipo = 'proposta_horario';

commit;
