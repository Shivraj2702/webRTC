import express from "express";
import { createServer } from 'http';
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const port = 9000;

const app = express();
const server = createServer(app);
const io = new Server(server);
const allusers = {};
const socketToUser = {};

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static("public"));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname + "/app/index.html"));
});

io.on('connection', (socket) => {
    socket.emit("update-users", allusers);
    console.log(`a user connected ${socket.id}`);
    
    socket.on("join-user", username => {
        console.log(`${username} socket joined connection`);
        allusers[username] = {username, id: socket.id};
        socketToUser[socket.id] = username;
        io.emit("joined", allusers);
    });
    
    socket.on("call-request", ({from, to}) => {
        console.log(`${from} is calling ${to}`);
        if (allusers[to]) {
            io.to(allusers[to].id).emit("call-request", {from});
        }
    });
    
    socket.on("offer", ({ from, to, offer }) => {
        console.log({from, to, offer});
        if (allusers[to]) {
            io.to(allusers[to].id).emit("offer", {from, to, offer});
        }
    });
    
    socket.on("answer", ({from, to, answer}) => {
        if (allusers[from]) {
            io.to(allusers[from].id).emit("answer", {from, to, answer});
        }
    });
    
    socket.on("end-call", ({from, to}) => {
        if (allusers[to]) {
            io.to(allusers[to].id).emit("end-call", {from, to});
        }
    });
    
    socket.on("call-ended", caller => {
        const [from, to] = caller;
        if (allusers[from]) {
            io.to(allusers[from].id).emit("call-ended", caller);
        }
        if (allusers[to]) {
            io.to(allusers[to].id).emit("call-ended", caller);
        }
    });
    
    socket.on("icecandidate", ({ candidate, to }) => {
        console.log({ candidate, to });
        if (allusers[to]) {
            io.to(allusers[to].id).emit("icecandidate", { candidate, to });
        }
    });
    
   
    socket.on("call-rejected", ({from, to}) => {
        console.log(`Call from ${from} to ${to} was rejected`);
        if (allusers[from]) {
            io.to(allusers[from].id).emit("call-rejected", {from, to});
        }
    });
    
    socket.on("disconnect", () => {
        console.log(`user disconnected ${socket.id}`);
        const username = socketToUser[socket.id];
        if (username) {
            delete allusers[username];
            delete socketToUser[socket.id];
        }
        io.emit("joined", allusers);
    });
});

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});