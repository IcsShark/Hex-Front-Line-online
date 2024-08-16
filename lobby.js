const socket = sessionStorage.getItem('socket') ? io.connect(sessionStorage.getItem('socket')) : io(); // keep in the same io socket
if (!sessionStorage.getItem('socket')) {
    sessionStorage.setItem('socket', socket.io.uri);
}

let gamelock = (GetCookie("inGame")=="true") ? true : false;

function SetCookie(cname, cvalue){
    document.cookie = cname + '=' + cvalue + ';';
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
// cover
function saveName(){
    var playername = document.getElementById("name").value;
    if (playername.trim().length === 0 || playername === null){
        playername = "guest";
    }
    SetCookie("playername", playername);
    SetCookie("inGame", "false");
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

        alert("error, please enter the mission code again");
    }
    else{
        //alert("#" + missionCode + " mission start");
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
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('room')) {
        let roomid = getCode();
        let playername = getName();
        SetCookie("role","Spec");
        socket.emit('joinRoom', roomid, playername, "new");
        console.log("room loded");
    }
});

//room
let newPlayerLock = true;

socket.on("updatePlayer", (players) => {
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
});

function becomeP1(){
    if(gamelock) return;

    let missionCode = getCode();
    let playername = getName();
    let role = GetCookie("role");
    if((role == "P2" || role == "Spec")){
        socket.emit("P1",missionCode , playername, role);
        socket.on("P1", () =>{
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
        socket.on("P2", () =>{
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
        socket.on("Spec", () =>{
            SetCookie("role","Spec");
        });
    }
}

function back(){
    navigateToMenu();
    SetCookie("Room", '');
}

function next(){
    if(gamelock) return;
    let missionCode = getCode();
    socket.emit("GameStart", missionCode);   
}

// rolePage

socket.on("GameLock", (lock) => {
    let role = GetCookie("role");
    let missionCode = getCode();
    
    gamelock = lock;
    SetCookie("inGame", "true");
    window.location.href = `/room/${missionCode}/${role}`;
});

document.addEventListener('DOMContentLoaded', () => {
    console.log(gamelock);
    if(gamelock){
        let missionCode = getCode();
        let playername = getName();

        socket.emit('joinRoom', missionCode, playername, "joinGame");
        console.log('inGame');

        if (document.getElementById('Spec_role')) {
            socket.on('test',() => {
                console.log('recieved test');
            });
            socket.on("matchUp", handleMatchUp);
            console.log('add io listener');
        }
    }
});

function handleMatchUp(characters, role, act) {
console.log('recieved character data');
    if(act == "change"){
        characters.forEach((character, index) => {
            const roleElement = document.getElementById(`${role}${index+1}`);

            roleElement.className = `${role}Role`;
            if (character) {
                roleElement.classList.add(character);
            } 
        })
    }else{
        const element = querySelector(`.${role}Lock`);
        element.classList.add('lock');
    }

}