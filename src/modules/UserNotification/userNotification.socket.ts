import { SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { Socket, Server } from "socket.io";
import { BaseSocket } from "src/core/socket/BaseSocket";

@WebSocketGateway({ namespace: "userNotification" })
export class UserNotificationSocket extends BaseSocket {
  namespace = "/userNotification";
  constructor() {
    super();
    this.logger.setContext("UserNotificationSocket");
  }

  @SubscribeMessage("msgToServer")
  handleMessage(client: Socket, payload: string): void {
    this.server.emit("msgToClient", payload);
  }

  @SubscribeMessage("sendNotification")
  async sendNotification(client, { notification }) {
    const { users, ...notificationWithoutUsers } = notification;
    // go through each user, and emit to each of the sockets each user has
    users.forEach(async (notificationUser) => {
      const userNotification = {
        ...notificationWithoutUsers,
        read: notificationUser.read,
      };
      this.getUserSockets(notificationUser.user).forEach((socket) =>
        socket.emit(`${this.namespace}:receiveNotification`, userNotification)
      );
    });
  }
  @SubscribeMessage("updateNotification")
  async updateNotification(client, { notification, users }) {
    users.forEach(async (userId) => {
      this.getUserSockets(userId).forEach((socket) =>
        socket.emit(`${this.namespace}:receiveNotification`, notification)
      );
    });
  }
  @SubscribeMessage("sendUserUnreadCount")
  async unreadCount(client, { count, users }) {
    users.forEach(async (userId) => {
      this.getUserSockets(userId).forEach((socket) =>
        socket.emit(`${this.namespace}:receiveUnreadCount`, count)
      );
    });
  }
}
