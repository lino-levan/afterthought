import { Biomes } from "./biomes.ts";
import { blockUpdate, randomBlockTick } from "./blocks.ts";

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export class World {
  // A world is made up of many 16x16x16 chunks
  chunks: Record<string, string[][][]> = {};
  private seed: string;
  private biomes: Biomes;
  private listeners: ((type: Record<string, any>) => void)[] = [];

  constructor() {
    this.seed = (Math.random() + 1).toString(36).substring(2);
    this.biomes = new Biomes(this.seed);
  }

  generateTerrain(chunkX: number, chunkY: number, chunkZ: number) {
    const chunkName = `${chunkX}|${chunkY}|${chunkZ}`;

    if (chunkName in this.chunks) return chunkName;

    this.chunks[chunkName] = this.biomes.getChunk(chunkX, chunkY, chunkZ);

    return chunkName;
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

  removeBlock(globalX: number, globalY: number, globalZ: number) {
    const { chunkX, chunkY, chunkZ, x, y, z } = this.getChunkPosition(
      globalX,
      globalY,
      globalZ,
    );

    const chunkName = this.generateTerrain(chunkX, chunkY, chunkZ);

    this.chunks[chunkName][x][y][z] = "";

    this.doBlockUpdate(globalX, globalY, globalZ);

    return this.chunks[chunkName];
  }

  getBlock(globalX: number, globalY: number, globalZ: number) {
    const { chunkX, chunkY, chunkZ, x, y, z } = this.getChunkPosition(
      globalX,
      globalY,
      globalZ,
    );

    const chunkName = this.generateTerrain(chunkX, chunkY, chunkZ);

    return this.chunks[chunkName][x][y][z];
  }

  setBlock(globalX: number, globalY: number, globalZ: number, block: string) {
    const { chunkX, chunkY, chunkZ, x, y, z } = this.getChunkPosition(
      globalX,
      globalY,
      globalZ,
    );

    const chunkName = this.generateTerrain(chunkX, chunkY, chunkZ);

    this.chunks[chunkName][x][y][z] = block;

    this.doBlockUpdate(globalX, globalY, globalZ);

    return this.chunks[chunkName];
  }

  update() {
    let dirtyChunks: string[] = [];

    for (const chunkName of Object.keys(this.chunks)) {
      const chunk = chunkName.split("|").map((n) => parseInt(n));

      // this.generateTerrain(chunk[0] - 1, chunk[1], chunk[2]);
      // this.generateTerrain(chunk[0] + 1, chunk[1], chunk[2]);
      // this.generateTerrain(chunk[0], chunk[1] - 1, chunk[2]);
      // this.generateTerrain(chunk[0], chunk[1] + 1, chunk[2]);
      // this.generateTerrain(chunk[0], chunk[1], chunk[2] - 1);
      // this.generateTerrain(chunk[0], chunk[1], chunk[2] + 1);

      for (let i = 0; i < 50; i++) {
        const pos = [
          Math.floor(Math.random() * 16),
          Math.floor(Math.random() * 16),
          Math.floor(Math.random() * 16),
        ];
        const block = this.chunks[chunkName][pos[0]][pos[1]][pos[2]];

        dirtyChunks = [
          ...new Set([
            ...dirtyChunks,
            ...randomBlockTick(block, pos, chunk, this.chunks),
          ]),
        ];
      }
    }

    const chunks: Record<string, string[][][]> = {};

    dirtyChunks.forEach((chunkName) => {
      chunks[chunkName] = this.chunks[chunkName];
    });

    return dirtyChunks;
  }

  private doBlockUpdate(globalX: number, globalY: number, globalZ: number) {
    let dirtyChunks: string[] = [];
    const positions = [
      [globalX, globalY, globalZ],
      [globalX + 1, globalY, globalZ],
      [globalX - 1, globalY, globalZ],
      [globalX, globalY + 1, globalZ],
      [globalX, globalY - 1, globalZ],
      [globalX, globalY, globalZ + 1],
      [globalX, globalY, globalZ - 1],
    ];

    for (const position of positions) {
      const { chunkX, chunkY, chunkZ, chunkName, x, y, z } = this
        .getChunkPosition(
          position[0],
          position[1],
          position[2],
        );

      dirtyChunks = [
        ...dirtyChunks,
        ...blockUpdate(this.chunks[chunkName][x][y][z], [x, y, z], [
          chunkX,
          chunkY,
          chunkZ,
        ], this.chunks),
      ];
    }

    for (const dirtyChunk of dirtyChunks) {
      this.listeners.forEach((listener) =>
        listener({
          type: "setChunk",
          chunkName: dirtyChunk,
          chunk: this.chunks[dirtyChunk],
        })
      );
    }
  }

  addEventListener(callback: (type: Record<string, any>) => void) {
    this.listeners.push(callback);
  }
}
