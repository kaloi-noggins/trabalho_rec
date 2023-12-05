import { Socket, Server, createServer, createConnection } from "net";
import { createSocket } from 'dgram'
import { createWriteStream, createReadStream, readFileSync, WriteStream, writeFile } from "fs";
import { HostInfo } from "./types/host";
import { join } from "path";
import { Config } from "./types/config";
import { Message } from "./types/message";
import { saveState } from "./client_routines";

// configuração de ip, porta e diretório de arquivos do cliente/servidor
const config: Config = JSON.parse(readFileSync(join(__dirname, "..", "conf", "config.json"), "utf-8"));
var clientUUID = config.clientUUID
var serverUUID = config.serverUUID
var serverIP = config.serverIP
var serverPort = config.serverPort
var knownHosts: HostInfo[] = []

var fileServer = createServer((socket) => {

    var file = ''
    var writeStream: WriteStream

    socket.on('data', (data) => {
        if (!file) {
            file = data.toString()
            console.log('file: ', file)
            writeStream = createWriteStream(join(__dirname, '..', 'downloads', file))
        } else {
            writeStream.write(data)
        }
    })

    socket.on('end', () => {
        writeStream.close()
    })

})

fileServer.listen(0, '127.0.0.1')

const channel = createSocket('udp4');

// Entry points para notificações
channel.on('message', (bufferedMessage: Buffer, remoteInfo) => {
    const message: Message = JSON.parse(bufferedMessage.toString())

    console.log("Mensagem:")
    console.log(message)
    console.log(`Host: ${remoteInfo.address}:${remoteInfo.port}`)

    const messageUUID = message.uuid
    const messageType = message.message_type
    const messagePayload = message.payload

    switch (messageType) {
        case "NOTIFY":
            switch (messagePayload) {
                case "not found":
                    console.log("arquivo não encontrado")
                    break;
                default:
                    console.log(`Mensagem mal formatada do host ${remoteInfo.address}:${remoteInfo.port}`);
                    break;
            }
            break;
        case "SET":
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
        case "DOWNLOAD":
            const downloadInfo: { ip: string, port: number, file: string } = JSON.parse(messagePayload)
            serve(downloadInfo)
            break;
        default:
            //console.log(`Mensagem mal formatada do host ${remoteInfo.address}:${remoteInfo.port}`)
            throw new Error(`Mensagem mal formatada do host ${remoteInfo.address}:${remoteInfo.port}`);
            break;
    }

});

channel.on('error', (err) => {
    console.error(`UDP server error:\n${err.stack}`);
});

channel.bind(0, '127.0.0.1')

export function listFiles() {
    const temp: Array<{ host: { ip: string, port: number }, files: string[] }> = []

    knownHosts.forEach(host => {
        temp.push({
            host: { ip: host.ip, port: host.porta },
            files: host.files
        })
    })

    return temp
}

export function greetServer() {
    const message: Message = {
        uuid: clientUUID,
        message_type: 'NOTIFY',
        payload: 'connection'
    }
    channel.send(JSON.stringify(message), serverPort, serverIP, (erro) => {
        if (erro) throw erro
    })
}

export function upload(file: string) {
    const message: Message = {
        uuid: clientUUID,
        message_type: 'UPLOAD',
        payload: file
    }

    channel.send(JSON.stringify(message), serverPort, serverIP, (erro) => {
        if (erro) throw erro
    })

    const thisHost = knownHosts.find((host) => host.uuid == clientUUID)!
    thisHost.files.push(file)

}

export function del(file: string) {
    const message: Message = {
        uuid: clientUUID,
        message_type: 'DELETE',
        payload: file
    }

    channel.send(JSON.stringify(message), serverPort, serverIP, (erro) => {
        if (erro) throw erro
    })

    const thisHost = knownHosts.find((host) => host.uuid == clientUUID)!
    thisHost.files = thisHost.files.filter((element) => element != file)
}

export function download(host: { ip: string, port: number }, file: string) {

    const downloadInfo: any = fileServer.address()
    downloadInfo.file = file

    const message: Message = {
        uuid: clientUUID,
        message_type: 'DOWNLOAD',
        payload: JSON.stringify(downloadInfo)
    }

    channel.send(JSON.stringify(message), host.port, host.ip, (erro) => {
        if (erro) throw erro
    })
}

function serve(downloadInfo: { ip: string, port: number, file: string} ) {
    const filePath: string = join(__dirname, '..', 'arquivos', downloadInfo.file)

    const tcpSocket = createConnection({ host: downloadInfo.ip, port: downloadInfo.port }, () => {
        // Manda nome do arquivo
        tcpSocket.write(downloadInfo.file)

        const readStream = createReadStream(filePath)

        readStream.on('data', (chunk) => {
            tcpSocket.write(chunk)
        })

        readStream.on('end', () => {
            tcpSocket.end()
        })
    })
}

export function disconnect() {
    const message: Message = {
        uuid: clientUUID,
        message_type: 'NOTIFY',
        payload: 'disconnnection'
    }

    channel.send(JSON.stringify(message), serverPort, serverIP, (erro) => {
        if (erro) throw erro
    })
}