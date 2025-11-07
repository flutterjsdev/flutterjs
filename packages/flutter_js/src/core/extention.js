// transform.js  (run on every .js file that contains State<>)
export function transform(source) {
  return source.replace(
    /extends\s+State\s*<\s*([A-Za-z_$$ ][\w $$]*)\s*>/g,
    (_, name) => `extends StateOf(${name})`
  );
}