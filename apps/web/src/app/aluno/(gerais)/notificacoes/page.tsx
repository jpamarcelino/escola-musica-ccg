import { redirect } from 'next/navigation'

// Os avisos mudaram-se para /dashboard/avisos: pertencem à Conta CCG e não
// a um aluno, e estar debaixo de /aluno dava a entender o contrário.
//
// Esta rota fica como redirecionamento porque o endereço já circulou —
// está em avisos por email antigos e em separadores guardados. É
// permanente: não há aqui nada para ver, nem volta a haver.
export default function NotificacoesPage() {
  redirect('/dashboard/avisos')
}
