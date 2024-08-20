

document.addEventListener('DOMContentLoaded', () => {
    const board = document.querySelector(".board");

    socket.on("GameData", handleGameData);
});

function handleGameData(round, Data){

}