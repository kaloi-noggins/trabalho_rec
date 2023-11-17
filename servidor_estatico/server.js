const net = require("net");

const port = 9000;
const host = "127.0.0.1";

const server = net.createServer();

server.listen(port, host, () => {
  console.log(`servidor estático ouvindo no host ${port}`);
});

// lista de clientes/servidor conectados
let clients = [];

// evento de conexão
server.on("connection", (client) => {
  console.log(
    `novo cliente/servidor conectado: ${client.remoteAddress}:${client.remotePort}`
  );
  clients.push(client);

  // tratamento de envio de dados do cliente/servidor
  client.on("data", (data) => {
    console.log(
      `dados enviados pelo cliente ${client.remoteAddress}:${client.remotePort}\ndados:${data}`
    );
  });

  // tratamento do fechamento da conexão
  client.on("close", (data) => {
    console.log(
      `cliente ${client.remoteAddress}:${client.remotePort} desconectado\ndados:${data}`
    );
  });
});
