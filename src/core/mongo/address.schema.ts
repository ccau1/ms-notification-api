export default {
  type: { type: String, default: "Feature" },
  geometry: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },
  properties: {
    text: { type: String, default: "", sparse: true },
    country: { type: String, default: "", sparse: true },
    state: { type: String, default: "", sparse: true },
    city: { type: String, default: "", sparse: true },
    district: { type: String, default: "", sparse: true },
    administrative_area_1: { type: String, default: "", sparse: true },
    estate: { type: String, default: "", sparse: true },
    building: { type: String, default: "", sparse: true },
    floor: { type: Number, sparse: true },
    unit: { type: String, default: "", sparse: true },
    elevation_m: { type: Number, sparse: true },
  },
};
