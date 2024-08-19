const socket = io();

let selectedSpawn = Array(5).fill(null);
let selectedPiece = null;

let role = (GetCookie("role")=="atk")? "atk" : "def";
let missionCode = getCode();

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

            hexagon.addEventListener('click', function() {
                selectSpawn(this);
            });

            board.appendChild(hexagon);
        }
    }

    setInitPlace();
    socket.on("round",handleRoundData);
});

//basic move functions
function handleRoleHexClick(hexagon) {
    const piece = hexagon.getAttribute('piece');
    if(selectedPiece == hexagon){
        return;
    }

    if (selectedPiece && hexagon.classList.contains('surround')) {
        surroundEffect(selectedPiece,false);
        movePiece(selectedPiece, hexagon);
        selectedPiece.classList.remove('selected');
        selectedPiece = null;
    } else if (piece) {
        selectedPiece = hexagon;
        selectedPiece.classList.add('selected');
        surroundEffect(selectedPiece,true);
    }
}

function placePiece(Piece, id){
    const target = document.querySelector(`[name="${id}"]`);

    console.log(`Placing piece: ${Piece} on ${id}`);

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
function startGame(){
    checkSpawn();

    const hexagons = document.querySelectorAll('.hexagon');
    hexagons.forEach(hexagon => {
        hexagon.removeEventListener('click', selectSpawn);
        hexagon.addEventListener('click', handleRoleHexClick);
    });
    
}

function selectSpawn(){
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

    if (selectSpawn.includes(id)) {
        const index = selectedSpawn.indexOf(id);
        selectSpawn[index] = null;
    } else if (selectedSpawn.includes(null)) {
        if((role == "atk" && inSpawn) || (role == "def" && !inSpawn)){
            for (let i = 0; i < 5; i++) {
                if (selectedSpawn[i] === null) {
                    selectedSpawn[i] = id;
                    break;
                }
            }
        }
        
    }
}

function checkSpawn(){
    if(selectedSpawn.includes(null)){ // set defult spawn
        if(role == "atk"){
            selectedSpawn = [
                '1*1',
                '1*5',
                '1*6',
                '1*0',
                '10*1',
            ];
        }else{
            selectedSpawn = [
                '1*1',
                '1*5',
                '1*6',
                '1*0',
                '10*1',
            ];
        }
    }

    selectedSpawn.forEach(sp =>{
        const index = selectedSpawn.indexOf(sp);
        placePiece(characters[index],sp);
    });
}

function setInitPlace(){
    let countdown = 30;

    const countdownElement = document.createElement('div');// init timer
    countdownElement.id = 'countdown';
    countdownElement.style.position = 'absolute';
    countdownElement.style.top = '10px';
    countdownElement.style.left = '10px';
    countdownElement.style.fontSize = '20px';
    countdownElement.style.color = 'red';
    document.body.appendChild(countdownElement);

    const countdownInterval = setInterval(() => {
        countdownElement.textContent = `Game starts in: ${countdown} seconds`;
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval);
            document.body.removeChild(countdownElement);
            startGame();
        }
    }, 1000);
}

function handleRoundData(round, data){

}