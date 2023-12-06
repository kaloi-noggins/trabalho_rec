import { createInterface } from "readline"
import { del, download, greetServer, listFiles, upload } from "./client"

const cli = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ">>"
})

cli.on('line', (line) => {
    const tokens = line.trim().split(' ')
    const comando = tokens[0]
    const args = tokens.splice(1)

    switch (comando) {
        case 'help':
            console.log("Sintaxe do Comando                 Função\n")
            console.log("list                               lista todos os arquivos disponíveis para download em todos os hosts")
            console.log("upload nomearquivo                 disponibiliza um arquivo para download")
            console.log("delete nomearquivo                 remove arquivo disponibilizado previamente")
            console.log("download ip:porta nomearquivo      disponibiliza um arquivo para download")
            console.log("exit                               avisa servidor da desconexão e fecha o programa")
            break
        case 'list':
            const listedFiles = listFiles()
            listedFiles.forEach((element) => {
                console.log(`host ${element.host.ip}:${element.host.port}`)
                if (element.files.length > 0) {
                    element.files.forEach((file) => {
                        console.log(`      - ${file}`)
                    })
                }
            })
            break
        case 'upload':
            // Verificar se o arquivo realmente existe no diretório
            upload(args[0])
            break
        case 'delete':
            del(args[0])
            break
        case 'download':
            const splitedArg = args[0].split(":")
            const host = {
                ip: splitedArg[0],
                port: Number(splitedArg[1])
            }
            download(host, args[1])
            break
        case 'exit':
            cli.close()
            process.exit(0)
        default:
            console.log('Comando não reconhecido.\nDigite "help" para ver a lista completa de comandos')
            break
    }
    cli.prompt()
})

// informar servidor sobre cliente
greetServer()

// Prompt do CLI
console.log("Aguardando comando. Digite 'help' para lista de comandos")
cli.prompt()