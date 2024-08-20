const socket = io();

let gamelock = ((GetCookie("state"))==="inGame") ? true : false;
console.log('state: '+GetCookie("state"));

function SetCookie(cname, cvalue){
    document.cookie = cname + '=' + cvalue + ';' + "path=/";
}

function GetCookie(cname){
    let c = document.cookie;
    let name = cname + '=';
    let clist = document.cookie.split(';');
    for(let i = 0; i < clist.length; i++) {
        let c = clist[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

socket.off("errorMessage");
socket.on("errorMessage", ErrorMessage);
function ErrorMessage(mes){
    alert(mes);
}

// cover
function saveName(){
    var playername = document.getElementById("name").value;
    if (playername.trim().length === 0 || playername === null){
        playername = "guest";
    }
    SetCookie("playername", playername);
    SetCookie("state", "init");
}

function getName(){
    var playername = GetCookie("playername");
    return playername;
}

function navigateToMenu(){
    window.location.href = '/menu';
}

// menu
function saveCode(){
    var missionCode = document.getElementById("code").value;
    var screen = document.querySelector('.screen');

    if (missionCode.trim().length === 0 || missionCode === null){
        screen.classList.add('error-background');
        
        setTimeout(() => {
            screen.classList.remove('error-background');
        }, 3500);

        ErrorMessage("error, please enter the mission code again");
    }
    else{
        SetCookie("Room", missionCode);
        joinRoom();
    }
}

function getCode(){
    return GetCookie("Room");
}

function joinRoom(){
    let roomid = getCode();
    window.location.href = `/room/${roomid}`;
    SetCookie("state","inRoom");
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('room')) {
        let roomid = getCode();
        let playername = getName();
        SetCookie("role","Spec");
        socket.emit('joinRoom', roomid, playername, "new");
        console.log("room loded");
        socket.on("updatePlayer",updatePlayers);
    }
});

//room
let newPlayerLock = true;

function updatePlayers(players) {
    const classNames = ["P1_list", "P2_list", "Spec_list"];
    classNames.forEach(className => {
        const elements = document.getElementsByClassName(className);
        elements[0].innerHTML = '';
    });
    players.forEach(player => {
        if(player.role === "P1"){
            element = document.getElementsByClassName("P1_list");
        }else if(player.role === "P2"){
            element = document.getElementsByClassName("P2_list");
        }else{
            element = document.getElementsByClassName("Spec_list");
        }
        element[0].insertAdjacentHTML("beforeend", `<div class="spec_nametag">${player.name}</div>`);
    });
    newPlayerLock = false;
}

function becomeP1(){
    if(gamelock) return;

    let missionCode = getCode();
    let playername = getName();
    let role = GetCookie("role");
    if((role == "P2" || role == "Spec")){
        socket.emit("P1",missionCode , playername, role);
        socket.once("P1", () =>{
            SetCookie("role","P1");
        })
    }
}

function becomeP2(){
    if(gamelock) return;

    let missionCode = getCode();
    let playername = getName();
    let role = GetCookie("role");
    if((role == "P1" || role == "Spec")){
        socket.emit("P2",missionCode , playername, role);
        socket.once("P2", () =>{
            SetCookie("role","P2");
        });
    }
}

function becomeSpec(){
    if(gamelock) return;

    let missionCode = getCode();
    let playername = getName();
    let role = GetCookie("role");
    if(role != "Spec"){
        socket.emit("Spec",missionCode , playername, role);
        socket.once("Spec", () =>{
            SetCookie("role","Spec");
        });
    }
}

function back(){
    window.location.href = `/`;
    SetCookie("playername", '');
    SetCookie("Room", '');
    SetCookie("state", "init");
}

function next(){
    if(gamelock) return;
    let missionCode = getCode();
    socket.emit("GameStart", missionCode);   
}

// rolePage

socket.once("GameLock", (lock) => {
    let role = GetCookie("role");
    let missionCode = getCode();
    
    if(lock) SetCookie("state", "inGame");
    window.location.href = `/room/${missionCode}/${role}`;
});

document.addEventListener('DOMContentLoaded', () => {
    if(gamelock){
        let missionCode = getCode();
        let playername = getName();

        socket.emit('joinRoom', missionCode, playername, "joinGame");

        if(document.getElementById('Spec_role')){
            socket.on("matchUp", SpecHandleMatchUp);
        }
        socket.once("MissionStart",MissionStart);
    }
});

function SpecHandleMatchUp(characters, role, act) { 
    if(act == "change"){
        characters.forEach((character, index) => {
            const roleElement = document.getElementById(`${role}${index+1}`);

            roleElement.className = `${role}Role`;
            if (character) {
                roleElement.classList.add(character);
            }
        });
    }else{
        const element = document.querySelector(`.${role}Lock`);
        element.classList.add('lock');
    }
}

function MissionStart(){
    let missionCode = getCode();
    window.location.href = `/mission/${missionCode}`;
}