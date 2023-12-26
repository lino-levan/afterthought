import { generateMesh } from "../constants";

onmessage = (event) => {
  const chunkName = event.data.chunkName;
  const chunks = event.data.chunks;

  const { meshData, colliders } = generateMesh(
    chunkName,
    chunks,
  );

  postMessage(
    JSON.stringify({
      meshData,
      chunkName,
      colliders,
    }),
  );
};
