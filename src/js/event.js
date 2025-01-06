let selectedPiece = null;
let characters = Array(5).fill(null);

let role = (GetCookie("role")=="P1")? "atk" : "def";
let selectedSpawn = (role == "atk")? Array(5).fill(null) : Array(6).fill(null);
let missionCode = getCode();
let countdownInterval;
let step = 0;
let point = 0;

// item counter
let drone = 0; // horus
let availableDrones = 3;
let cerberus = 3; // volatile

document.addEventListener('DOMContentLoaded', () => {
    const board = document.querySelector(".board");

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const hexagon = document.createElement("div");
            hexagon.className = "hexagon";
            hexagon.setAttribute("name",`${row+1}*${col+1}`);

            const spawn = [
                { row: 1, col: 1 },
                { row: 1, col: 5 },
                { row: 1, col: 6 },
                { row: 1, col: 10 },
                { row: 10, col: 1 },
                { row: 10, col: 5 },
                { row: 10, col: 6 },
                { row: 10, col: 10 }
            ];

            if (row % 2 === 0) {
                hexagon.style.marginLeft =  '31px';
            } else {
                hexagon.style.marginLeft =  '0';
            }
            const isSpawn = spawn.some(sp => sp.row === row + 1 && sp.col === col + 1);
            if (isSpawn) {
                hexagon.classList.add("spawn");
            }

            hexagon.addEventListener('click', handleSelectSpawn);

            board.appendChild(hexagon);
        }
    }
    if(role == "atk") {
        socket.emit("atkRequestCharacters", missionCode);
    }else if(role == "def") {
        socket.emit("defRequestCharacters", missionCode);
    }
    socket.once("ReceiveCharacters", handleCharacterData);
    setInitPlace();
    socket.on("updateRound",handleRoundData);
    socket.on("ItemBreak", ItemBreak);
    socket.on("CharacterDown", CharacterDown);
});

//basic move functions

function RoleHexClickEvent(event) {
    handleRoleHexClick(event.currentTarget);
}
function handleRoleHexClick(hexagon) {
    const roundElement = document.getElementById('round');
    const round = parseInt(roundElement.textContent, 10);

    if(( role == "atk" && !(round % 2) ) || (role == "def" && (round % 2))){
        return;
    }


    const piece = hexagon.getAttribute('piece');

    if (selectedPiece === hexagon) {
        cancelSelectedPiece();
        selectedPiece = null;
        return;
    }

    if (piece && piece !== "spike") {
        console.log('selectedRole: ' + piece);
        cancelSelectedPiece();
        selectedPiece = hexagon;
        selectedPiece.classList.add('selected');
        return;
    }

    if (!selectedPiece) return;

    //move
    if (selectedPiece.classList.contains('moving') && hexagon.classList.contains('surround') && !hexagon.classList.contains('has-piece')) {
        surroundEffect(selectedPiece, false);
        movePiece(selectedPiece, hexagon);
        selectedPiece.classList.remove('selected');
        sendMoveData(piece, hexagon.getAttribute('name'));
        selectedPiece = null;
    }
    //attack
    else if (selectedPiece.classList.contains('attacking') && hexagon.classList.contains('surround')) {
        surroundEffect(selectedPiece, false);
        attackeEnemy(hexagon);
        selectedPiece.classList.remove('selected');
        selectedPiece = null;
    }
    //skill
    else if (selectedPiece.classList.contains('usingSkill') && hexagon.classList.contains('surround')) {
        switch (selectedPiece.getAttribute('piece')) {
            case "horus":
                placeDrone(hexagon);
                break;
            case "volatile":
                Cerberus(hexagon);
                break;
            default:
                break;
        }
    }
}

function move(){
    if(!selectedPiece) return;
    if(step > 0 && point > 0){
        const stepElement = document.getElementById('step');
        const pointElement = document.getElementById('point');

        selectedPiece.classList.remove('usingSkill');
        selectedPiece.classList.remove('attacking');
        selectedPiece.classList.add("moving");
        surroundEffect(selectedPiece,true);
        step -= 1;
        point -= 1;
        stepElement.textContent = `${step}`;
        pointElement.textContent = `${point}`;
    }
}

function attack(){
    if(!selectedPiece) return;
    if(step > 0 && point > 0){
        const stepElement = document.getElementById('step');
        const pointElement = document.getElementById('point');

        selectedPiece.classList.remove('usingSkill');
        selectedPiece.classList.remove('moving');
        selectedPiece.classList.add("attacking");
        surroundEffect(selectedPiece,true);
        step -= 1;
        point -= 1;
        stepElement.textContent = `${step}`;
        pointElement.textContent = `${point}`;
    }
}

