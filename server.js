const express = require('express');
const path = require('path');
const app = express();
const port = 5000;

app.use(express.static(path.join(__dirname, 'src')));
app.listen(port, function(){
    console.log('Server is running on port ${port}');
});

let OnlinePlayers = 0;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/src/menu.html');
    OnlinePlayers += 1;
    console.log('Player connected');
})