export default function randomInRangeWithExclude(
  min: number,
  max: number,
  exclude: number[] = [],
): number {
  // a really clever solution from this Stack Overflow answer: https://stackoverflow.com/a/64910550
  let num = Math.floor(Math.random() * (max - min - exclude.length) + min);

  exclude
    .slice()
    .sort((a, b) => a - b)
    .every((e) => e <= num && (num++, true));

  return num;
}
