let io = null;

export function setIO(socketIO) {
  io = socketIO;
}

export function getIO() {
  return io;
}

export function emitToAdmins(event, data) {
  if (io) {
    io.to('admin').emit(event, data);
  }
}

export function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitSubmissionProcessed(data) {
  emitToAdmins('submission:processed', data);
}
