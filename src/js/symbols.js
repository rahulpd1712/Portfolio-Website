// Code symbols used by the intro burst and the hero particle field.
// The backslash is built with fromCharCode so this file never needs a
// literal backslash (which shell heredocs can mangle).
export const SYMBOLS = [
  '{', '}', '<', '/', '>', ';',
  '(', ')', '#', '=', String.fromCharCode(92), '*', '+'
];

export function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}
