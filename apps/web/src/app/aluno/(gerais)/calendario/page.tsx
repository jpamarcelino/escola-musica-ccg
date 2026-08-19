import { redirect } from 'next/navigation'

// O calendário passou a ser um só, em /dashboard/calendario: é o mesmo
// ano letivo para as famílias e para os professores, e mantê-lo em duas
// rotas era garantir que um dia divergiam. Esta rota fica a apontar para
// lá — havia ligações antigas para aqui.
export default function CalendarioEscolarPage() {
  redirect('/dashboard/calendario')
}
