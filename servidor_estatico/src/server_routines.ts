import { createSocket } from "dgram";
import { ActiveConnection, HostInfo } from "./types/host";
import { Message } from "./types/message";
import { writeFile } from "fs";
import { join } from "path";
import { Socket } from "net";

/**
 * 
 * Função que propaga o estado atual conhecido pelo servidor estático para os demais clientes/servidores
 * 
 * @param connectedHosts Lista de Clientes/Servidores conectados atualmente ao Servidor Estático
 * @param serverUuid UUID do Servidor Estático
 * @param knowHosts Lista com o estado atual de todos os Clientes/Servidores
 * 
 */
export async function propagate(serverUuid: string, knowHosts: HostInfo[]) {

    // cria o socket UDP para envio da mensagem
    const socket = createSocket('udp4')

    try {
        knowHosts.forEach((host) => {
            const updateMessage: Message = {
                uuid: serverUuid,
                message_type: "SET",
                payload: JSON.stringify(knowHosts)
            }
            socket.send(JSON.stringify(updateMessage), host.porta, host.ip, (err) => {
                if (err) {
                    console.log(err)
                }
            })
        })
        return "estado dos clientes/servidores atualizado"
    } catch (error) {
        return error
    }

}

export async function propagate_TCP(serverUUID: string, knowHosts: HostInfo[], activeConnections: Socket[]) {
    activeConnections.forEach(socket => {

        const updateMessage: Message = {
            uuid: serverUUID,
            message_type: "SET",
            payload: JSON.stringify(knowHosts)
        }
        
        socket.write(JSON.stringify(updateMessage))
    })
}


/**
 * Envia uma mesnagem do tipo NOTIFY a algum Cliente/Servidor
 * @param host Cliente/Servidor a ser notificado
 * @param serverUuid UUID do Servidor Estático
 * @param message_payload Corpo da notificação
 */
export async function NOTIFY(host: Socket, serverUuid: string, message_payload: string) {
    try {
        const newMessage: Message = {
            uuid: serverUuid,
            message_type: "NOTIFY",
            payload: message_payload
        }
        host.write(JSON.stringify(newMessage))
    } catch (error) {
        console.log(error)
    }
}

/**
 * Atualiza o estado da lista de Clientes/Servidores cohecidos pelo Servidor Estático em disco
 * @param knownHosts List de Clientes/Servidores em memória
 */
export async function saveState(knownHosts: HostInfo[]) {
    // atualiza a lista em disco
    writeFile(join(__dirname, "..", "conf", "known_hosts.json"), JSON.stringify(knownHosts), (err) => {
        if (err) {
            console.error(err)
        } else {
            console.log("lista de arquivos atualizada em disco")
        }
    })
}