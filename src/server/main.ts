/*
 This is the main entrypoint for the server build of afterthought.
 Any updates here should probably be reflected in the singleplayer version.
*/

import {
  createChunkName,
  getChunkFromPosition,
  getChunkPosition,
} from "../constants.ts";
import { World } from "./world.ts";

class Server {
  world: World;

  constructor() {
    this.world = new World();

    // setInterval(this.tick.bind(this), 1000 / 20)
  }

  tick() {
    this.world.update();
  }

  buildMesh(chunkName: string) {
    const [chunkX, chunkY, chunkZ] = getChunkPosition(chunkName);
    const chunks: Record<string, string[][][]> = {};

    const chunkNames = [
      this.world.generateTerrain(chunkName),
      this.world.generateTerrain(createChunkName(chunkX + 1, chunkY, chunkZ)),
      this.world.generateTerrain(createChunkName(chunkX - 1, chunkY, chunkZ)),
      this.world.generateTerrain(createChunkName(chunkX, chunkY + 1, chunkZ)),
      this.world.generateTerrain(createChunkName(chunkX, chunkY - 1, chunkZ)),
      this.world.generateTerrain(createChunkName(chunkX, chunkY, chunkZ + 1)),
      this.world.generateTerrain(createChunkName(chunkX, chunkY, chunkZ - 1)),
    ];

    chunkNames.forEach((chunkName: string) => {
      chunks[chunkName] = this.world.chunks[chunkName];
    });

    return chunks;
  }

  breakBlock(x: number, y: number, z: number) {
    const chunk = this.world.removeBlock(x, y, z);

    return chunk;
  }

  getChunk(chunkName: string) {
    this.world.generateTerrain(chunkName);

    return this.world.chunks[chunkName];
  }

  placeBlock(x: number, y: number, z: number, block: string) {
    const chunk = this.world.setBlock(x, y, z, block);

    return chunk;
  }
}

const connections: WebSocket[] = [];

const server = new Server();

server.world.addEventListener((type) => {
  connections.forEach((ws) => {
    if (ws.readyState !== ws.OPEN) return;

    ws.send(JSON.stringify(type));
  });
});

Deno.serve((req: Request) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }
  const { socket: ws, response } = Deno.upgradeWebSocket(req);

  function onClose() {
    console.log("Player left");
    connections.splice(connections.indexOf(ws), 1);
  }

  ws.onopen = () => {
    console.log("Player joined");
    connections.push(ws);

    setInterval(() => {
      if (
        ws.readyState === WebSocket.CLOSED &&
        ws.readyState === WebSocket.CLOSING
      ) {
        onClose();
      }
    }, 100);
  };

  ws.onclose = onClose;

  ws.onerror = (e) => console.log(e instanceof ErrorEvent ? e.message : e.type);

  ws.onmessage = async (e) => {
    try {
      const { command, packetId } = JSON.parse(e.data);

      switch (command) {
        case "buildMesh": {
          const { chunkName } = JSON.parse(e.data);

          const chunks = await server.buildMesh(chunkName);

          ws.send(JSON.stringify({
            command: "buildMesh",
            packetId,
            chunkName,
            chunks,
          }));

          return;
        }

        case "getChunk": {
          const { chunkName } = JSON.parse(e.data);

          const chunk = await server.getChunk(chunkName);

          ws.send(JSON.stringify({
            command: "getChunk",
            packetId,
            chunk,
          }));

          return;
        }

        case "breakBlock": {
          const { x, y, z } = JSON.parse(e.data);
          const chunkName = getChunkFromPosition(x, y, z);

          const chunk = await server.breakBlock(x, y, z);

          ws.send(JSON.stringify({
            command: "breakBlock",
            packetId,
            chunk,
          }));

          connections.forEach((ws) => {
            if (ws.readyState !== ws.OPEN) return;

            ws.send(JSON.stringify({
              command: "setChunk",
              chunk,
              chunkName,
            }));
          });
          return;
        }

        case "placeBlock": {
          const { x, y, z, block } = JSON.parse(e.data);
          const chunkName = getChunkFromPosition(x, y, z);

          const chunk = await server.placeBlock(
            x,
            y,
            z,
            block,
          );

          ws.send(JSON.stringify({
            command: "placeBlock",
            packetId,
            chunk,
          }));

          connections.forEach((ws) => {
            ws.send(JSON.stringify({
              command: "setChunk",
              chunk,
              chunkName,
            }));
          });
          return;
        }

        default: {
          throw ("Unknown command: " + command);
        }
      }
    } catch (err) {
      console.log("Malformed Input:", err);
    }
  };

  return response;
}, { port: 8000 });