function skill(){
    if(!selectedPiece) return;
    if(step > 0 && point > 0){
        const stepElement = document.getElementById('step');
        const pointElement = document.getElementById('point');

        selectedPiece.classList.remove('moving');
        selectedPiece.classList.remove('attacking');
        selectedPiece.classList.add("usingSkill");
        switch (selectedPiece.getAttribute('piece')) {
            case "horus":
                if(drone < 2 || availableDrones > 0){
                    horusSkill();
                    drone += 1;
                    availableDrones -= 1;
                }else{
                    return;
                }
                break;
            case "volatile":
                if(cerberus > 0){
                    volatileSkill();
                    cerberus -= 1;
                }
                break;
            default:
                break;
        }
        step -= 1;
        point -= 1;
        stepElement.textContent = `${step}`;
        pointElement.textContent = `${point}`;
    }
}

function cancelSelectedPiece(){
    if(!selectedPiece) return;
    selectedPiece.classList.remove('selected');
    selectedPiece.classList.remove('moving');
    selectedPiece.classList.remove('usingSkill');
    selectedPiece.classList.remove('attacking');
    surroundEffect(selectedPiece,false);
}

function placeItem(Item, id){
    const target = document.querySelector(`[name="${id}"]`);

    if(Item){
        target.classList.add('has-item');
        target.setAttribute('item', Item);
    }else{
        target.classList.remove('has-item');
        target.removeAttribute('item');
    }
}

function placePiece(Piece, id){
    const target = document.querySelector(`[name="${id}"]`);

    if(Piece){
        target.classList.add('has-piece');
        target.setAttribute('piece', Piece);
    }else{
        target.classList.remove('has-piece');
        target.removeAttribute('piece');
    }
}

function movePiece(fromHexagon, toHexagon) {
    const piece = fromHexagon.getAttribute('piece');

    if (piece) {
        placePiece(null, fromHexagon.getAttribute('name'));
        placePiece(piece, toHexagon.getAttribute('name'));
    }
}

function surroundEffect(hex, act){
    let surroundingHexes = getSurroundingHexes(hex);
    
    surroundingHexes.forEach(([row, col]) => {
        if (row >= 1 && row <= 10 && col >= 1 && col <= 10) {
            const target = document.querySelector(`[name="${row}*${col}"]`);
            if (act) {
                target.classList.add('surround');
            }else{
                target.classList.remove('surround');
            }
        }
    });
}

function flashing(hex, data){
    if (!Array.isArray(hex)) {
        hex = [hex];
    }
    let element = "surround";
    if(data){
        element = data;
    }

    let intervalId = setInterval(() => {
        hex.forEach(id => {
            const target = document.querySelector(`[name="${id}"]`);
            target.classList.toggle(`${element}`);
        });
    }, 500);

    setTimeout(() => {
        clearInterval(intervalId);
        hex.forEach(id => {
            const target = document.querySelector(`[name="${id}"]`);
            target.classList.remove(`${element}`);
        });
    }, 3000);
}

function getSurroundingHexes(hex){
    const [row, col] = hex.getAttribute('name').split('*').map(Number);
    let surroundingHexes;

    if(row%2){
        surroundingHexes = [
            [row, col - 1], [row, col + 1],
            [row - 1, col], [row + 1, col],
            [row - 1, col + 1], [row + 1, col + 1]
        ];
    }else{
        surroundingHexes = [
            [row, col - 1], [row, col + 1],
            [row - 1, col], [row + 1, col],
            [row - 1, col - 1], [row + 1, col - 1]
        ];
    }

    surroundingHexes = surroundingHexes.filter(([r, c]) => r >= 1 && r <= 10 && c >= 1 && c <= 10);
    
    return surroundingHexes;
}

// io event

function breakItem(hex){
    socket.emit("breakingItem", missionCode, role, hex);
    socket.on("ItemResult", (result) => {
        result.forEach((result, index) => {
            const id = hex[index];
            const hexElement = document.querySelector(`[name="${id}"]`);

            if (result) {
                flashing(hexElement, result);
                hexElement.classList.remove('has-enemyitem');
            }
        });
        socket.off("ItemResult");
    });
}
function attackeEnemy(hex){
    socket.emit("attackeEnemy", missionCode, role, hex);
    socket.on("enemyResult", (result) => {
        result.forEach((result, index) => {
            const id = hex[index];
            const hexElement = document.querySelector(`[name="${id}"]`);

            if (result) {
                flashing(hexElement, result);
                hexElement.classList.remove('has-enemyitem');
            }
        });
        socket.off("enemyResult");
    });
}

