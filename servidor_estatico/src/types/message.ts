/**
 * Cabeçalho da troca de mensagem entre Cliente/Servidor e Servidor Estático
 */
export type Message = {
    uuid: string|null,
    message_type: "NOTIFY"|"SET"|"UPLOAD"|"DOWNLOAD"|"DELETE",
    payload: string
}