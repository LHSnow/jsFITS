// TODO: refactor to skip this disable
/* eslint-disable no-nested-ternary */

export function colormapHeat(v) {
  return {
    r: v <= 127.5 ? v * 2 : 255,
    g: v > 63.75 ? (v < 191.25 ? (v - 63.75) * 2 : 255) : 0,
    b: v > 127.5 ? (v - 127.5) * 2 : 0,
  };
}

export function colormapA(v) {
  return {
    r: v <= 63.75 ? 0 : v <= 127.5 ? (v - 63.75) * 4 : 255,
    g:
      v <= 63.75
        ? v * 4
        : v <= 127.5
        ? (127.5 - v) * 4
        : v < 191.25
        ? 0
        : (v - 191.25) * 4,
    b:
      v < 31.875
        ? 0
        : v < 127.5
        ? ((v - 31.875) * 8) / 3
        : v < 191.25
        ? (191.25 - v) * 4
        : 0,
  };
}

export function colormapB(v) {
  return {
    r: v <= 63.75 ? 0 : v <= 127.5 ? (v - 63.75) * 4 : 255,
    g: v <= 127.5 ? 0 : v <= 191.25 ? (v - 127.5) * 4 : 255,
    b:
      v < 63.75
        ? v * 4
        : v < 127.5
        ? (127.5 - v) * 4
        : v < 191.25
        ? 0
        : (v - 191.25) * 4,
  };
}

export function colormapGray(v) {
  return { r: v, g: v, b: v };
}
