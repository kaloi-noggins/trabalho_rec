# Trabalho Final de Redes de Computadores

A solução que propomos consiste em uma arquitetura mista de cliente/servidor e P2P. Essa arquitetura mista possui um Servidor Estático, que é responsável por tarefas de orquestração e comunicação com a WAN, fazendo o papel de nó central do sistema, e os demais Clientes/Servidores, que podem prover ou requisitar informações de outros Clientes/Servidores. Dessa forma, o modelo permite que os Clientes/Servidores troquem arquivos entre si com interferência mínima do Servidor Estático.

## Instruções de uso:

É necessário ter instalado o node na versão 16. No repositório, encontram-se 4 pastas, o servidor esático e 3 clientes. Para executar o programa, abra um terminal em cada uma das pastas e execute:

``` bash
npm install
```
Este comando irá instalar as dependências de cada um dos 4 programas. Execute primeiro o servidor estático e depois os clientes. Para executar qualquer um dos 4, num terminal dentro dos respectivos projetos, execute:

``` bash
npm run start_dev
```

O servidor irá escutar na porta 9000 pelos clientes. Os clientes possuem duas pastas para disponibilizar e receber arquivos. Os arquivos a serem disponibilizados estão na pasta arquivos e os downloads em downloads

Os clientes possuem uma CLI interativa. Um lista de comandos é reconhecida:

- list: Lista os hosts conhecidos e seus arquivos.
- upload: Disponibiliza os arquivos contidos na pasta arquivos
- download: Baixa arquivos de um host. Este comando espera 2 inputs: o ip:porta do host e o arquivo desejado
- delete: Exclui um arquivo da lista de arquivos disponibilizados
- exit: Encerra a conexão com o servidor e fecha o programa
