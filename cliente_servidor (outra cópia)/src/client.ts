import { Socket, Server, createServer, createConnection } from "net";
import { createWriteStream, createReadStream, readFileSync, WriteStream, writeFile, ReadStream } from "fs";
import { HostInfo } from "./types/host";
import { join } from "path";
import { Config } from "./types/config";
import { Message } from "./types/message";
import { createSocket, RemoteInfo } from 'dgram'
import { saveState } from "./client_routines";
import { AsyncLocalStorage } from "async_hooks";
import getPort from 'get-port'

// configuração de ip, porta e diretório de arquivos do cliente/servidor
const config: Config = JSON.parse(readFileSync(join(__dirname, "..", "conf", "config.json"), "utf-8"));
var clientUUID = config.clientUUID
var serverUUID = config.serverUUID
var serverIP = config.serverIP
var serverPort = config.serverPort
var knownHosts: HostInfo[] = []
const localFiles: string[] = []

// Servidor utilizado para receber arquivos
const fileServer = createServer((socket) => {
    var file = ''
    var readStream: ReadStream

    socket.setTimeout(5000)
    
    socket.on('timeout', () => {
        socket.end()
    })

    socket.on('data', (data: Buffer) => {
        const message: Message = JSON.parse(data.toString())
        
        file = message.payload
        readStream = createReadStream(join(__dirname, '..', 'arquivos', file))
        readStream.on('data', (chunk) => {
            socket.write(chunk)
        })
        readStream.on('end', () => {
            readStream.close()
            socket.end() // Pensar em um jeito melhor de fazer isso
        })
    })
})

fileServer.listen(0,'127.0.0.1')

// Canal UDP
const udpChannel = createSocket('udp4')
udpChannel.on('message', (bufferedMessage: Buffer, remoteInfo: RemoteInfo) => {
    const response: Message = {
        uuid: clientUUID,
        message_type: 'NOTIFY',
        payload: JSON.stringify(fileServer.address())
    }
    udpChannel.send(JSON.stringify(response), remoteInfo.port, remoteInfo.address)
})

// Entry point para notificações do servidor estático
const staticServerChannel = createConnection({ host: serverIP, port: serverPort }, () => {
    udpChannel.bind(staticServerChannel.localPort)
})

staticServerChannel.on('data', (data) => {
    const message: Message = JSON.parse(data.toString())

    const messageUUID = message.uuid
    const messageType = message.message_type
    const messagePayload = message.payload

    switch (messageType) {
        
        case 'SET':
            // checa se a string enviada é a UUID gerada pelo servidor estático
            // ou o estado do servidor estático, usando uma das chaves do objeto
            // para disciminar as strings
            if (messagePayload.includes("status")) {
                knownHosts = JSON.parse(messagePayload)
                writeFile(join(__dirname, "..", "conf", "known_hosts.json"), JSON.stringify(knownHosts), (err) => {
                    if (err) {
                        throw err;
                    } else {
                        console.log("lista de arquivos atualizada em disco")
                    }
                })
            } else {
                clientUUID = messagePayload
                const newConfig: Config = {
                    clientUUID: clientUUID,
                    serverUUID: messageUUID,
                    serverIP: serverIP,
                    serverPort: serverPort
                }
                writeFile(join(__dirname, "..", "conf", "config.json"), JSON.stringify(newConfig), (err) => {
                    if (err) {
                        console.error(err)
                    } else {
                        console.log("configuração do cliente atualizada em disco")
                    }
                })
            }
            break;
        default:
            break
    }
})

export function listFiles() {
    const temp: Array<{ host: { ip: string, port: number }, files: string[] }> = []

    knownHosts.forEach(host => {
        if ( host.status == 'online' ) {
            temp.push({
                host: { ip: host.ip, port: host.porta },
                files: host.files
            })
        }
    })

    return temp
}

export function upload(file: string) {
    const message: Message = {
        uuid: clientUUID,
        message_type: 'UPLOAD',
        payload: file
    }

    staticServerChannel.write(JSON.stringify(message))
    localFiles.push(file)
}

export function del(file: string) {
    const message: Message = {
        uuid: clientUUID,
        message_type: 'DELETE',
        payload: file
    }

    staticServerChannel.write(JSON.stringify(message))
    const index = localFiles.indexOf(file)
    localFiles.splice(index, 1)
}

export async function download(host: { ip: string, port: number }, file: string) {
    
   const response = await getFileServerInfo(host)
   const writeStream = createWriteStream(join(__dirname, '..', 'downloads', file))
   const fileServerInfo = JSON.parse(response.payload)
   const tcpSocket = createConnection({ host: fileServerInfo.ip, port: fileServerInfo.port })

   tcpSocket.on('data', (chunk: Buffer) => {
       writeStream.write(chunk)
   })

   tcpSocket.on('end', () => { // Implementar de uma maneira mais segura
       writeStream.close()
       tcpSocket.end()
   })

   const message: Message = {
        uuid: clientUUID,
        message_type: 'DOWNLOAD',
        payload: file
   }

   tcpSocket.write(JSON.stringify(message))

}

export function greetServer() {
    const message: Message = {
        uuid: clientUUID,
        message_type: 'NOTIFY',
        payload: 'connection'
    }
    staticServerChannel.write(JSON.stringify(message))
}

async function getFileServerInfo(host: { ip: string, port: number }): Promise<Message> {
    return new Promise((resolve, reject) => {
        const udpSocket = createSocket('udp4')

        udpSocket.on('message', (bufferedMessage: Buffer, remoteInfo: RemoteInfo) => {
            const message: Message = JSON.parse(bufferedMessage.toString())
            resolve(message)
        })

        udpSocket.bind(0)
        
        const message: Message = {
            uuid: clientUUID,
            message_type: 'NOTIFY',
            payload: 'request file server'
        }

        udpSocket.send(JSON.stringify(message), host.port, host.ip)
        
        const timeoutId = setTimeout(() => {
            udpSocket.close()
            reject('Timeout')
        }, 10000)

    })
}