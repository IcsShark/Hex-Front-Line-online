let selectedSpawn = Array(5).fill(null);
let selectedPiece = null;
let characters = Array(5).fill(null);

let role = (GetCookie("role")=="P1")? "atk" : "def";
let missionCode = getCode();
let countdownInterval;
let step = 0;
let point = 0;

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
    socket.on("roundEvent",handleEventData);
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

    if (piece) {
        console.log('selectedRole: ' + piece);
        cancelSelectedPiece();
        selectedPiece = hexagon;
        selectedPiece.classList.add('selected');
        return;
    }

    if (!selectedPiece) return;

    //move
    if (selectedPiece.classList.contains('moving') && hexagon.classList.contains('surround')) {
        surroundEffect(selectedPiece, false);
        movePiece(selectedPiece, hexagon);
        selectedPiece.classList.remove('selected');
        sendMoveData(piece, hexagon.getAttribute('name'));
        selectedPiece = null;
    }
    //attack
    else if (selectedPiece.classList.contains('attacking') && hexagon.classList.contains('surround')) {
        surroundEffect(selectedPiece, false);
        attackTargetHex(piece, hexagon);
        selectedPiece.classList.remove('selected');
        selectedPiece = null;
    }
    //skill
    else if (selectedPiece.classList.contains('usingSkill')) {
        switch (selectedPiece.getAttribute('piece')) {
            case "horus":
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
                horusSkill();
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

function attackTargetHex(attacker, hexagon){
    socket.emit("attack", missionCode, role, attacker, hexagon.getAttribute('name'));
    socket.on("", () => {

    });
}

function surroundEffect(hex, act){
    const [row, col] = hex.getAttribute('name').split('*').map(Number);
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
        if((role == "atk" && inSpawn) || (role == "def" && !inSpawn)){
            for (let i = 0; i < 5; i++) {
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

    const availableSpawns = [];

    for (let row = 1; row <= 10; row++) {
        for (let col = 1; col <= 10; col++) {
            const isExcluded = redSpawns.some(sp => sp.row === row && sp.col === col);
            if (!isExcluded) {
                availableSpawns.push({ row, col });
            }
        }
    }

    const randomSpawns = [];
    while (randomSpawns.length < 5) {
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

function handleRoundData(round, data){
    console.log(round);

    const roundElement = document.getElementById('round');
    roundElement.textContent = `${round}`;

    if(( role == "atk" && (round % 2) ) || (role == "def" && !(round % 2))){
        createActButtons();
        startRound();
    }else{
        deleteActButtons();
    }
}

function handleEventData(){

}

function startRound(){
    let countdown = 30;
    
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
        endRound(null);
    }
}

function endRound(data){
    deleteActButtons();
    cancelSelectedPiece();
    const countdownElement = document.getElementById('timer');
    countdownElement.textContent = '';
    clearInterval(countdownInterval);
    socket.emit("endRound", missionCode);
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

function sendMoveData(piece, destination){
    socket.emit("characterMoving", missionCode, role, piece, destination);
}

// atk skill

function horusSkill(){
    surroundEffect(selectedPiece,true);
}

// def skill