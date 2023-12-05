import { Socket } from "net"

/**
 * Host conhecido pelo servidor. 
 * 
 * Para gerar a UUID, utilize randomUUID() do pacote crypto.
 * 
 * Para gerar o timestamp em lastOnline, utilize 
 * 
 * @example
 * import { randomUUID } from "crypto";
 * 
 * const uuid = randomUUID()
 * const date = new Date().toISOString()
 * 
 * const newHost:Host = {
 *  status:"online",
 *  hostname:"exemplo",
 *  uuid:uuid,
 *  ip:"127.0.0.1",
 *  porta:"9000",
 *  files: ["arquivo1.txt", "imagem.png"],
 *  lastOnline: date
 * }
 * 
 */
export type HostInfo = {
    status: "online" | "offline",
    uuid: string,
    ip: string,
    porta: number,
    files: string[],
    lastOnline: string
}