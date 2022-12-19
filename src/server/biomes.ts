import { createNoise2D, createNoise3D, NoiseFunction2D } from "simplex-noise";
import Alea from "alea";
import { generateFeature } from "./features.ts";
import { getChunkPosition } from "../constants.ts";

function map(
  x: number,
  in_min: number,
  in_max: number,
  out_min: number,
  out_max: number,
) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

const biomes: Record<string, {
  height: number;
  smoothness: number;
  jaggedness: number;
  base: number;
  layers: {
    block: string;
    belowRelative?: number;
    aboveRelative?: number;
    aboveAbsolute?: number;
    aboveRandom?: number;
  }[];
  features: {
    name: string;
    belowAbsolute?: number;
    aboveAbsolute?: number;
    aboveRandom?: number;
    atSurface?: boolean;
    config?: any;
  }[];
}> = {
  desert: {
    height: 20,
    smoothness: 100,
    jaggedness: 1,
    base: 0,
    layers: [
      { block: "sand", belowRelative: 0 },
      { block: "sandstone", belowRelative: 3 },
    ],
    features: [
      { name: "temple", aboveRandom: 0.9999, atSurface: true },
      {
        name: "speckle",
        aboveRandom: 0.995,
        atSurface: true,
        config: { block: "short_cactus" },
      },
    ],
  },
  plains: {
    height: 4,
    smoothness: 100,
    jaggedness: 1,
    base: 0,
    layers: [
      { block: "grass", belowRelative: 0 },
      { block: "dirt", belowRelative: 1 },
      { block: "rock", belowRelative: 4 },
    ],
    features: [
      { name: "tree", aboveRandom: 0.99, atSurface: true },
      {
        name: "patch",
        aboveRandom: 0.99,
        atSurface: true,
        config: { block: "dirt", sphere: true, radius: 3, replace: "grass" },
      },
      {
        name: "patch",
        aboveRandom: 0.999,
        config: { block: "copium", sphere: true, radius: 1, replace: "rock" },
      },
      {
        name: "speckle",
        aboveRandom: 0.95,
        atSurface: true,
        config: { block: "short_grass" },
      },
    ],
  },
  mountain: {
    height: 100,
    smoothness: 100,
    jaggedness: 4,
    base: 30,
    layers: [
      { block: "rock", belowRelative: 0 },
      { block: "copium", belowRelative: 0, aboveRandom: 0.99 },
      { block: "snow", belowRelative: 0, aboveAbsolute: 35 },
      { block: "snow", belowRelative: 0, aboveAbsolute: 30, aboveRandom: 0.1 },
      { block: "snow", belowRelative: 0, aboveAbsolute: 25, aboveRandom: 0.2 },
      { block: "snow", belowRelative: 0, aboveAbsolute: 20, aboveRandom: 0.4 },
    ],
    features: [
      {
        name: "patch",
        aboveRandom: 0.995,
        config: { block: "copium", sphere: true, radius: 1, replace: "rock" },
      },
    ],
  },
};

export class Biomes {
  private seed: string;
  private biomeNoise: NoiseFunction2D;

  constructor(seed: string) {
    this.seed = seed;
    this.biomeNoise = createNoise2D(Alea(this.seed));
  }

  getHeight(x: number, z: number, biome: string, noise2D: NoiseFunction2D) {
    let val =
      (noise2D(x / biomes[biome].smoothness, z / biomes[biome].smoothness) **
        biomes[biome].jaggedness) *
      biomes[biome].height * 1 / 2;
    val += (noise2D(
      x / (biomes[biome].smoothness / 2),
      z / (biomes[biome].smoothness / 2),
    ) ** biomes[biome].jaggedness) * biomes[biome].height * 1 / 4;
    val += (noise2D(
      x / (biomes[biome].smoothness / 4),
      z / (biomes[biome].smoothness / 4),
    ) ** biomes[biome].jaggedness) * biomes[biome].height * 1 / 8;
    val += (noise2D(
      x / (biomes[biome].smoothness / 8),
      z / (biomes[biome].smoothness / 8),
    ) ** biomes[biome].jaggedness) * biomes[biome].height * 1 / 16;

    val += biomes[biome].base;
    return val;
  }

