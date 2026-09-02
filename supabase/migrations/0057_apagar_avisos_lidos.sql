-- Apagar um aviso já lido.
--
-- A caixa de entrada só crescia. Um aviso lido não tinha para onde ir, e
-- quem usa a app há um ano rola por cima de trezentas linhas que já não
-- lhe dizem nada para chegar às de ontem.
--
-- A tabela tinha "select" e "update" (marcar como lido) e mais nada — o
-- "delete" nunca existiu, por isso não é uma política a corrigir, é uma
-- que falta.
--
-- A condição "lida" não é decoração da interface repetida no servidor: é
-- onde a regra vive. Um aviso por ler é a única prova de que a app tentou
-- dizer alguma coisa a alguém, e um gesto de arrastar não pode destruir
-- essa prova antes de ela ser vista. A interface só oferece o gesto nos
-- lidos; esta linha é o que garante que continua assim quando alguém
-- chamar a API por fora.
--
-- Sem "insert" nem "update" novos: apagar não é editar. E sem apagar em
-- catadupa — cada linha é apagada pelo seu id, e a política é verificada
-- linha a linha.
create policy "Utilizador apaga os seus avisos ja lidos"
  on notificacoes for delete
  to authenticated
  using (auth.uid() = user_id and lida = true);
