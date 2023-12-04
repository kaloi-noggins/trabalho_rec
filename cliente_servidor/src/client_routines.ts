import { writeFile } from "fs"
import { join } from "path"
import { HostInfo } from "./types/host"
import { Config } from "./types/config"
import { Server } from "net"

/**
 * Atualiza o estado da lista de Clientes/Servidores cohecidos pelo Cliente/Servidor
 * ou as configurações dele em disco
 * @param knownHosts List de Clientes/Servidores em memória
 */
export async function saveState(data: Config | HostInfo[], filename: string) {
    // atualiza a lista em disco
    writeFile(join(__dirname, "..", "conf", filename), JSON.stringify(data), (err) => {
        if (err) {
            console.error(err)
        } else {
            console.log("arquivos atualizada em disco")
        }
    })
}

/**
 * Inicializa o listener do Cliente/Servidor se ele estiver propriamente
 * configurado pelo Servidor Estático
 */
export async function startClientServer(hostIP: string, hostPort: number, clientServer: Server) {
    if (hostIP && hostPort) {
        clientServer.listen(hostPort, hostIP, () => {
            console.log(`Cliente Servidor escutando em ${hostIP}:${hostPort}`)
        })
    }
}