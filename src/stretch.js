export function stretchLinear(pixelValue, lower, range) {
  return 255 * ((pixelValue - lower) / range);
}

export function stretchSqrt(pixelValue, lower, range) {
  return 255 * Math.sqrt((pixelValue - lower) / range);
}

export function stretchCuberoot(pixelValue, lower, range) {
  return 255 * ((pixelValue - lower) / range) ** 0.333;
}

export function stretchLog(pixelValue, lower, range) {
  return (255 * (Math.log(pixelValue) - lower)) / range;
}

export function stretchLoglog(pixelValue, lower, range) {
  return (255 * (Math.log(Math.log(pixelValue)) - lower)) / range;
}

export function stretchSqrtlog(pixelValue, lower, range) {
  return (255 * (Math.sqrt(Math.log(pixelValue)) - lower)) / range;
}
