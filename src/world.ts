import * as THREE from "three";
import { textures } from "./textures";
import { Physics } from "./physics";
import { Player } from "./player";
import {
  createChunkName,
  generateMesh,
  getChunkFromPosition,
  getChunkPosition,
  getLocalPosition,
  mod,
} from "./constants";
import { getServer, Server } from "./server";
import settings from "./settings";

const generateMeshWorker = new Worker(
  new URL("./workers/generateMesh.ts", import.meta.url),
  {
    type: "module",
  },
);

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
      const { meshData, chunkName, colliders } = JSON
        .parse(event.data);

      // if (positions.length === 0) return;

      this.addChunk(
        meshData,
        chunkName,
        colliders,
      );
    };

    this.server.addEventListener(async (data) => {
      switch (data.command) {
        case ("setChunk"): {
          const { chunkName, chunk } = data;
          this.chunks[chunkName] = chunk;

          this.reloadChunks(chunkName);
        }
      }
    });
  }

  async generateTerrain(chunkName: string) {
    if (this.chunks.hasOwnProperty(chunkName)) return chunkName;

    const chunk = await this.server.getChunk(chunkName);

    this.chunks[chunkName] = chunk;

    return chunkName;
  }

  async buildMesh(
    chunkName: string,
    sync?: boolean,
  ) {
    const [chunkX, chunkY, chunkZ] = getChunkPosition(chunkName);

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

    chunk = await this.generateTerrain(
      createChunkName(chunkX + 1, chunkY, chunkZ),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX + 1, chunkY, chunkZ - 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX + 1, chunkY, chunkZ + 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX + 1, chunkY + 1, chunkZ),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX + 1, chunkY + 1, chunkZ - 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX + 1, chunkY + 1, chunkZ + 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX + 1, chunkY - 1, chunkZ),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX + 1, chunkY - 1, chunkZ - 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX + 1, chunkY - 1, chunkZ + 1),
    );
    validChunks[chunk] = this.chunks[chunk];

    chunk = await this.generateTerrain(
      createChunkName(chunkX - 1, chunkY, chunkZ),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX - 1, chunkY, chunkZ - 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX - 1, chunkY, chunkZ + 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX - 1, chunkY + 1, chunkZ),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX - 1, chunkY + 1, chunkZ - 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX - 1, chunkY + 1, chunkZ + 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX - 1, chunkY - 1, chunkZ),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX - 1, chunkY - 1, chunkZ - 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX - 1, chunkY - 1, chunkZ + 1),
    );
    validChunks[chunk] = this.chunks[chunk];

    chunk = await this.generateTerrain(
      createChunkName(chunkX, chunkY - 1, chunkZ),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX, chunkY - 1, chunkZ + 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX, chunkY - 1, chunkZ - 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX, chunkY + 1, chunkZ),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX, chunkY + 1, chunkZ + 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX, chunkY + 1, chunkZ - 1),
    );
    validChunks[chunk] = this.chunks[chunk];

    chunk = await this.generateTerrain(
      createChunkName(chunkX, chunkY, chunkZ + 1),
    );
    validChunks[chunk] = this.chunks[chunk];
    chunk = await this.generateTerrain(
      createChunkName(chunkX, chunkY, chunkZ - 1),
    );
    validChunks[chunk] = this.chunks[chunk];

    if (sync) {
      const { meshData, colliders } = generateMesh(
        chunkName,
        validChunks,
      );

      this.addChunk(
        meshData,
        chunkName,
        colliders,
      );
    } else {
      generateMeshWorker.postMessage({
        chunkName,
        chunks: validChunks,
      });
    }
  }

  addChunk(
    meshData: Record<
      string,
      { uv: number[]; uv2: number[]; positions: number[] }
    >,
    chunkName: string,
    colliders,
  ) {
    const [chunkX, chunkY, chunkZ] = getChunkPosition(chunkName);
    this.unloadChunk(chunkName);

    const meshes: THREE.Mesh[] = [];

    for (const [layer, rawMeshData] of Object.entries(meshData)) {
      const { positions, uv, uv2 } = rawMeshData;

      const geometry = new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(uv2, 2));
      geometry.computeVertexNormals();

      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 1;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      var grd = ctx.createLinearGradient(0, 0, 100, 0);
      grd.addColorStop(0, "#666666");
      grd.addColorStop(1, "white");

      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 100, 1);

      const material = new THREE.MeshBasicMaterial({
        map: textures["blocks"].combined,
        lightMap: new THREE.CanvasTexture(canvas),
      });

      if (layer === "transparent") {
        material.alphaTest = 0.15;
      }

      const mesh = new THREE.Mesh(
        geometry,
        material,
      );
      mesh.translateX(chunkX * 16);
      mesh.translateY(chunkY * 16);
      mesh.translateZ(chunkZ * 16);
      this.scene.add(mesh);

      meshes.push(mesh);
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

  unloadChunk(chunkName) {
    if (this.loadedChunkData[chunkName]) {
      const meshes = this.loadedChunkData[chunkName].meshes;
      if (meshes) {
        for (const mesh of meshes) {
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
    const position = player.physicsObject.translation();
    const chunkPos = [
      Math.floor(position.x / 16),
      Math.floor(position.y / 16),
      Math.floor(position.z / 16),
    ];
    const chunkName = createChunkName(chunkPos[0], chunkPos[1], chunkPos[2]);

    const viewDistance = settings.renderDistance;

    // unload chunks too far away
    for (let chunkName of Object.keys(this.loadedChunkData)) {
      let chunk = getChunkPosition(chunkName);
      if (Math.abs(chunkPos[0] - chunk[0]) > viewDistance + 1) {
        this.unloadChunk(chunkName);
      }
      if (Math.abs(chunkPos[1] - chunk[1]) > viewDistance + 1) {
        this.unloadChunk(chunkName);
      }
      if (Math.abs(chunkPos[2] - chunk[2]) > viewDistance + 1) {
        this.unloadChunk(chunkName);
      }
    }

    // load close chunks
    for (let x = -viewDistance; x < viewDistance; x++) {
      for (let y = -2; y < 2; y++) {
        for (let z = -viewDistance; z < viewDistance; z++) {
          const chunkName = await this.generateTerrain(createChunkName(chunkPos[0]+x, chunkPos[1]+y, chunkPos[2]+z));

          if (this.loadedChunkData.hasOwnProperty(chunkName)) continue;

          this.buildMesh(
            chunkName,
            sync,
          );
        }
      }
    }
  }

  async reloadChunks(chunkName: string) {
    const [chunkX, chunkY, chunkZ] = getChunkPosition(chunkName);

    this.buildMesh(createChunkName(chunkX, chunkY, chunkZ), true);
    this.buildMesh(createChunkName(chunkX - 1, chunkY, chunkZ), true);
    this.buildMesh(createChunkName(chunkX + 1, chunkY, chunkZ), true);
    this.buildMesh(createChunkName(chunkX, chunkY - 1, chunkZ), true);
    this.buildMesh(createChunkName(chunkX, chunkY + 1, chunkZ), true);
    this.buildMesh(createChunkName(chunkX, chunkY, chunkZ - 1), true);
    this.buildMesh(createChunkName(chunkX, chunkY, chunkZ + 1), true);
  }

  async removeBlock(x, y, z) {
    await this.server.breakBlock(x, y, z);

    this.reloadChunks(getChunkFromPosition(x, y, z));
  }

  async getBlock(x, y, z) {
    const chunkName = getChunkFromPosition(x, y, z);
    const [localX, localY, localZ] = getLocalPosition(x, y, z);

    await this.generateTerrain(chunkName);

    return this.chunks[chunkName][localX][localY][localZ];
  }

  async setBlock(x, y, z, block) {
    await this.server.placeBlock(x, y, z, block);
    this.reloadChunks(getChunkFromPosition(x, y, z));
  }
}
