import { Socket, createServer } from "net";
import { readFileSync, writeFile, writeFileSync } from "fs";
import { join } from "path";
import { Config } from "./types/config";
import { HostInfo, ConnectedHosts } from "./types/host";
import { Message } from "./types/message";
import { randomUUID } from "crypto";
import { NOTIFY, SET, saveState } from "./server_routines";


// configuração de ip e porta do servidor estático e leitura da lista de hosts conhecidos e suas configurações
const config: Config = JSON.parse(readFileSync(join(__dirname, "..", "conf", "config.json"), "utf-8"));
const serverUuid = config.uuid;
const port = config.port;
const host = config.host;

const knowHosts: HostInfo[] = JSON.parse(
  readFileSync(join(__dirname, "..", "conf", "known_hosts.json"), "utf-8")
);

const connectedHosts: ConnectedHosts[] = []

// tratamento de eventos emitidos pelos cliente/servidor
const server = createServer((socket) => {

  // tratamento de novas conexões
  socket.on("connect", (message: Message) => {
    // tratamento da mensagem enviada pelo host
    const message_type = message.message_type;
    switch (message_type) {
      case "NOTIFY":
        const payload = message.payload
        switch (payload) {
          case "connection":
            // checa se o host conectado reportou uma UUID. 
            // Se sim atualiza as informações da lista de hosts conhecido
            // Se não, gera uma UUID para o host e o insere na list de
            // hosts conhecidos
            if (message.uuid) {

              const newConnectedHost = knowHosts.find((host) => { host.uuid === message.uuid })!
              newConnectedHost.ip = socket.remoteAddress!.toString()
              newConnectedHost.porta = socket.remotePort!
              newConnectedHost.lastOnline = new Date().toISOString()
              newConnectedHost.status = "online"

            } else {

              const ip = socket.remoteAddress!.toString()
              const port = socket.remotePort!
              const newConnectedHost: HostInfo = {
                status: "online",
                uuid: randomUUID(),
                ip: ip,
                porta: port,
                files: [],
                lastOnline: new Date().toISOString()

              }
              // atualiza a lista em memoria
              knowHosts.push(newConnectedHost)
              // atualiza a lista em disco
              saveState(knowHosts);
            }

            // insere o host na list de hosts conectados
            connectedHosts.push({ socket: socket, uuid: message.uuid! })

            console.log(`Novo host conectado: ${socket.remoteAddress}:${socket.remotePort}`)

            // propaga as mudanças para os demais hosts
            SET(connectedHosts, serverUuid, knowHosts).then((info) => {
              console.log(info)
            }).catch((err) => {
              console.error(err)
            })
            break;
          default:
            console.error(`Payload NOTIFY mal formatado do host ${socket.address}:${socket.remotePort}`)
            break;
        }
        break;
      default:
        console.error(`Mensagem mal formatada do host ${socket.address}:${socket.remotePort}`)
        break;
    }
  })


  // tratamento do envio de dados pelos hosts
  socket.on("data", (message: Message) => {
    // tratamento da mensagem enviada pelo host
    const message_type = message.message_type;
    const payload = message.payload
    const host = knowHosts.find((host) => { host.uuid === message.uuid })!
    switch (message_type) {
      case "UPLOAD":

        if (typeof payload === 'string') {

          // insere arquivo na lista de arquivos do host
          host.files.push(payload)
          host.lastOnline = new Date().toISOString()

          // atualiza a lista em disco
          saveState(knowHosts);

          // propaga as mudanças para os demais hosts
          SET(connectedHosts, serverUuid, knowHosts).then((info) => {
            console.log(info)
          }).catch((err) => {
            console.error(err)
          })

        } else {
          console.error("Payload do tipo HostInfo[] em UPLOAD")
        }

        break;
      case "DELETE":

        if (typeof payload === 'string') {

          // encontra o indice do arquivo marcado para deleção e o remove da lista
          const deletionIndex = host.files.indexOf(payload)

          // checa se existe pelo menos uma ocorrencia da string enviada
          if (deletionIndex != -1) {
            host.files.splice(deletionIndex, 1)
            host.lastOnline = new Date().toISOString()
            // propaga as mudanças para os demais hosts
            SET(connectedHosts, serverUuid, knowHosts).then((info) => {
              console.log(info)
            }).catch((err) => {
              console.error(err)
            })

            // atualiza a lista em disco
            saveState(knowHosts);

          } else {
            // envia uma mensage ao host o informando que o item não existe
            NOTIFY(socket, serverUuid, "NOT FOUND")
          }

        } else {
          console.error("Payload do tipo HostInfo[] em DELETE")
        }

        break;
      default:
        console.error(`Mensagem mal formatada do host ${socket.address}:${socket.remotePort}`)
        break;
    }
  })

  // tratamento da desconexão de um host
  socket.on("close", () => {

    // encontra o socket que está se desconectando
    const closingSocket = connectedHosts.find((connectedHosts) => {
      connectedHosts.socket == socket
    })!

    // encontra o host associado ao socket
    const closingKnownHost = knowHosts.find((host) => {
      host.uuid = closingSocket.uuid
    })!

    // atualiza o status do host na lista
    closingKnownHost.status = "offline"
    closingKnownHost.lastOnline = new Date().toISOString()

    // atualiza a lista em disco
    saveState(knowHosts);

    // remove o host da lista hosts conectados
    connectedHosts.slice(connectedHosts.indexOf(closingSocket), 1)

    // propaga o estado para os demais hosts
    SET(connectedHosts, serverUuid, knowHosts)
  })
});

// inicia o servidor estático
server.listen(port, host, () => {
  console.log(`Servidor Estático escutando em ${host}:${port}`);
  console.log(`Hosts carregados do arquivo: ${knowHosts.length}`)
});