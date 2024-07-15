function SetCookie(cname, cvalue){
    document.cookie = cname + '=' + cvalue + ';';
}

function GetCookie(cname){
    let c = document.cookie;
    let name = cname + '=';
    if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
    }
}

function saveName(){
    var playername = document.getElementById("name").value;
    if (playername == "" || playername == null){
        playername = "guest";
    }
    alert("Welcome to HFL, "+playername);
    SetCookie("playername", playername);
}

function getName(){
    let playername = GetCookie("playername");
    alert("Welcome to HFL again, "+playername);
}

function navigateToMenu(){
    window.location.href = '/menu';
}