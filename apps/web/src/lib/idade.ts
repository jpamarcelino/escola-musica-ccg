// Guardamos a data de nascimento (e não a idade em número) para que a idade
// esteja sempre correta — as turmas de dança são por escalões etários.
export function calcularIdade(dataNascimento: string | null | undefined): number | null {
  if (!dataNascimento) return null
  const nascimento = new Date(`${dataNascimento}T00:00:00`)
  if (Number.isNaN(nascimento.getTime())) return null

  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const aindaNaoFezAnos =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())
  if (aindaNaoFezAnos) idade -= 1

  return idade
}
