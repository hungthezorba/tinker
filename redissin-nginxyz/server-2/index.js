const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3003;
const redis = require("redis");
const APPID = process.env.APPID;

const publisher = redis.createClient({
	port: 6379,
	host: "127.0.0.1",
});
const subscriber = redis.createClient({
	port: 6379,
	host: "127.0.0.1",
});

var connections = [];

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/index.html");
});

subscriber.on("message", (channel, message) => {
	console.log(
		`Server ${APPID} received message in channel ${channel}: ${message}`
	);
	connections.forEach((c) => {
		c.emit("chat message", message); // emit the chat message among socket connections
	});
});

io.on("connection", (socket) => {
	// On receiving chat message
	socket.on("chat message", (msg) => {
		console.log(`${APPID} received message`);
		// Publish the message to livechat
		publisher.publish("livechat", msg);
	});
	console.log("connection incoming");
	connections.push(socket);
});

// subcribe to the live chat
subscriber.subscribe("livechat");

http.listen(port, () => {
	console.log(`Socket.IO server running at http://localhost:${port}/`);
});
