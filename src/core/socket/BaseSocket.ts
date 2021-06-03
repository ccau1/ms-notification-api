import { Logger, NotFoundException } from "@nestjs/common";
import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  WsException,
  SubscribeMessage,
} from "@nestjs/websockets";
import axios from "axios";
import { ObjectId } from "mongoose";
import { Socket, Server, BroadcastOperator } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export class BaseSocket
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  protected logger: Logger = new Logger();
  namespace: string;

  _afterInit = (server) => {
    server.use((socket, next) => {
      if (
        !this.isCurrentNamespace(socket) ||
        !socket.handshake.query ||
        !socket.handshake.query.token
      ) {
        return next();
      }
      this.logger.log(`User init connect`);
      const token = socket.handshake.query.token;
      socket.instantiated = false;
      next(this.setUserByToken(socket, token));
    });
  };
  getUserSockets = (userId: string | ObjectId): Socket[] => {
    const userRoom = this.getUserRoom(userId.toString());
    return Object.values((userRoom as any).sockets as { [id: string]: Socket });
  };
  getUserRoom = (userId: string): BroadcastOperator<DefaultEventsMap> => {
    return this.server.in(`USER:${userId}`);
  };
  isCurrentNamespace = (socket) => {
    return socket.nsp.name === this.namespace;
  };
  setUserByToken = async (socket, token) => {
    if (this.isCurrentNamespace(socket)) {
      this.logger.log(`User logging in: ${socket.id}`);
      const currentUserResponse = await axios(
        `${process.env.API_ACCOUNT}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // if remote api call fails, throw error
      if (
        currentUserResponse.status !== 200 ||
        !currentUserResponse.data?.payload
      ) {
        throw new NotFoundException({
          code: "data__not_exists",
          payload: {
            key: "key_user",
          },
        });
      }
      // extract current user
      const currentUser = currentUserResponse.data.payload;

      if (currentUser) {
        this.logger.log(`User logged in: ` + currentUser.email);
        socket.instantiated = false;
        socket.user = currentUser;
        socket.join(`USER:${currentUser._id}`);
        socket.emit("authenticated");
        this.handleConnection(socket);
        return true;
      } else {
        this.logger.log(`User login failed`);
        socket.join(`ANON:${currentUser._id}`);
        socket.user = null;
        socket.emit("unauthorized");
        return new WsException("unAuthorized");
      }
    }
  };

  @SubscribeMessage("authenticate")
  async authenticateUser(client, { token }) {
    if (this.isCurrentNamespace(client)) {
      await this.setUserByToken(client, token);
    }
    this.logger.log("User authenticated", client.id);
    return Promise.resolve();
  }

  @SubscribeMessage("logout")
  async logout(client) {
    if (this.isCurrentNamespace(client)) {
      this.handleLogout(client);
    }
    return Promise.resolve();
  }

  _handleConnection = (socket) => {
    socket.instantiated = true;
  };

  _handleDisconnect = (socket) => {
    this.logger.log(
      `User disconnected (${socket.user ? socket.user.email : "ANON"})`
    );
  };

  _handleLogout = (socket: Socket) => {
    Object.keys(socket.rooms).forEach((key) => {
      if (key.includes(":")) {
        // leave room
        socket.leave(key);
      }
    });
  };

  afterInit(server: Server) {
    this._afterInit(server);
    this.logger.log("Init");
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // [...client.rooms].forEach((r) => client.leave(r));
  }

  handleConnection(client: Socket, ...args: any[]) {
    this._handleConnection(client);
    this.logger.log(`Client connected: ${client.id}`);
  }
  handleLogout(socket) {
    this._handleLogout(socket);
  }
}