function guessingHex(hex){
    socket.emit("guessingHex", missionCode, role, hex);
    socket.on("hexGuessResult", (result) => {
        result.forEach((result, index) => {
            const hexElement = document.querySelector(`[name="${result}"]`);
            hexElement.classList.add("someone");
        });
        socket.off("hexGuessResult");
    });
}
function checkingHex(hex){
    socket.emit("checkingHex", missionCode, role, hex);
    socket.on("hexCheckResult", (result) => {
        result.forEach((result, index) => {
            const id = hex[index];
            const hexElement = document.querySelector(`[name="${id}"]`);

            if (result) {
                if (result.piece) {
                    hexElement.classList.add('has-enemypiece');
                    hexElement.setAttribute('enemypiece', result.piece);
                } else if (result.item) {
                    hexElement.classList.add('has-enemyitem');
                    hexElement.setAttribute('enemyitem', result.item);
                }
            }else{
                hexElement.classList.remove('has-enemypiece', 'has-enemyitem');
            }
        });
        socket.off("hexCheckResult");
    });
}

function ItemBreak(id){
    const hex = document.querySelector(`[name="${id}"]`);
    let item = hex.getAttribute('item');
    flashing(hex, item);
    placeItem(null, hex.getAttribute('name'));

    switch (item) {
        case "drone":
            drone -= 1;
            break;
    
        default:
            break;
    }
}

function CharacterDown(id){
    const hex = document.querySelector(`[name="${id}"]`);
    let character = hex.getAttribute('item');
    flashing(hex, character);
    placePiece(null, hex.getAttribute('name'));

    const Index = characters.indexOf(character);
    if(Index !== -1){
        characters[Index] = null;
    }
}

// init game
function handleCharacterData(data){
    console.log('recieved characters data: '+data);
    characters = data;
}

function startGame(){
    checkSpawn();

    const hexagons = document.querySelectorAll('.hexagon');
    hexagons.forEach(hexagon => {
        hexagon.removeEventListener('click', handleSelectSpawn);
        hexagon.addEventListener('click', RoleHexClickEvent);
    });
    
    socket.emit("GameInitData", missionCode, role, selectedSpawn);
}

function handleSelectSpawn(event) {
    selectSpawn(event.currentTarget);
}
function selectSpawn(hexagon){
    const id = hexagon.getAttribute('name');

    const spawn = [
        { row: 1, col: 1 },
        { row: 1, col: 5 },
        { row: 1, col: 6 },
        { row: 1, col: 10 },
        { row: 10, col: 1 },
        { row: 10, col: 5 },
        { row: 10, col: 6 },
        { row: 10, col: 10 }
    ];
    const inSpawn = spawn.some(sp => sp.row + '*' + sp.col === id);

    if (selectedSpawn.includes(id)) {
        const index = selectedSpawn.indexOf(id);
        selectedSpawn[index] = null;
        placePiece(null,id);
    } else if (selectedSpawn.includes(null)) {
        if(role == "atk" && inSpawn){
            for (let i = 0; i < 5; i++) {
                if (selectedSpawn[i] === null) {
                    selectedSpawn[i] = id;
                    placePiece(characters[i],id);
                    break;
                }
            }
        }else if(role == "def" && !inSpawn){
            for (let i = 0; i < 6; i++) {
                if (selectedSpawn[i] === null) {
                    selectedSpawn[i] = id;
                    placePiece(characters[i],id);
                    break;
                }
            }
        }
        
    }
}

function getRandomSpawns() {
    let Spawns;
    const redSpawns = [
        { row: 1, col: 1 },
        { row: 1, col: 5 },
        { row: 1, col: 6 },
        { row: 1, col: 10 },
        { row: 10, col: 1 },
        { row: 10, col: 5 },
        { row: 10, col: 6 },
        { row: 10, col: 10 }
    ];
    if(role == "atk"){// atk spawn
        const shuffled = redSpawns.sort(() => 0.5 - Math.random());
        Spawns = shuffled.slice(0, 5);
        return Spawns.map(sp => `${sp.row}*${sp.col}`);
    }

    const availableSpawns = [];// def spawn

    for (let row = 1; row <= 10; row++) {
        for (let col = 1; col <= 10; col++) {
            const isExcluded = redSpawns.some(sp => sp.row === row && sp.col === col);
            if (!isExcluded) {
                availableSpawns.push({ row, col });
            }
        }
    }

    const randomSpawns = [];
    while (randomSpawns.length < 6) {
        const randomIndex = Math.floor(Math.random() * availableSpawns.length);
        randomSpawns.push(availableSpawns.splice(randomIndex, 1)[0]);
    }

    return randomSpawns.map(sp => `${sp.row}*${sp.col}`);
}

