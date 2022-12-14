import { World } from "./server/world";

export class Server {
  ip?: string;
  private ws?: WebSocket;
  world: World;
  private packetId = 0;
  private callbacks: ((data: any) => void)[] = [];
  private eventListener: ((data: any) => void)[] = [];

  constructor(ip?: string) {
    this.ip = ip;

    if (ip) {
      this.ws = new WebSocket(ip);

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.packetId in this.callbacks) {
          this.callbacks[data.packetId](data);

          delete this.callbacks[data.packetId];
        } else {
          this.eventListener.forEach((eventListener) => {
            eventListener(data);
          });
        }
      };
    } else {
      this.world = new World();
      // setInterval(this.tick.bind(this), 1000 / 20)

      this.world.addEventListener((data: Record<string, any>) => {
        this.eventListener.forEach((eventListener) => {
          eventListener(data);
        });
      });
    }
  }

  connection(): Promise<void> {
    return new Promise((resolve) => {
      const ws = this.ws;

      if (!ws) return resolve();

      function connected() {
        if (ws?.readyState === ws?.OPEN) {
          resolve();
        } else {
          setTimeout(connected, 10);
        }
      }

      connected();
    });
  }

  addEventListener(eventListener: (data: any) => void) {
    this.eventListener.push(eventListener);
  }

  runCommand(data: Record<string, any>): Promise<any> {
    this.packetId++;

    return new Promise((resolve) => {
      const resCallback = (data: any) => {
        resolve(data);
      };

      this.callbacks[this.packetId] = resCallback;

      this.ws?.send(JSON.stringify({
        ...data,
        packetId: this.packetId,
      }));
    });
  }

  tick() {
    this.world.update();
  }

  async buildMesh(chunkX: number, chunkY: number, chunkZ: number) {
    const chunks: Record<string, string[][][]> = {};

    if (!this.ip) {
      const chunkNames = [
        this.world.generateTerrain(chunkX, chunkY, chunkZ),
        this.world.generateTerrain(chunkX + 1, chunkY, chunkZ),
        this.world.generateTerrain(chunkX - 1, chunkY, chunkZ),
        this.world.generateTerrain(chunkX, chunkY + 1, chunkZ),
        this.world.generateTerrain(chunkX, chunkY - 1, chunkZ),
        this.world.generateTerrain(chunkX, chunkY, chunkZ + 1),
        this.world.generateTerrain(chunkX, chunkY, chunkZ - 1),
      ];

      chunkNames.forEach((chunkName) => {
        chunks[chunkName] = this.world.chunks[chunkName];
      });

      return chunks;
    } else {
      const { chunks } = await this.runCommand({
        command: "buildMesh",
        chunkX,
        chunkY,
        chunkZ,
      });

      return chunks;
    }
  }

  async breakBlock(globalX: number, globalY: number, globalZ: number) {
    if (!this.ip) {
      const chunk = this.world.removeBlock(globalX, globalY, globalZ);

      return chunk;
    } else {
      const { chunk } = await this.runCommand({
        command: "breakBlock",
        globalX,
        globalY,
        globalZ,
      });
      return chunk;
    }
  }

  async getChunk(chunkX: number, chunkY: number, chunkZ: number) {
    if (!this.ip) {
      const chunkName = this.world.generateTerrain(chunkX, chunkY, chunkZ);

      return this.world.chunks[chunkName];
    } else {
      const { chunk } = await this.runCommand({
        command: "getChunk",
        chunkX,
        chunkY,
        chunkZ,
      });
      return chunk;
    }
  }

  async placeBlock(
    globalX: number,
    globalY: number,
    globalZ: number,
    block: string,
  ) {
    if (!this.ip) {
      const chunk = this.world.setBlock(globalX, globalY, globalZ, block);

      return chunk;
    } else {
      const { chunk } = await this.runCommand({
        command: "placeBlock",
        globalX,
        globalY,
        globalZ,
        block,
      });
      return chunk;
    }
  }
}

let server: Server | null = null; // new Server("ws://localhost:8000")

export function setServer(ip?: string) {
  server = new Server(ip);
}

export function getServer(): Server {
  return server!;
}
