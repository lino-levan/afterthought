import { generateMesh } from "../constants";

onmessage = (event) => {
  const chunkX = event.data.chunkX;
  const chunkY = event.data.chunkY;
  const chunkZ = event.data.chunkZ;
  const chunkName = `${chunkX}|${chunkY}|${chunkZ}`;
  const chunks = event.data.chunks;

  const { meshData, colliders } = generateMesh(
    chunkX,
    chunkY,
    chunkZ,
    chunkName,
    chunks,
  );

  postMessage(
    JSON.stringify({
      meshData,
      chunkX,
      chunkY,
      chunkZ,
      chunkName,
      colliders,
    }),
  );
};
