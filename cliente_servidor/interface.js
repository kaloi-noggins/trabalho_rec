const readline = require('readline')
const cliente = require('./cliente')

const interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function mainPrompt() {
    interface.question('Aguardando comando: ', (string) => {
        const token = string.split(' ')
        const args = string.splice(1)
        
        switch (comando) {
            case 'list': 
                console.log(cliente.listarArquivos())
                break
            
            case 'upload':
                cliente.upload(args[0])
                break
        }
    })
}