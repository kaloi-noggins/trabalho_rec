import { readFileSync } from "fs";
import { join } from "path";
import { Config } from "./types/config";
import { HostInfo } from "./types/host";
import { Message } from "./types/message";
import { randomUUID } from "crypto";
import { NOTIFY, propagate, saveState } from "./server_routines";
import { createSocket } from "dgram";


// configuração de ip e porta do servidor estático e leitura da lista de hosts conhecidos e suas configurações
const config: Config = JSON.parse(readFileSync(join(__dirname, "..", "conf", "config.json"), "utf-8"));
const serverUUID = config.uuid;
const serverPort = config.port;
const serverIp = config.ip;

const knowHosts: HostInfo[] = JSON.parse(
  readFileSync(join(__dirname, "..", "conf", "known_hosts.json"), "utf-8")
);

// criação do socket de troca de mensagens entre Servidor Estático e Cliente/Servidor
const socket = createSocket("udp4")

socket.on('message', (bufferedMessage: Buffer, remoteInfo) => {
  const message: Message = JSON.parse(bufferedMessage.toString())

  console.log("Mensagem:")
  console.log(message)
  console.log(`Host: ${remoteInfo.address}:${remoteInfo.port}`)

  const messageUUID = message.uuid
  const messageType = message.message_type
  const messagePayload = message.payload

  const foundClient = knowHosts.find((host) => host.uuid === messageUUID)

  switch (messageType) {
    case "NOTIFY":
      switch (messagePayload) {
        case "connection":

          // checa se o host informou uma UUID, senão, gera uma
          // nova UUID e o insere na lista de clientes conhecidos  
          if (messageUUID) {

            const newConnectedHost = knowHosts.find((host) => host.uuid === message.uuid)!
            newConnectedHost.ip = remoteInfo.address
            newConnectedHost.porta = remoteInfo.port
            newConnectedHost.lastOnline = new Date().toISOString()
            newConnectedHost.status = "online"

          } else {

            const newConnectedHost: HostInfo = {
              status: "online",
              uuid: randomUUID(),
              ip: remoteInfo.address,
              porta: remoteInfo.port,
              files: [],
              lastOnline: new Date().toISOString()
            }

            // atualiza a lista de clientes conhecidos em memória e disco
            knowHosts.push(newConnectedHost)
            saveState(knowHosts)

            // preapara uma mensagem para atribuição de uma UUID ao cliente
            const setUUIDMessage: Message = {
              uuid: serverUUID,
              message_type: "SET",
              payload: newConnectedHost.uuid
            }
            socket.send(JSON.stringify(setUUIDMessage), newConnectedHost.porta, newConnectedHost.ip)

          }

          // propaga o estado atual para todos os clientes
          propagate(serverUUID, knowHosts)

          break;
        case "disconnnection":
          const endingConnectionHost = knowHosts.find((host) => host.uuid === message.uuid)!
          endingConnectionHost.status = "offline"
          endingConnectionHost.lastOnline = new Date().toISOString()
          saveState(knowHosts)
          propagate(serverUUID, knowHosts)
          break;
        default:
          //console.log(`Mensagem mal formatada do host ${remoteInfo.address}:${remoteInfo.port}`)
          throw new Error(`Mensagem mal formatada do host ${remoteInfo.address}:${remoteInfo.port}`);
          break;
      }
      break;
    case "UPLOAD":
      // checa se o cliente existe e atualiza ultima data online e lista de arquivos
      if (foundClient) {
        foundClient.files.push(messagePayload)
        foundClient.lastOnline = new Date().toISOString()
        saveState(knowHosts)
        propagate(serverUUID, knowHosts)
      }
      break;
    case "DELETE":
      //checa se o cliente existe e atualiza ultima data online e lista de arquivos
      if (foundClient) {
        const deletionIndex = foundClient.files.findIndex((filename) => filename == messagePayload)
        if (deletionIndex != 1) {
          foundClient.files.splice(deletionIndex, 1)
          foundClient.lastOnline = new Date().toISOString()
          saveState(knowHosts)
          propagate(serverUUID, knowHosts)
        } else {
          // se arquivo não encontra, notifica cliente que arquivo não foi encontrado
          const notFoundMessage: Message = {
            uuid: serverUUID,
            message_type: "NOTIFY",
            payload: "not found"
          }
          socket.send(JSON.stringify(notFoundMessage), foundClient.porta, foundClient.ip)
        }
      }
      break;
    default:
      //console.log(`Mensagem mal formatada do host ${remoteInfo.address}:${remoteInfo.port}`)
      throw new Error(`Mensagem mal formatada do host ${remoteInfo.address}:${remoteInfo.port}`);
      break;
  }
})

socket.bind(serverPort, serverIp)

console.log(`Servidor inicializado. Clientes já conhecidos: ${knowHosts.length}`)