export function generateFeature(
  feature: string,
  chunk: string[][][],
  basePosition: number[],
  config: any,
  prng: ()=>number
) {
  switch (feature) {
    case "tree": {
      if (basePosition[0] < 1 || basePosition[0] > 14) return;
      if (basePosition[1] < 1 || basePosition[1] > 10) return;
      if (basePosition[2] < 1 || basePosition[2] > 14) return;

      const pos = basePosition;

      if (chunk[pos[0]][pos[1] - 1][pos[2]] === "") return;

      chunk[pos[0]][pos[1]][pos[2]] = "wood";
      chunk[pos[0]][pos[1] + 1][pos[2]] = "wood";
      chunk[pos[0]][pos[1] + 2][pos[2]] = "wood";
      chunk[pos[0]][pos[1] + 3][pos[2]] = "wood";


      if(prng() < 0.5) chunk[pos[0] - 1][pos[1] + 2][pos[2]+1] = "leaves";
      if(prng() < 0.5) chunk[pos[0] - 1][pos[1] + 2][pos[2]-1] = "leaves";
      if(prng() < 0.5) chunk[pos[0] + 1][pos[1] + 2][pos[2]+1] = "leaves";
      if(prng() < 0.5) chunk[pos[0] + 1][pos[1] + 2][pos[2]-1] = "leaves";

      chunk[pos[0] + 1][pos[1] + 2][pos[2]] = "leaves";
      chunk[pos[0] - 1][pos[1] + 2][pos[2]] = "leaves";
      chunk[pos[0]][pos[1] + 2][pos[2]+1] = "leaves";
      chunk[pos[0]][pos[1] + 2][pos[2]-1] = "leaves";

      chunk[pos[0] + 1][pos[1] + 3][pos[2]] = "leaves";
      chunk[pos[0] + 1][pos[1] + 3][pos[2]+1] = "leaves";
      chunk[pos[0] + 1][pos[1] + 3][pos[2]-1] = "leaves";
      chunk[pos[0] - 1][pos[1] + 3][pos[2]] = "leaves";
      chunk[pos[0] - 1][pos[1] + 3][pos[2]+1] = "leaves";
      chunk[pos[0] - 1][pos[1] + 3][pos[2]-1] = "leaves";
      chunk[pos[0]][pos[1] + 3][pos[2]+1] = "leaves";
      chunk[pos[0]][pos[1] + 3][pos[2]-1] = "leaves";

      chunk[pos[0] + 1][pos[1] + 4][pos[2]] = "leaves";
      chunk[pos[0] - 1][pos[1] + 4][pos[2]] = "leaves";
      chunk[pos[0]][pos[1] + 4][pos[2] + 1] = "leaves";
      chunk[pos[0]][pos[1] + 4][pos[2] - 1] = "leaves";
      chunk[pos[0]][pos[1] + 4][pos[2]] = "leaves";

      break;
    }
    case "temple": {
      if (basePosition[0] < 1 || basePosition[0] > 14) return;
      if (basePosition[1] < 1 || basePosition[1] > 10) return;
      if (basePosition[2] < 1 || basePosition[2] > 14) return;

      const pos = basePosition;

      chunk[pos[0] + 1][pos[1] - 1][pos[2] + 1] = "sandstone";
      chunk[pos[0] + 1][pos[1]][pos[2] + 1] = "sandstone";
      chunk[pos[0] + 1][pos[1] + 1][pos[2] + 1] = "sandstone";
      chunk[pos[0] + 1][pos[1] + 2][pos[2] + 1] = "sandstone";

      chunk[pos[0] + 1][pos[1] - 1][pos[2] - 1] = "sandstone";
      chunk[pos[0] + 1][pos[1]][pos[2] - 1] = "sandstone";
      chunk[pos[0] + 1][pos[1] + 1][pos[2] - 1] = "sandstone";
      chunk[pos[0] + 1][pos[1] + 2][pos[2] - 1] = "sandstone";

      chunk[pos[0] - 1][pos[1] - 1][pos[2] + 1] = "sandstone";
      chunk[pos[0] - 1][pos[1]][pos[2] + 1] = "sandstone";
      chunk[pos[0] - 1][pos[1] + 1][pos[2] + 1] = "sandstone";
      chunk[pos[0] - 1][pos[1] + 2][pos[2] + 1] = "sandstone";

      chunk[pos[0] - 1][pos[1] - 1][pos[2] - 1] = "sandstone";
      chunk[pos[0] - 1][pos[1]][pos[2] - 1] = "sandstone";
      chunk[pos[0] - 1][pos[1] + 1][pos[2] - 1] = "sandstone";
      chunk[pos[0] - 1][pos[1] + 2][pos[2] - 1] = "sandstone";

      chunk[pos[0] + 1][pos[1] + 2][pos[2]] = "sandstone";
      chunk[pos[0] - 1][pos[1] + 2][pos[2]] = "sandstone";
      chunk[pos[0]][pos[1] + 2][pos[2] + 1] = "sandstone";
      chunk[pos[0]][pos[1] + 2][pos[2] - 1] = "sandstone";

      break;
    }

    case "speckle": {
      if (basePosition[1] < 1) return;

      const pos = basePosition;

      if (chunk[pos[0]][pos[1] - 1][pos[2]] === "") return;

      const block = config?.block || "short_grass";

      chunk[pos[0]][pos[1]][pos[2]] = block;

      break;
    }

    case "patch": {
      let radius = config?.radius || 3;
      const block = config?.block || "stone";
      const replace = config?.replace || true;
      const sphere = config?.sphere || false;

      if (sphere) {
        radius += 1;
      }

      if (basePosition[0] < radius || basePosition[0] > 14 - radius) return;
      if (basePosition[1] < radius || basePosition[1] > 14 - radius) return;
      if (basePosition[2] < radius || basePosition[2] > 14 - radius) return;

      for (let x = -radius; x < radius; x++) {
        for (let y = -radius; y < radius; y++) {
          for (let z = -radius; z < radius; z++) {
            const rX = x + basePosition[0];
            const rY = y + basePosition[1];
            const rZ = z + basePosition[2];

            if (
              replace && typeof replace === "boolean"
                ? chunk[rX][rY][rZ] === ""
                : chunk[rX][rY][rZ] !== replace
            ) {
              continue;
            }
            if (sphere && Math.sqrt(x * x + y * y + z * z) > radius) continue;

            chunk[rX][rY][rZ] = block;
          }
        }
      }

      break;
    }
  }
}
