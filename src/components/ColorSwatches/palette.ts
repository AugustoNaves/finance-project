export const colorPalette = [
  { name: "Verde", value: "#3f8a6e" },
  { name: "Petróleo", value: "#3a8790" },
  { name: "Azul", value: "#4a78ad" },
  { name: "Violeta", value: "#7e68b0" },
  { name: "Ameixa", value: "#a3577c" },
  { name: "Telha", value: "#bb5e48" },
  { name: "Ocre", value: "#b8862e" },
  { name: "Oliva", value: "#7c8842" },
  { name: "Grafite", value: "#78837d" },
] as const;

export const defaultColor: string = colorPalette[0].value;
