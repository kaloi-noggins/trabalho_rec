import { readFileSync } from "fs";
import { join } from "path";
import { Config } from "./types/config";
import { HostInfo, ActiveConnection } from "./types/host";
import { Message } from "./types/message";
import { randomUUID } from "crypto";
import { NOTIFY, propagate, propagate_TCP, saveState } from "./server_routines";
import { createServer, Socket } from "net";
import { deepStrictEqual } from "assert";


// configuração de ip e porta do servidor estático e leitura da lista de hosts conhecidos e suas configurações
const config: Config = JSON.parse(readFileSync(join(__dirname, "..", "conf", "config.json"), "utf-8"));
const serverUUID = config.uuid;
const serverPort = config.port;
const serverIp = config.ip;

const knowHosts: HostInfo[] = JSON.parse(
  readFileSync(join(__dirname, "..", "conf", "known_hosts.json"), "utf-8")
);

const activeConnections: Socket[] = []

// criação do socket de troca de mensagens entre Servidor Estático e Cliente/Servidor
const server = createServer((socket) => {

  const remoteIp = socket.remoteAddress!
  const remotePort = socket.remotePort!
  const newActiveConnection: ActiveConnection = {
    socket: socket,
    ip: remoteIp,
    port: remotePort
  }
  //activeConnections.push(newActiveConnection)
  activeConnections.push(socket)
  socket.setKeepAlive(true, 5000)
  socket.on('end', () => {
    disconnectHandler(socket)
  })

  socket.on('data', (data: Buffer) => {
    const message: Message = JSON.parse(data.toString())
    console.log('Mensagem: ', message)

    const messageUUID = message.uuid
    const messageType = message.message_type
    const messagePayload = message.payload
    let client = knowHosts.find((host) => host.uuid === messageUUID)

    if (!messageUUID || !client) {
      const newConnectedHost: HostInfo = {
        status: "online",
        uuid: randomUUID(),
        ip: socket.remoteAddress!,
        porta: socket.remotePort!,
        files: [],
        lastOnline: new Date().toISOString()
      }
      // atualiza a lista de clientes conhecidos em memória e disco
      knowHosts.push(newConnectedHost)
      saveState(knowHosts)
      client = newConnectedHost

      // preapara uma mensagem para atribuição de uma UUID ao cliente
      const setUUIDMessage: Message = {
        uuid: serverUUID,
        message_type: "SET",
        payload: newConnectedHost.uuid
      }
      socket.write(JSON.stringify(setUUIDMessage))

      // propaga o estado atual para todos os clientes
      propagate_TCP(serverUUID, knowHosts, activeConnections)

    } else if (client.status === 'offline') {
      client.ip = socket.remoteAddress!
      client.porta = socket.remotePort!
      client.status = 'online'
      propagate_TCP(serverUUID, knowHosts, activeConnections)
    }

    switch (messageType) {
      case 'UPLOAD':
        client.files.push(messagePayload)
        client.lastOnline = new Date().toISOString()
        saveState(knowHosts)
        propagate_TCP(serverUUID, knowHosts, activeConnections)
        break
      case 'DELETE':
        const deletionIndex = client!.files.findIndex((filename) => filename == messagePayload)
        if (deletionIndex != 1) {
          client.files.splice(deletionIndex, 1)
          client.lastOnline = new Date().toISOString()
          saveState(knowHosts)
          propagate_TCP(serverUUID, knowHosts, activeConnections)
        } else {
          // Notifica cliente que o arquivo não foi encontrado
          const notFoundMessage: Message = {
            uuid: serverUUID,
            message_type: "NOTIFY",
            payload: "not found"
          }
          socket.write(JSON.stringify(notFoundMessage))
        }
    }
  })
})

server.listen(serverPort, serverIp, () => {
  console.log(`Servidor estático escutando na porta ${serverPort}`)
})

function disconnectHandler(socket: Socket) {

  const closingSocketIndex = activeConnections.indexOf(socket)
  activeConnections.splice(closingSocketIndex, 1)

  const closingSocketIP = socket.remoteAddress!
  const closingSocketPort = socket.remotePort!

  const disconnectedHost = knowHosts.find((host) => host.ip == closingSocketIP && host.porta == closingSocketPort)!
  disconnectedHost.status = 'offline'
  disconnectedHost.lastOnline = new Date().toISOString()
  saveState(knowHosts)
  propagate_TCP(serverUUID, knowHosts, activeConnections)

}