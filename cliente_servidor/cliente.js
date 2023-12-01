const net = require("net");

const estatico = {
    ip: '127.0.0.1',
    porta: '9000'
}
const vizinhos = []
const arquivos = []
const id = null


function listarArquivos() {
    const temp = []
    for (const vizinho in vizinhos) 
        temp.push(vizinhos.arquivos)
    return temp
}

function upload(arquivo) {
    const cliente = net.createConnection({ host: estatico.ip, port: estatico.porta }, () => {
        cliente.on('data', (mensagem) => {
            mensagem = JSON.parse(mensagem.toString())
            if ( mensagem.tipo == 'OK' ) {
                arquivos.push(arquivo)
                cliente.end()
            }
        })
    })
    

    const mensagem = JSON.stringify({
        uuid: id,
        tipo: 'upload',
        payload: arquivo,
        encoding: null,
    })

    cliente.write(mensagem)
}

function saudarServidor() {
    const cliente = net.createConnection({ host: estatico.ip, port: estatico.porta }, () => {
        cliente.on('data', (mensagem) => {
            mensagem = JSON.parse(mensagem.toString())
            if ( mensagem.tipo == 'OK' ) {
                if ( mensagem.payload )
                    id = mensagem.payload
                cliente.end()
            }
        })
    })

    const mensagem = JSON.stringify({
        uuid: id,
        tipo: 'greeting',
        payload: arquivos,
        enconding: null
    })

    cliente.write(mensagem)
}

function download(arquivo) {
    // Localizar vizinho que possui esse arquivo
    // Estabelecer conexão e baixá-lo
}

function deletar(arquivo) {
    const cliente = net.createConnection({ host: estatico.ip, port: estatico.porta }, () => {
        cliente.on('data', (mensagem) => {
            mensagem = JSON.parse(mensagem.toString())
            if ( mensagem.tipo == 'OK' ) 
                arquivos = arquivos.filter((elemento) => elemento != arquivo)
        })
    })

    const mensagem = JSON.stringify({ 
        uuid: id, 
        tipo: 'delete',
        payload: arquivo,
        encoding: null
    })
    
    cliente.write(mensagem)
}

function servir(arquivo) {
    // Chamada quando um outro cliente requere um arquivo
    // Enviar esse arquivo usando threads
    // Provavelmente terei que usar um EventEmitter
}

// Cria o servidor desse cliente
// const clienteServidor = net.createServer((socket) => {
//   
// })

module.exports = { listarArquivos, upload }