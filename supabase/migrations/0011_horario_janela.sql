-- Limpa o horário fora de horas que já lá estava (Jean Pierre, Segunda
-- 01:45–02:35, sem nenhum aluno confirmado — seguro apagar).
delete from horarios where id = 226 and hora_inicio = '01:45:00';

-- Proteção ao nível da base de dados: o Centro Cultural só abre das 10h
-- às 22h. A app já valida isto antes de inserir, mas esta restrição
-- garante que nunca entra um horário disparatado, mesmo por fora da app.
alter table horarios add constraint horarios_dentro_do_horario_de_abertura
  check (hora_inicio >= '10:00' and hora_fim <= '22:00');
