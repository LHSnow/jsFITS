export function isString(val) {
  return val.startsWith("'");
}

export function isDate(val) {
  return val.match(/\d+-\d+-\d+T.+/g);
}

export function isBoolean(val) {
  return val.match(/^[TF]$/);
}

export function isFloat(val) {
  return val.includes('.');
}
