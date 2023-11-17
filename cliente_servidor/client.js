const net = require("net");

const port = 9000;
const host = "127.0.0.1";

const client = new net.Socket();

client.connect(port, host, () => {
  console.log("cliente/servidor conectado no servidor estático");

  // envia dados para o servidor estático
  client.write(`ola servidor estático, aqui é ${client.address().address}`);

  // tratamento de recebimento de dados do servidor estático
  client.on("data", (data) => {
    console.log(`servidor estático diz: ${data}`);
  });

  // tratamento do fechamento da conexão
  client.on("close", (data) => {
    console.log(`conexão encerrada\ndados${data}`);
  });
});
