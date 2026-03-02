import { io } from "socket.io-client";

const URL =
  import.meta.env.MODE === "production" ? "/" : "http://localhost:3001";

const socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
