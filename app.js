require('dotenv').config();
const http = require('http');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const app = express();

let roomMembers = [];
let isRoomCreated = false;
let roomOwnerName = '';
let roomAvatarName = '';
let messages = [];

const server = http.createServer(app);
const io = socketIO(server);

io.on('connection', (socket) => {
    console.log('New user connected');
  
    socket.on('roomCreated', (newRoom) => {
        isRoomCreated = true;
        roomOwnerName = newRoom.roomOwner;
        roomAvatarName = newRoom.avatar;
        io.emit('welcomeToChat');
    });

    socket.on('newMessage', (newMsg) => {
        messages.push(newMsg);
        io.emit('newMessageReceived', {
            ...newMsg
        });
    })

    socket.on('roomDestroyed', () => {
        isRoomCreated = false;
        messages = [];
        roomMembers = roomMembers.filter((name) => name !== roomOwnerName);
        roomOwnerName = '';
        roomAvatarName = '';
        io.emit('redirectToAvatar');
    });
  
    socket.on('disconnect', () => {
      console.log('User was disconnected');
    });
  });

app.set('view engine', 'ejs');   // Set EJS as templating engine

app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res){ 
    res.render('index');
});

app.get('/avatar/:username',(req, res, next) => {
    if(!roomMembers.includes(req.params.username)) {
        res.redirect('/');
    }
    else if(!isRoomCreated) {
        next();
    }
    else {
        res.redirect('/chatRoom/' + req.params.username);
    }
},(req,res) => {
    res.render('avatar', {
        name: req.params.username,
    });
}); 

app.get('/chatRoom/:username',(req, res, next) => {
    if(!roomMembers.includes(req.params.username)) {
        res.redirect('/');
    }
    else if(isRoomCreated) {
        next();
    }
    else {
        res.redirect('/avatar/'+ req.params.username);
    }
},(req,res) => {
    res.render('chatRoom', {
        name: req.params.username,
        isRoomOwner: req.params.username === roomOwnerName,
        messages,
    });
});

app.post('/addname', function(req,res){
    const obj = req.body;
    if(roomMembers.includes(obj.name)) {
        res.send('-1');
    }
    else {
        roomMembers.push(obj.name);
        res.send('USER ADDED');
    }
});

app.get('/getAllMessages', function(req, res) {
    res.send(messages);
});

server.listen(process.env.PORT, () => {
    console.log('Server Started on ' + process.env.PORT);
});