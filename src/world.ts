import * as THREE from "three";
import { textures } from "./textures";
import { Physics } from "./physics";
import { Player } from "./player";
import { generateMesh } from "./constants";
import { getServer, Server } from "./server";

const generateMeshWorker = new Worker(
  new URL("./workers/generateMesh.ts", import.meta.url),
  {
    type: "module",
  },
);

function mod(n, m) {
  return ((n % m) + m) % m;
}

export class World {
  // A world is made up of many 16x16x16 chunks
  private chunks: Record<string, string[][][]> = {};
  private loadedChunkData: Record<
    string,
    { meshes: THREE.Mesh[] | null; colliders: string[] | null }
  > = {};
  scene: THREE.Scene;
  private physics: Physics;
  private server: Server;

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene;
    this.physics = physics;
    this.server = getServer();

    generateMeshWorker.onmessage = (event) => {
      const { meshData, chunkX, chunkY, chunkZ, chunkName, colliders } =
        JSON.parse(event.data);

      // if (positions.length === 0) return;

      this.addChunk(
        meshData,
        chunkX,
        chunkY,
        chunkZ,
        chunkName,
        colliders,
      );
    };

    this.server.addEventListener(async (data) => {
      switch (data.command) {
        case ("setChunk"): {
          const { chunkName, chunk } = data;
          this.chunks[chunkName] = chunk;

          this.reloadChunks({ chunkName });
        }
      }
    });
  }

  async generateTerrain(chunkX, chunkY, chunkZ) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`;

    if (this.chunks.hasOwnProperty(chunkName)) return chunkName;

    const chunk = await this.server.getChunk(chunkX, chunkY, chunkZ);

    this.chunks[chunkName] = chunk;

    return chunkName;
  }

  async buildMesh(
    chunkX: number,
    chunkY: number,
    chunkZ: number,
    sync?: boolean,
  ) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`;

    if (!this.loadedChunkData.hasOwnProperty(chunkName)) {
      this.loadedChunkData[chunkName] = {
        meshes: null,
        colliders: null,
      };
    }

    if (!this.chunks.hasOwnProperty(chunkName)) {
      throw "Tried to build mesh before chunk was generated";
    }

    let validChunks = {};
    let chunk = chunkName;
    validChunks[chunkName] = this.chunks[chunkName];

    chunk = await this.generateTerrain(chunkX + 1, chunkY, chunkZ);
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(chunkX - 1, chunkY, chunkZ);
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(chunkX, chunkY + 1, chunkZ);
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(chunkX, chunkY - 1, chunkZ);
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(chunkX, chunkY, chunkZ + 1);
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(chunkX, chunkY, chunkZ - 1);
    validChunks[chunk] = this.chunks[chunk];

    if (sync) {
      const { meshData, colliders } = generateMesh(
        chunkX,
        chunkY,
        chunkZ,
        chunkName,
        validChunks,
      );

      this.addChunk(
        meshData,
        chunkX,
        chunkY,
        chunkZ,
        chunkName,
        colliders,
      );
    } else {
      generateMeshWorker.postMessage({
        chunkX,
        chunkY,
        chunkZ,
        chunks: validChunks,
      });
    }
  }

  addChunk(meshData: Record<string, {uv: number[], positions: number[]}>, chunkX: number, chunkY: number, chunkZ: number, chunkName: string, colliders) {
    this.unloadChunk(chunkX, chunkY, chunkZ);

    const meshes: THREE.Mesh[] = []

    for(const [layer, rawMeshData] of Object.entries(meshData)) {
      const { positions, uv } = rawMeshData;

      const geometry = new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(uv, 2));
      geometry.computeVertexNormals();

      const material = new THREE.MeshBasicMaterial({ map: textures["blocks"].combined })

      if(layer === "transparent") {
        material.alphaTest = 0.15
      }

      const mesh = new THREE.Mesh(
        geometry,
        material,
      );
      mesh.translateX(chunkX * 16);
      mesh.translateY(chunkY * 16);
      mesh.translateZ(chunkZ * 16);
      this.scene.add(mesh);

      meshes.push(mesh)
    }

    // add colliders
    let physColliders: string[] = [];
    for (let pos of colliders) {
      physColliders.push(this.physics.addBlock(pos[0], pos[1], pos[2]));
    }

    this.loadedChunkData[chunkName] = {
      meshes,
      colliders: physColliders,
    };
  }

  unloadChunk(chunkX, chunkY, chunkZ) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`;

    if (this.loadedChunkData[chunkName]) {
      const meshes = this.loadedChunkData[chunkName].meshes
      if(meshes) {
        for(const mesh of meshes) {
          mesh.removeFromParent();
          mesh.geometry.dispose();
  
          if (Array.isArray(mesh.material)) {
            mesh.material.map((mat) => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }

      const colliders = this.loadedChunkData[chunkName].colliders;
      if (colliders !== null) {
        for (let collider of colliders) {
          this.physics.removeBlock(collider);
        }
      }

      // Remove mesh from rendering
      delete this.loadedChunkData[chunkName];
    }
  }

  async update(player: Player, sync?: boolean) {
    let position = player.physicsObject.translation();
    let chunkPos = [
      Math.floor(position.x / 16),
      Math.floor(position.y / 16),
      Math.floor(position.z / 16),
    ];

    const viewDistance = 3;

    // unload chunks too far away
    for (let chunkName of Object.keys(this.loadedChunkData)) {
      let chunk = chunkName.split("|").map((n) => parseInt(n));
      if (Math.abs(chunkPos[0] - chunk[0]) > viewDistance + 1) {
        this.unloadChunk(chunk[0], chunk[1], chunk[2]);
      }
      if (Math.abs(chunkPos[1] - chunk[1]) > viewDistance + 1) {
        this.unloadChunk(chunk[0], chunk[1], chunk[2]);
      }
      if (Math.abs(chunkPos[2] - chunk[2]) > viewDistance + 1) {
        this.unloadChunk(chunk[0], chunk[1], chunk[2]);
      }
    }

    // load close chunks
    for (let x = -viewDistance; x < viewDistance; x++) {
      for (let y = -2; y < 2; y++) {
        for (let z = -viewDistance; z < viewDistance; z++) {
          let chunkName = await this.generateTerrain(
            x + chunkPos[0],
            y + chunkPos[1],
            z + chunkPos[2],
          );

          if (this.loadedChunkData.hasOwnProperty(chunkName)) continue;

          this.buildMesh(
            x + chunkPos[0],
            y + chunkPos[1],
            z + chunkPos[2],
            sync,
          );
        }
      }
    }
  }

  getChunkPosition(globalX: number, globalY: number, globalZ: number) {
    const chunkX = Math.floor(globalX / 16);
    const chunkY = Math.floor(globalY / 16);
    const chunkZ = Math.floor(globalZ / 16);

    const x = mod(globalX, 16);
    const y = mod(globalY, 16);
    const z = mod(globalZ, 16);

    return {
      chunkX,
      chunkY,
      chunkZ,
      chunkName: `${chunkX}|${chunkY}|${chunkZ}`,
      x,
      y,
      z,
    };
  }

  async reloadChunks(
    { global, chunk, chunkName }: {
      global?: { x: number; y: number; z: number };
      chunk?: { x: number; y: number; z: number };
      chunkName?: string
    },
  ) {
    if (chunk) {
      this.buildMesh(chunk.x, chunk.y, chunk.z, true);
      this.buildMesh(chunk.x - 1, chunk.y, chunk.z, true);
      this.buildMesh(chunk.x + 1, chunk.y, chunk.z, true);
      this.buildMesh(chunk.x, chunk.y - 1, chunk.z, true);
      this.buildMesh(chunk.x, chunk.y + 1, chunk.z, true);
      this.buildMesh(chunk.x, chunk.y, chunk.z - 1, true);
      this.buildMesh(chunk.x, chunk.y, chunk.z + 1, true);
    } else if (chunkName) {
      const [chunkX, chunkY, chunkZ] = chunkName.split("|").map((v)=>parseInt(v))
      this.buildMesh(chunkX, chunkY, chunkZ, true);
      this.buildMesh(chunkX - 1, chunkY, chunkZ, true);
      this.buildMesh(chunkX + 1, chunkY, chunkZ, true);
      this.buildMesh(chunkX, chunkY - 1, chunkZ, true);
      this.buildMesh(chunkX, chunkY + 1, chunkZ, true);
      this.buildMesh(chunkX, chunkY, chunkZ - 1, true);
      this.buildMesh(chunkX, chunkY, chunkZ + 1, true);
    } else  if (global) {
      const { chunkX, chunkY, chunkZ, x, y, z } = this.getChunkPosition(
        global.x,
        global.y,
        global.z,
      );

      this.buildMesh(chunkX, chunkY, chunkZ, true);

      // deal with chunk boundaries
      if (x === 0) {
        this.buildMesh(chunkX - 1, chunkY, chunkZ, true);
      }
      if (x === 15) {
        this.buildMesh(chunkX + 1, chunkY, chunkZ, true);
      }
      if (y === 0) {
        this.buildMesh(chunkX, chunkY - 1, chunkZ, true);
      }
      if (y === 15) {
        this.buildMesh(chunkX, chunkY + 1, chunkZ, true);
      }
      if (z === 0) {
        this.buildMesh(chunkX, chunkY, chunkZ - 1, true);
      }
      if (z === 15) {
        this.buildMesh(chunkX, chunkY, chunkZ + 1, true);
      }
    }
  }

  async removeBlock(globalX, globalY, globalZ) {
    await this.server.breakBlock(globalX, globalY, globalZ);

    this.reloadChunks({ global: { x: globalX, y: globalY, z: globalZ } });
  }

  async getBlock(globalX, globalY, globalZ) {
    const { chunkX, chunkY, chunkZ, x, y, z } = this.getChunkPosition(
      globalX,
      globalY,
      globalZ,
    );

    const chunkName = await this.generateTerrain(chunkX, chunkY, chunkZ);

    return this.chunks[chunkName][x][y][z];
  }

  async setBlock(globalX, globalY, globalZ, block) {
    await this.server.placeBlock(globalX, globalY, globalZ, block);
    this.reloadChunks({ global: { x: globalX, y: globalY, z: globalZ } });
  }
}