  getChunk(chunkName: string) {
    const [chunkX, chunkY, chunkZ] = getChunkPosition(chunkName);
    const prngByChunk = Alea(`${this.seed}|${chunkName}`);
    const prng = Alea(this.seed);
    const noise2D = createNoise2D(prng);
    const noise3D = createNoise3D(prng);

    const chunk: string[][][] = [];

    // fill chunk with air
    for (let x = 0; x < 16; x++) {
      chunk.push([]);
      for (let y = 0; y < 16; y++) {
        chunk[x].push([]);
        for (let z = 0; z < 16; z++) {
          chunk[x][y].push("");
        }
      }
    }

    // generate blocks from heightmap
    this.runPass(
      (x, y, z, aX, aY, aZ) => {
        if (chunk[x][y][z] !== "") return;

        let height = 0;
        const n = Object.keys(biomes).length;
        const l = map(this.biomeNoise(aX / 1000, aZ / 1000), -1, 1, -1 / n, 1);

        const max = 0;
        let biome = "";
        for (let i = 0; i < n; i++) {
          if (l >= (i - 1) / n && l <= (i + 1) / n) {
            const weight = (-Math.abs(n * l - i) + 1);
            if (weight > max) {
              biome = Object.keys(biomes)[i];
            }
            height += weight *
              this.getHeight(aX, aZ, Object.keys(biomes)[i], noise2D);
          }
        }

        height = Math.round(height);

        if (!biome) return;

        if (aY < height) {
          const dy = height - aY;
          for (
            const {
              block,
              belowRelative,
              aboveRelative,
              aboveAbsolute,
              aboveRandom,
            } of biomes[biome].layers
          ) {
            if (aboveRelative !== undefined && dy >= aboveRelative) continue;
            if (belowRelative !== undefined && dy <= belowRelative) continue;
            if (aboveAbsolute !== undefined && aY < aboveAbsolute) continue;
            if (
              aboveRandom !== undefined && aboveRandom > prngByChunk()
            ) {
              continue;
            }
            if (
              (noise3D(aX / 200, aY / 200, aZ / 200) * 1 / 2) > 0 &&
              (noise3D(aX / 200, aY / 200, aZ / 200) * 1 / 2) +
                    (noise3D(aX / 100, aY / 100, aZ / 100) * 1 / 4) +
                    (noise3D(aX / 50, aY / 50, aZ / 50) * 1 / 8) > 0.5
            ) continue;

            chunk[x][y][z] = block;
          }
        }
      },
      chunkX,
      chunkY,
      chunkZ,
    );

    // add features
    this.runPass(
      (x, y, z, aX, aY, aZ) => {
        if (chunk[x][y][z] !== "") return;

        let height = 0;
        const n = Object.keys(biomes).length;
        const l = map(this.biomeNoise(aX / 1000, aZ / 1000), -1, 1, -1 / n, 1);

        const max = 0;
        let biome = "";
        for (let i = 0; i < n; i++) {
          if (l >= (i - 1) / n && l <= (i + 1) / n) {
            const weight = (-Math.abs(n * l - i) + 1);
            if (weight > max) {
              biome = Object.keys(biomes)[i];
            }
            height += weight *
              this.getHeight(aX, aZ, Object.keys(biomes)[i], noise2D);
          }
        }

        height = Math.round(height);

        if (!biome) return;

        for (
          const {
            name,
            aboveAbsolute,
            belowAbsolute,
            aboveRandom,
            atSurface,
            config,
          } of biomes[biome].features
        ) {
          if (atSurface !== undefined && atSurface && aY !== height) continue;
          if (aboveAbsolute !== undefined && aY > aboveAbsolute) continue;
          if (belowAbsolute !== undefined && aY < belowAbsolute) continue;
          if (aboveRandom !== undefined && aboveRandom > prngByChunk()) {
            continue;
          }

          generateFeature(name, chunk, [x, y, z], config, prngByChunk);
          break;
        }
      },
      chunkX,
      chunkY,
      chunkZ,
    );

    return chunk;
  }

  runPass(
    callback: (
      x: number,
      y: number,
      z: number,
      aX: number,
      aY: number,
      aZ: number,
    ) => void,
    chunkX: number,
    chunkY: number,
    chunkZ: number,
  ) {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 16; z++) {
          callback(
            x,
            y,
            z,
            x + (chunkX * 16),
            y + (chunkY * 16),
            z + (chunkZ * 16),
          );
        }
      }
    }
  }
}
