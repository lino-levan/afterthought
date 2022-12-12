import {
  getChunkFromPosition,
  getChunkPosition,
  getLocalPosition,
} from "../constants.ts";
import { Biomes } from "./biomes.ts";
import { blockUpdate, randomBlockTick } from "./blocks.ts";

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

  generateTerrain(chunkName: string) {
    if (chunkName in this.chunks) return chunkName;

    this.chunks[chunkName] = this.biomes.getChunk(chunkName);

    return chunkName;
  }

  removeBlock(x: number, y: number, z: number) {
    const chunkName = getChunkFromPosition(x, y, z);
    const [localX, localY, localZ] = getLocalPosition(x, y, z);

    this.generateTerrain(chunkName);

    this.chunks[chunkName][localX][localY][localZ] = "";

    this.doBlockUpdate(x, y, z);

    return this.chunks[chunkName];
  }

  getBlock(x: number, y: number, z: number) {
    const chunkName = getChunkFromPosition(x, y, z);
    const [localX, localY, localZ] = getLocalPosition(x, y, z);

    this.generateTerrain(chunkName);

    return this.chunks[chunkName][localX][localY][localZ];
  }

  setBlock(x: number, y: number, z: number, block: string) {
    const chunkName = getChunkFromPosition(x, y, z);
    const [localX, localY, localZ] = getLocalPosition(x, y, z);

    this.generateTerrain(chunkName);

    this.chunks[chunkName][localX][localY][localZ] = block;

    this.doBlockUpdate(x, y, z);

    return this.chunks[chunkName];
  }

  update() {
    let dirtyChunks: string[] = [];

    for (const chunkName of Object.keys(this.chunks)) {
      const chunk = getChunkPosition(chunkName);

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

  private doBlockUpdate(x: number, y: number, z: number) {
    let dirtyChunks: string[] = [];
    const positions = [
      [x, y, z],
      [x + 1, y, z],
      [x - 1, y, z],
      [x, y + 1, z],
      [x, y - 1, z],
      [x, y, z + 1],
      [x, y, z - 1],
    ];

    for (const position of positions) {
      dirtyChunks = [
        ...dirtyChunks,
        ...blockUpdate(
          position,
          this.chunks,
        ),
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
