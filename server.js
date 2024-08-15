const express = require('express');
const path = require('path');
const app = express();
const http = require('http');
const {Server} = require('socket.io');
const port = 5000;

app.use(express.static(path.join(__dirname, 'src')));

const server = http.createServer(app); // http server
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 }); // socket.io

let rooms = {};
let players = {};

io.on('connect', (socket) => {
    socket.on('joinRoom', (roomId, name) => {
        const player = {name: name, role: "Spec", Id: socket.id};

        if (!rooms[roomId]) {
            rooms[roomId] = [0, 0, 1, false, 0];// atk(P1), def(P2), spec, gamelock, round
            players[roomId] = [];
        }
        else{
            rooms[roomId][2] += 1;
        }
        players[roomId].push(player);
        
        socket.join(roomId);
        console.log(`User joined room: mission#${roomId}`);
        io.to(roomId).emit("updatePlayer", players[roomId]);
    })

    function changeRole(roomId, name, newRole) {
        let player = players[roomId].find(player => player.name === name);
        if (player) {
            player.role = newRole;
        }
    }

    socket.on('P1', (roomId, name, role) =>{
        if(rooms[roomId][3]){
            return;
        }
        if (rooms[roomId] && rooms[roomId][0] == 0){

            io.to(roomId).emit("P1");
            rooms[roomId][0] += 1;

            changeRole(roomId, name, "P1");

            if(role == "P2"){
                rooms[roomId][1] -= 1;
            }else{
                rooms[roomId][2] -= 1;
            }
            io.to(roomId).emit("updatePlayer", players[roomId]);
        }
    })
    socket.on('P2', (roomId, name, role) =>{
        if(rooms[roomId][3]){
            return;
        }
        if (rooms[roomId] && rooms[roomId][1] == 0){
            io.to(roomId).emit("P2");
            rooms[roomId][1] += 1;
            
            changeRole(roomId, name, "P2");

            if(role == "P1"){
                rooms[roomId][0] -= 1;
            }else{
                rooms[roomId][2] -= 1;
            }
            io.to(roomId).emit("updatePlayer", players[roomId]);
        }
    })
    socket.on('Spec', (roomId, name, role) =>{
        if(rooms[roomId][3]){
            return;
        }
        if(role !== "Spec"){
            io.to(roomId).emit("Spec");
            rooms[roomId][2] += 1;
    
            changeRole(roomId, name, "Spec");
    
            if(role == "P1"){
                rooms[roomId][0] -= 1;
            }else{
                rooms[roomId][1] -= 1;
            }
            io.to(roomId).emit("updatePlayer", players[roomId]);
        }
    })
    socket.on('disconnect', () => {
        for (const roomId in players) {
            const playerIndex = players[roomId].findIndex(player => player.Id === socket.id);
            if(playerIndex !== -1){
                const player = players[roomId][playerIndex];
                if (player.role === "P1") {
                    rooms[roomId][0] -= 1;
                } else if (player.role === "P2") {
                    rooms[roomId][1] -= 1;
                } else {
                    rooms[roomId][2] -= 1;
                }
                players[roomId].splice(playerIndex, 1);
                break;
            }
        }
    });

    socket.on("GameStart", (roomId) => {
        if(rooms[roomId][0] === 1 && rooms[roomId][1] === 1){
            rooms[roomId][3] = true;
            io.to(roomId).emit("GameLock", true);
            console.log("room "+roomId+': '+rooms[roomId]);
        }
    });

    socket.on("chatacters", (characters, role, act) => {
        if(act == "lock"){
            if(role == "atk"){
                let player = players[roomId].find(player => player.role === "P1");
                player.role = role;
            }else{
                let player = players[roomId].find(player => player.role === "P2");
                player.role = role;
            }
        }
        socket.to(roomId).emit("matchUp", characters, role, act);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'cover.html'));
});

app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'menu.html'));
});

app.get(`/room/:roomid`, (req, res) => {
    const roomId = req.params.roomid;
    if (roomId.trim().length !== 0 && roomId !== null) {
        res.sendFile(path.join(__dirname,  'src', 'room.html'));
    } else {
        res.status(404).send('Room not found');
    }
});

app.get(`/room/:roomid/:role`, (req, res) => {
    const role = req.params.role;
    if (role == "Spec") {
        res.sendFile(path.join(__dirname,  'src', 'Spec.html'));
    } else {
        res.sendFile(path.join(__dirname,  'src', 'rolePage.html'));
    }
});

server.listen(port, function(){
    console.log('Server is running on port ' + port);
});

module.exports = { io };