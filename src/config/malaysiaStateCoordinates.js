// Approximate [longitude, latitude] centroid for each Malaysian state,
// keyed to match the canonical names from src/lib/geoNames.js (ALL_STATES).
// Used to place state-level bubbles/dots on maps that need more states
// than a component's own small hardcoded list already covers.
export const MALAYSIA_STATE_COORDINATES = {
  Johor: [103.3256, 2.0301],
  Kedah: [100.3685, 6.1210],
  Kelantan: [102.2386, 6.1254],
  Melaka: [102.2501, 2.1896],
  'Negeri Sembilan': [102.2500, 2.7258],
  Pahang: [102.5000, 3.8000],
  Perak: [101.0901, 4.5921],
  Perlis: [100.2048, 6.4449],
  'Pulau Pinang': [100.3327, 5.4141],
  Sabah: [116.0753, 5.9788],
  Sarawak: [113.9213, 2.5574],
  Selangor: [101.5264, 3.0738],
  Terengganu: [103.1000, 4.9000],
  'W.P. Kuala Lumpur': [101.6869, 3.1390],
  'W.P. Putrajaya': [101.6964, 2.9264],
  'W.P. Labuan': [115.2308, 5.2831],
};
