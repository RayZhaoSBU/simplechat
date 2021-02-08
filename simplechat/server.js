const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const mysql = require("mysql");
const cors = require("cors");

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'simplechat'
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatCord Bot';
const botAvatar = 'https://static.thenounproject.com/png/415502-200.png'

io.on('connection', socket => {
  socket.on('joinRoom', ({ name, username, email, avatar, room }) => {
    const user = userJoin(socket.id, name, username, email, avatar, room);
    socket.join(user.room);
    socket.emit('message', formatMessage(botName, botAvatar, 'Welcome to ChatCord!'));
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, botAvatar, `${user.username} has joined the chat`)
      );

    db.query(
      "INSERT INTO user (name, username, email, avatar) VALUES (?,?,?,?)",
      [name, username, email, avatar],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log("user Inserted");
        }
      }
    );

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    let message = formatMessage(user.username, user.avatar, msg);
    io.to(user.room).emit('message', message);
    saveMessageToDB(message);
  });

  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, botAvatar, `${user.username} has left the chat`)
      );

      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

app.post("/create", (req, res) => {
  const name = req.body.name;
  const username = req.body.username;
  const email = req.body.email;
  const avatar = req.body.avatar;
  db.query(
    "INSERT INTO user (name, username, email, avatar) VALUES (?,?,?,?)",
    [name, username, email, avatar],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("Values Inserted");
      }
    }
  );
});

app.get("/users", (req, res) => {
  db.query("SELECT * FROM user", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log("get users success");
      res.send(result);
    }
  });
});

app.put("/update", (req, res) => {
  const id = req.body.id;
  const name = req.body.name;
  const username = req.body.username;
  const email = req.body.email;
  const avatar = req.body.avatar;
  db.query(
    "UPDATE user SET name = ?, username = ?, email = ?, avatar = ? WHERE id = ?",
    [name, username, email, avatar, id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log('update success');
        res.send(result);
      }
    }
  );
});

app.put("/updateMessage", (req, res) => {
  const id = req.body.id;
  const senderid = req.body.senderid;
  const message = req.body.message;
  const senttime = req.body.senttime;
  db.query(
    "UPDATE messages SET senderid = ?, message = ?, senttime = ? WHERE id = ?",
    [senderid, message, senttime, id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log('update success');
        res.send(result);
      }
    }
  );
});

app.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM user WHERE id = ?", id, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.delete("/deleteMessage/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM messages WHERE id = ?", id, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log("delete message ", id)
      res.send(result);
    }
  });
});

function saveMessageToDB(message) {
  db.query(
    "INSERT INTO messages (sender, message, senttime) VALUES (?,?,?)",
    [message.username, message.text, message.time],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log("Values Inserted");
      }
    }
  );
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
