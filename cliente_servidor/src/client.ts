import { Socket, createServer } from "net";
import { readFileSync, writeFile, writeFileSync } from "fs";
import { HostInfo } from "./types/host";
import { join } from "path";
import { Config } from "./types/config";
import { Message } from "./types/message";
import { saveState, startClientServer } from "./client_routines";

// configuração de ip, porta e diretório de arquivos do cliente/servidor
const config: Config = JSON.parse(readFileSync(join(__dirname, "..", "conf", "config.json"), "utf-8"));
var hostUUID = config.hostUUID;
var hostIP: string
var hostPort: number
var serverUUID = config.serverUUID
var serverIP = config.serverIP
var serverPort = config.serverPort
var filePath = config.filePath

// hosts conhecidos
var knowHosts: HostInfo[] = []

// criação do servidor
const clientServer = createServer((socket) => {

})


// inicializa a comunicação com o servidor
const client = new Socket()

client.connect(serverPort, serverIP, () => {
  // notifica o servidor estátic sobre nova conexão e recebe a lista mais recente
  // de hosts do servidor estático
  const greetingMessage: Message = {
    uuid: hostUUID,
    message_type: "NOTIFY",
    payload: "connection"
  }
  client.write(JSON.stringify(greetingMessage))

  // tratamento das mensagens vindas do servidor
  client.on("data", (bufferedMessage: Buffer) => {
    const message: Message = JSON.parse(bufferedMessage.toString())
    const payload = message.payload

    console.log(message)

    switch (message.message_type) {
      case "NOTIFY":
        break;
      case "SET":

        console.log(payload)
        // tratamento do payload SET
        if (typeof payload != 'string') {
          knowHosts = payload
          writeFileSync(join(__dirname, "..", "conf", "known_hosts.json"), JSON.stringify(knowHosts))

          if (hostPort == null || hostIP == null || serverUUID == null) {

            // salva a uuid do servidor
            serverUUID = message.uuid
            const hostIP = client.localAddress!
            const hostPort = client.localPort!

            const config: Config = {
              hostUUID: hostUUID,
              hostIP: hostIP,
              hostPort: hostPort,
              serverUUID: serverUUID,
              serverIP: serverIP,
              serverPort: serverPort,
              filePath: filePath
            }

            saveState(config, `config_${hostUUID}.json`)

            startClientServer(hostIP,hostPort,clientServer)
          }
        } else {
          hostUUID = payload
          writeFile(join(__dirname, "..", "conf", "known_hosts.json"), JSON.stringify(knowHosts), (err) => {
            if (err) {
              console.error(err)
            }
          })
        }

        break;
      case "UPLOAD":
        break;
      case "DELETE":
      default:
        break;
    }
  })


})