function checkSpawn(){
    if(selectedSpawn.includes(null)){ // set defult spawn
        selectedSpawn = getRandomSpawns();
    }

    selectedSpawn.forEach(sp =>{
        const index = selectedSpawn.indexOf(sp);
        placePiece(null,sp);
        placePiece(characters[index],sp);
    });
}

function setInitPlace(){
    let countdown = 30;

    const countdownElement = document.getElementById('timer');
    const roundElement = document.getElementById('round');


    countdownInterval = setInterval(() => {
        countdownElement.textContent = `${countdown}`;
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval);
            countdownElement.textContent = '';
            roundElement.textContent = '1';
            startGame();
        }
    }, 1000);
}

// handle data
function handleRoundData(round, data){
    console.log("round: "+round);

    const roundElement = document.getElementById('round');
    roundElement.textContent = `${round}`;

    if(( role == "atk" && (round % 2) ) || (role == "def" && !(round % 2))){
        createActButtons();
        startRound();
    }else{
        deleteActButtons();
    }
}

function startRound(){
    ItemRoundEvent();
    const HexsWithSomeone = document.querySelectorAll('.someone');
    HexsWithSomeone.forEach(Hex => {
        Hex.classList.remove('someone');
    });

    let countdown = 120;
    
    step = 5;
    point = 10;

    const countdownElement = document.getElementById('timer');
    const stepElement = document.getElementById('step');
    const pointElement = document.getElementById('point');
    stepElement.textContent = '5';
    pointElement.textContent = '10';

    countdownInterval = setInterval(() => {
        countdownElement.textContent = `${countdown}`;
        countdown--;
        if (countdown < 0 || step == 0 || point == 0) {
            clearInterval(countdownInterval);
            countdownElement.textContent = '';
            stepElement.textContent = '';
            pointElement.textContent = '';
            endRound();
        }
    }, 1000);
}

function skipRound(){
    const roundElement = document.getElementById('round');
    const round = parseInt(roundElement.textContent, 10)
    if(( role == "atk" && (round % 2) ) || (role == "def" && !(round % 2))){
        endRound();
    }
}

function endRound(){
    checkWinner();
    deleteActButtons();
    cancelSelectedPiece();
    const countdownElement = document.getElementById('timer');
    const stepElement = document.getElementById('step');
    const pointElement = document.getElementById('point');
    stepElement.textContent = '';
    pointElement.textContent = '';
    countdownElement.textContent = '';
    clearInterval(countdownInterval);
    socket.emit("endRound", missionCode);
}

function checkWinner(){
    const roundElement = document.getElementById('round');
    const round = parseInt(roundElement.textContent, 10);
    if(round == 60){
        win("def");
    }
}

function win(winner){
    alert("The winner is "+winner+" .");
    socket.emit("GameEnd", missionCode);
    window.location.href = `/`;
    SetCookie("state","init");
}

function createActButtons(){
    // create move
    const moveButton = document.createElement('div');
    moveButton.id = 'move';
    moveButton.className = 'move';
    moveButton.onclick = () => move();
    
    // create attack
    const attackButton = document.createElement('div');
    attackButton.id = 'attack';
    attackButton.className = 'attack';
    attackButton.onclick = () => attack();
    
    // create skill
    const skillButton = document.createElement('div');
    skillButton.id = 'skill';
    skillButton.className = 'skill';
    skillButton.onclick = () => skill();

    // create skip
    const skipButton = document.createElement('div');
    skipButton.id = 'skip';
    skipButton.className = 'skip';
    skipButton.onclick = () => skipRound();

    const screen = document.querySelector('.screen');
    screen.appendChild(moveButton);
    screen.appendChild(attackButton);
    screen.appendChild(skillButton);
    screen.appendChild(skipButton);
}

