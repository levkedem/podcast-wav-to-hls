## Project Structure

```
.
├── podcast-hls-server/     # Backend server (NestJS)
├── podcast-hls-client/     # Frontend client (React)
├── input/                  # here the wav files are saved
└── output/                 # here each "playlist" is saved in designated folder
```

## Prerequisites

- FFmpeg installed on your system is needed

### run backend (Server)

cd podcast-hls-server
npm install

to activate:
npm run start:dev

### run frontend (Client)

cd podcast-hls-client
npm install

to activate:
npm run dev

## Development

### Backend is using:

- WebSocket + socket.io - for client continues updates
- FFmpeg - for file conversion
- nestjs - as the framework

### Frontend is using:

- PrimeReact - for UI components(the button :))
- Socket.IO client - for real-time updates
- axios - for the http requests
- react-toastify - for the toast
