/**
 * Arquivo de configuração do Cliente/Servidor
 */
export type Config = {
    hostUUID: string|null,
    hostIP: string|null,
    hostPort: number|null,
    serverUUID: string|null,
    serverIP: string,
    serverPort: number,
    filePath: string|null
}