function deleteActButtons(){// remove all actButtons
    const screen = document.querySelector('.screen');

    const moveElement = document.getElementById("move");
    const attackElement = document.getElementById("attack");
    const skillElement = document.getElementById("skill");
    const skipElement = document.getElementById("skip");
    if(moveElement) screen.removeChild(moveElement);
    if(attackElement) screen.removeChild(attackElement);
    if(skillElement) screen.removeChild(skillElement);
    if(skipElement) screen.removeChild(skipElement);
}

function ItemRoundEvent(){
    const hexagons = document.querySelectorAll('.hexagon');

    hexagons.forEach(hexagon => {
        if (hexagon.classList.contains('has-item')) {
            const item = hexagon.getAttribute('item');
            
            switch (item) {
                case 'drone':
                    droneRoundEvent(hexagon);
                    break;

                default:
                    break;
            }
        }
    });
}

function sendMoveData(piece, destination){
    socket.emit("characterMoving", missionCode, role, piece, destination);
}

function sendItemData(Item, position, act){
    socket.emit("ItemData", missionCode, role, Item, position, act);
    ItemRoundEvent();
}

// atk skill

function horusSkill(){ // horus
    surroundEffect(selectedPiece,true);
}
function placeDrone(hexagon){
    surroundEffect(selectedPiece, false);
    selectedPiece.classList.remove('selected');
    placeItem("drone", hexagon.getAttribute('name'));
    sendItemData("drone", hexagon.getAttribute('name'), "add");
    cancelSelectedPiece();
}
function droneRoundEvent(hexagon){
    let surroundingHexes = getSurroundingHexes(hexagon);
    let Hexes = surroundingHexes.map(([row, col]) => `${row}*${col}`);

    Hexes.push(hexagon.getAttribute('name'));

    checkingHex(Hexes);
}

function volatileSkill(){ // volatile
    surroundEffect(selectedPiece,true);
}
function Cerberus(hexagon){
    surroundEffect(selectedPiece, false);
    const [row, col] = hexagon.getAttribute('name').split('*').map(Number);
    const [selectedRow, selectedCol] = selectedPiece.getAttribute('name').split('*').map(Number);

    let Hexes = [];

    if(row == selectedRow){
        let direction = col - selectedCol;
        for(let i = 1; i <= 5; i++){
            if((selectedCol+(i*direction)) >= 1 || (selectedCol+(i*direction)) <= 10){
                Hexes.push(`${selectedRow}*${selectedCol+(i*direction)}`);
            }
        } 
    }else if(selectedRow % 2) {
        let rowConst = row - selectedRow;
        let colConst = 0;
        if(col - selectedCol){
            for(let i = 1; i <= 5; i++){
                if(i % 2) colConst++;

                if(selectedRow+(i*rowConst) >= 1 && selectedRow+(i*rowConst) <= 10 && selectedCol+colConst >= 1 && selectedCol+colConst <= 10){
                    Hexes.push(`${selectedRow+(i*rowConst)}*${selectedCol+colConst}`);
                }
            }
        }else{
            for(let i = 1; i <= 5; i++){
                if(!(i % 2)) colConst++;

                if(selectedRow+(i*rowConst) >= 1 && selectedRow+(i*rowConst) <= 10 && selectedCol-colConst >= 1 && selectedCol-colConst <= 10){
                    Hexes.push(`${selectedRow+(i*rowConst)}*${selectedCol-colConst}`);
                }
            }
        }
    }else {
        let rowConst = row - selectedRow;
        if(col - selectedCol){
            for(let i = 1; i <= 5; i++){
                if(i % 2) colConst++;

                if(selectedRow+(i*rowConst) >= 1 && selectedRow+(i*rowConst) <= 10 && selectedCol-colConst >= 1 && selectedCol-colConst <= 10){
                    Hexes.push(`${selectedRow+(i*rowConst)}*${selectedCol-colConst}`);
                }
            }
        }else{
            for(let i = 1; i <= 5; i++){
                if(!(i % 2)) colConst++;

                if(selectedRow+(i*rowConst) >= 1 && selectedRow+(i*rowConst) <= 10 && selectedCol+colConst >= 1 && selectedCol+colConst <= 10){
                    Hexes.push(`${selectedRow+(i*rowConst)}*${selectedCol+colConst}`);
                }
            }
        }
    }

    Hexes.forEach(id => {
        placeItem(null, id);
        socket.emit("ItemData", missionCode, role, null, id, "break");
    });

    flashing(Hexes, null);
    guessingHex(Hexes);
    breakItem(Hexes);
    cancelSelectedPiece();
}


// def skill