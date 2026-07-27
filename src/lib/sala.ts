export type Sala = {
  nome: string
  piso: number | null
  numero: number | null
}

// O nome guardado na base de dados inclui o dono, para ser inequívoco lá
// (ex: "Sala 1 — Piso 3 (João Marcelino)"). Aqui mostra-se só o essencial.
export function formatarSala(sala: Sala | null): string | null {
  if (!sala) return null
  if (sala.piso !== null && sala.numero !== null) {
    return `Sala ${sala.numero}, Piso ${sala.piso}`
  }
  return sala.nome
}
