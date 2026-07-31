-- Novo "programa": Música para bebés, com duas disciplinas/faixas etárias
-- (0 aos 3 anos e 3 aos 5 anos) em vez de instrumentos concretos. A faixa
-- fica guardada no próprio nome, no mesmo formato "X aos Y" já lido por
-- parseFaixaEtaria() (src/lib/idade-disciplinas.ts).

alter table instrumentos drop constraint instrumentos_programa_check;
alter table instrumentos add constraint instrumentos_programa_check
  check (programa = any (array['musica', 'danca', 'bebes']));

insert into instrumentos (nome, programa, imagem_url) values
  ('0 aos 3 anos', 'bebes', '/instrumentos/bebes-3-5.png'),
  ('3 aos 5 anos', 'bebes', '/instrumentos/bebes-0-3.png');
