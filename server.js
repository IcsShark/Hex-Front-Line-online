const express = require('express');
const path = require('path');
const app = express();
const http = require('http');
const {Server} = require('socket.io');
const port = 5000;

app.use(express.static(path.join(__dirname, 'src')));

const server = http.createServer(app); // http server
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 }); // socket.io

var onlinePlayers = 0;

io.on('connect', (socket) => {
    onlinePlayers += 1;
    console.log('A user connected, total player numbers: ' + onlinePlayers);

    socket.on('disconnect', () => {
        onlinePlayers -= 1;
        console.log('A user disconnected, total player numbers: ' + onlinePlayers);
    });
});

server.listen(port, function(){
    console.log('Server is running on port ' + port);
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/src/cover.html');
})

app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/menu.html'));
});