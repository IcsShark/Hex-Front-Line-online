let rolelock = false;
let Characters = 0;
let selectedRoles = Array(5).fill(null);
const atkCharacters = ["horus", "volatile", "horus", "horus", "snipe", "snipe", "snipe", "snipe",];
const defCharacters = ["citadel", "citadel", "citadel", "citadel", "citadel", "citadel", "citadel", "citadel"];

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

function createButtons(role) {
    const lineOne = document.querySelector('.lineOne');
    const lineTwo = document.querySelector('.lineTwo');

    if(role === "atk") {
        var firstHalf = atkCharacters.slice(0, 4);
        var secondHalf = atkCharacters.slice(4, 8);
    }else{
        var firstHalf = defCharacters.slice(0, 4);
        var secondHalf = defCharacters.slice(4, 8);
    }

    firstHalf.forEach(name => {
        let button = document.createElement('div');
        button.className = `${name}Button`;
        button.setAttribute('name', name);
        lineOne.appendChild(button);
    });

    secondHalf.forEach(name => {
        let button = document.createElement('div');
        button.className = `${name}Button`;
        button.setAttribute('name', name);
        lineTwo.appendChild(button);
    });
}

let role = (GetCookie("role")=="P1")? "def" : "atk";
let buttons;

document.addEventListener("DOMContentLoaded", () => {
    createButtons(role);
    
    if(role == "atk"){
        buttons = document.querySelectorAll('.horusButton, .volatileButton, .snipeButton');
    }else{
        buttons = document.querySelectorAll('.citadelButton');
    }
    const affectedElement = document.querySelector('.animate');

    buttons.forEach(button => {
        const animationClass = button.getAttribute('name');
        let isSelected = false;
        let index = -1;

        button.addEventListener('click', () => {
            if(rolelock) return;

            const badge = document.getElementById('badge');
            if(isSelected){
                badge.classList.remove(animationClass);
                selectedRoles[index] = null;
                index = -1;
                Characters -= 1;
                displayCharacterNumber(button, Characters, index, false);
            }else{
                if(Characters >= 5) return;

                badge.className = 'roleBadge';
                badge.classList.add(animationClass);
                Characters += 1;
                for (let i = 0; i < 5; i++) {
                    if (selectedRoles[i] === null) {
                        selectedRoles[i] = animationClass;
                        index = i;
                        break;
                    }
                }
                displayCharacterNumber(button, Characters, index, true);
            }

            isSelected = !isSelected;
            button.classList.toggle('selected', isSelected);
            socket.emit("characters", selectedRoles, role, "change");
        });

        button.addEventListener('mouseover', () => {
            if(rolelock) return;

            affectedElement.className = 'animate';
            void affectedElement.offsetWidth;
            affectedElement.classList.add(animationClass);
        });

        button.addEventListener('mouseout', () => {
            if(rolelock || isSelected) return;

            affectedElement.classList.remove(animationClass);
        });
    });
});

function displayCharacterNumber(button, Characters ,index, act) {
    const count = document.getElementById('counter');
    if(act){
        if((Characters-1) > 0){
            count.className = 'counter';
        }

        if(role == "atk"){
            count.classList.add(`a0${Characters}`);
        }else{
            count.classList.add(`d0${Characters}`);
        }

        let numberImage = document.createElement('img');
        numberImage.src = `image/${role}0${index+1}.png`;
        numberImage.classList.add('character-index');
        button.appendChild(numberImage);
    }else{

        count.className = 'counter';
        if(Characters){
            if(role == "atk"){
                count.classList.add(`a0${Characters}`);
            }else{
                count.classList.add(`d0${Characters}`);
            }
        }

        const numberImage = button.querySelector('.character-index');
        if (numberImage) {
            button.removeChild(numberImage);
        }
    }
}


function roleLocker(){
    if(Characters == 5){
        rolelock = true;
        const ready = document.querySelector('.ready');
        ready.classList.add('lock');
        console.log("characters: "+selectedRoles);
        socket.emit("roleLocker", selectedRoles, role, "lock");
    }
}