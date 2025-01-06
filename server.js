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
const roles = {};

io.on('connect', (socket) => {
    socket.on('joinRoom', (roomId, name, act) => {
        if(act == "joinGame"){
            //inGame rejoin
            let player = players[roomId].find(p => p.name === name);
            if (player.inGame) {
                player.Id = socket.id; // update socket id
                socket.join(roomId);
                return;
            }
        }else{
            //new player
            const player = {name: name, role: "Spec", Id: socket.id, inGame: false};
            if (!rooms[roomId]) {
                rooms[roomId] = [0, 0, 1, false, -1];// atk(P1), def(P2), spec, gamelock, round
                players[roomId] = [];
                roles[roomId] = {atk: [], def: [], atkpos: [], defpos: [], atkItem: [], defItem: [], atkItemPos: [], defItemPos: []};
            }
            else{
                rooms[roomId][2] += 1;
            }
            players[roomId].push(player);
            
            socket.join(roomId);
            console.log(`User joined room: mission#${roomId}`);
            io.to(roomId).emit("updatePlayer", players[roomId]);
        }
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
                if(player.inGame == true) return;

                if (player.role === "P1") {
                    rooms[roomId][0] -= 1;
                } else if (player.role === "P2") {
                    rooms[roomId][1] -= 1;
                } else {
                    rooms[roomId][2] -= 1;
                }
                players[roomId].splice(playerIndex, 1);
                io.to(roomId).emit("updatePlayer", players[roomId]);
                break;
            }
        }
    });

    socket.on("GameStart", (roomId) => {
        if(rooms[roomId][0] === 1 && rooms[roomId][1] === 1){
            rooms[roomId][3] = true;
            io.to(roomId).emit("GameLock", true);

            players[roomId].forEach(player => {
                player.inGame = true;
            });
        }
    });

    socket.on("characters", (roomId, characters, role, act) => {
        let player;
        if(act == "lock"){
            if(role == "atk"){
                player = players[roomId].find(player => player.role === "P1");
                player.role = role;
                roles[roomId].atk = characters;
            }else{
                player = players[roomId].find(player => player.role === "P2");
                player.role = role;
                roles[roomId].def = characters;
            }
        }
        socket.emit("ReceiveCharacters", characters);
        socket.to(roomId).emit("matchUp", characters, role, act);

        if(players[roomId].some(player => player.role === "atk") && players[roomId].some(player => player.role === "def")){
            setTimeout(() => {
                io.to(roomId).emit("MissionStart");
            }, 1500);
        }
    });

    socket.on("atkRequestCharacters", (roomId) => {
        socket.emit("ReceiveCharacters", roles[roomId].atk);
    });
    socket.on("defRequestCharacters", (roomId) => {
        roles[roomId].def.push('spike');
        socket.emit("ReceiveCharacters", roles[roomId].def);
    });

    function sendGameData(roomId, round, role, rolesData, act){
        let atkplayer = players[roomId].find(player => player.role === "atk");
        let defplayer = players[roomId].find(player => player.role === "def");

        const GamerId = [atkplayer.Id, defplayer.Id];
        
        if(role == "Spec"){
            socket.to(roomId).except(GamerId).emit("eventData", round, rolesData);
        }else if(role == "atk"){
            if(act == "Item"){
                socket.to(atkplayer.Id).emit("ItemBreak", rolesData);
            }else if(act == "character"){
                socket.to(atkplayer.Id).emit("CharacterDown", rolesData);
            }
        }else{
            if(act == "Item"){
                socket.to(defplayer.Id).emit("ItemBreak", rolesData);
            }else if(act == "character"){
                socket.to(defplayer.Id).emit("CharacterDown", rolesData);
            }
        }
    }

    function sendRoundUpdateData(roomId, round, Data){
        io.to(roomId).emit("updateRound", round, Data);
    }

    socket.on("GameInitData", (roomId, role, spawn) => {
        if(role == "atk"){
            roles[roomId].atkpos = spawn;
        }else{
            roles[roomId].defpos = spawn;
        }

        rooms[roomId][4] += 1; // init round

        if(rooms[roomId][4] == 1){
            console.log("room "+roomId+' start the mission: '+rooms[roomId]);
            sendGameData(roomId, 1, "Spec", roles[roomId], null);
            sendRoundUpdateData(roomId, 1, null);
        }
    });

    socket.on("endRound" , (roomId) => {
        rooms[roomId][4] += 1;
        console.log("room "+roomId+" is in the round "+rooms[roomId][4]);
        sendRoundUpdateData(roomId, rooms[roomId][4], null);
    });

    socket.on("characterMoving", (roomId, role, character, pos) => {
        const team = role === 'atk' ? roles[roomId].atk : roles[roomId].def;
        const teamPos = role === 'atk' ? roles[roomId].atkpos : roles[roomId].defpos;
        const charIndex = team.indexOf(character);
        teamPos[charIndex] = pos;
        console.log(team[charIndex]+" move to "+teamPos[charIndex]);
    })

    socket.on("ItemData", (roomId, role, Item, pos, act) => {
        const teamItem = role === 'atk' ? roles[roomId].atkItem : roles[roomId].defItem;
        const teamItemPos = role === 'atk' ? roles[roomId].atkItemPos : roles[roomId].defItemPos;
        
        const itemIndex = teamItemPos.indexOf(pos);
        
        if(act == "add"){

            if (itemIndex !== -1) { 
                teamItem[itemIndex] = Item;
            } else {
                teamItem.push(Item);
                teamItemPos.push(pos);
            }
        }else if(act == "break"){
            teamItem.splice(itemIndex, 1);
            teamItemPos.splice(itemIndex, 1);
        }
    })

    socket.on("attack", (roomId, role, attacker, target) => {
        const opponentTeam = role === 'atk' ? roles[roomId].def : roles[roomId].atk;
        const opponentPos = role === 'atk' ? roles[roomId].defpos : roles[roomId].atkpos;
        const targetIndex = opponentPos.indexOf(target);
    });


    socket.on("guessingHex", (roomId, role, hex) => {
        const enemyRole = role === 'atk' ? 'def' : 'atk';
        const enemyPos = roles[roomId][`${enemyRole}pos`];
        const enemyItemPos = roles[roomId][`${enemyRole}ItemPos`];
        const result = [];

        hex.forEach(hex => {
            const enemyCharacterIndex = enemyPos.indexOf(hex);
            const enemyItemIndex = enemyItemPos.indexOf(hex);

            if(enemyCharacterIndex !== -1 || enemyItemIndex !== -1){
                result.push(hex);
            }
        });

        socket.emit("hexGuessResult", result);
    })
    socket.on("checkingHex", (roomId, role, hex) => {
        const enemyRole = role === 'atk' ? 'def' : 'atk';
        const enemyPos = roles[roomId][`${enemyRole}pos`];
        const enemyItemPos = roles[roomId][`${enemyRole}ItemPos`];
        const result = [];

        hex.forEach((hex, index) => {
            const enemyCharacterIndex = enemyPos.indexOf(hex);
            const enemyItemIndex = enemyItemPos.indexOf(hex);

            if (!result[index]) {
                result[index] = {piece: "", item: ""};
            }

            if(enemyCharacterIndex !== -1){
                result[index].piece = roles[roomId][`${enemyRole}`][enemyCharacterIndex];
            }
            if(enemyItemIndex !== -1){
                result[index].item = roles[roomId][`${enemyRole}`][enemyItemIndex];
            }
            if(enemyCharacterIndex === -1 && enemyItemIndex === -1){
                result[index] = null;
            }
        });

        socket.emit("hexCheckResult", result);
    });

    socket.on("breakingItem", (roomId, role, hex) => {
        const enemyRole = role === 'atk' ? 'def' : 'atk';
        const enemyItemPos = roles[roomId][`${enemyRole}ItemPos`];
        const result = [];

        hex.forEach((hex, index) => {
            const enemyItemIndex = enemyItemPos.indexOf(hex);

            if(enemyItemIndex !== -1){
                result[index] = roles[roomId][`${enemyRole}Item`][enemyItemIndex];
                sendGameData(roomId, rooms[roomId][4], enemyRole, hex, "Item");
                
                roles[roomId][`${enemyRole}Item`].splice(enemyItemIndex, 1);
                roles[roomId][`${enemyRole}ItemPos`].splice(enemyItemIndex, 1);
            }
            if(enemyItemIndex === -1){
                result[index] = null;
            }
        });

        socket.emit("ItemResult", result);
    });
    socket.on("attackeEnemy", (roomId, role, hex) => {
        const enemyRole = role === 'atk' ? 'def' : 'atk';
        const enemyPos = roles[roomId][`${enemyRole}Pos`];
        const enemyItemPos = roles[roomId][`${enemyRole}ItemPos`];
        const result = [];

        hex.forEach((hex, index) => {
            const enemyIndex = enemyPos.indexOf(hex);

            if(enemyIndex !== -1){
                result[index] = roles[roomId][`${enemyRole}`][enemyIndex];
                sendGameData(roomId, rooms[roomId][4], enemyRole, hex, "character");
                
                roles[roomId][`${enemyRole}`][enemyIndex] = null;
                roles[roomId][`${enemyRole}Pos`][enemyIndex] = null;
            }
            if(enemyIndex === -1){
                result[index] = null;
            }
        });

        socket.emit("enemyResult", result);
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

app.get(`/mission/:roomid`, (req, res) => {
    res.sendFile(path.join(__dirname,  'src', 'board.html'));
});

server.listen(port, function(){
    console.log('Server is running on port ' + port);
});

module.exports = { io };