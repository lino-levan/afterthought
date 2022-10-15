/*
 This is the main entrypoint for the server build of afterthought.
 Any updates here should probably be reflected in the singleplayer version.
*/

import { serve } from "https://deno.land/std@0.159.0/http/mod.ts";
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

  buildMesh(chunkX: number, chunkY: number, chunkZ: number) {
    const chunks: Record<string, string[][][]> = {};

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
  }

  breakBlock(globalX: number, globalY: number, globalZ: number) {
    const chunk = this.world.removeBlock(globalX, globalY, globalZ);

    return chunk;
  }

  getChunk(chunkX: number, chunkY: number, chunkZ: number) {
    const chunkName = this.world.generateTerrain(chunkX, chunkY, chunkZ);

    return this.world.chunks[chunkName];
  }

  placeBlock(globalX: number, globalY: number, globalZ: number, block: string) {
    const chunk = this.world.setBlock(globalX, globalY, globalZ, block);

    return chunk;
  }
}

const connections: WebSocket[] = [];

const server = new Server();

server.world.addEventListener((type)=>{
  connections.forEach((ws) => {
    if (ws.readyState !== ws.OPEN) return;

    ws.send(JSON.stringify(type));
  });
})

function reqHandler(req: Request) {
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
          const { chunkX, chunkY, chunkZ } = JSON.parse(e.data);

          const chunks = await server.buildMesh(chunkX, chunkY, chunkZ);

          ws.send(JSON.stringify({
            command: "buildMesh",
            packetId,
            chunkX,
            chunkY,
            chunkZ,
            chunks,
          }));

          return;
        }

        case "getChunk": {
          const { chunkX, chunkY, chunkZ } = JSON.parse(e.data);

          const chunk = await server.getChunk(chunkX, chunkY, chunkZ);

          ws.send(JSON.stringify({
            command: "getChunk",
            packetId,
            chunk,
          }));

          return;
        }

        case "breakBlock": {
          const { globalX, globalY, globalZ } = JSON.parse(e.data);

          const chunk = await server.breakBlock(globalX, globalY, globalZ);

          ws.send(JSON.stringify({
            command: "breakBlock",
            packetId,
            chunk,
          }));

          const { chunkName } = server.world.getChunkPosition(
            globalX,
            globalY,
            globalZ,
          );

          connections.forEach((ws) => {
            if (ws.readyState !== ws.OPEN) return;

            ws.send(JSON.stringify({
              command: "setChunk",
              chunk,
              chunkName,
              x: globalX,
              y: globalY,
              z: globalZ,
            }));
          });
          return;
        }

        case "placeBlock": {
          const { globalX, globalY, globalZ, block } = JSON.parse(e.data);

          const chunk = await server.placeBlock(
            globalX,
            globalY,
            globalZ,
            block,
          );

          ws.send(JSON.stringify({
            command: "placeBlock",
            packetId,
            chunk,
          }));

          const { chunkName } = server.world.getChunkPosition(
            globalX,
            globalY,
            globalZ,
          );

          connections.forEach((ws) => {
            ws.send(JSON.stringify({
              command: "setChunk",
              chunk,
              chunkName,
              x: globalX,
              y: globalY,
              z: globalZ,
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
}

serve(reqHandler, { port: 8000 });
