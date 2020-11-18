import type { Show } from "@principia/prelude";

import type { Forest, Tree } from "./model";

const draw = <A>(S: Show<A>) => (indentation: string, forest: Forest<A>): string => {
  let r = "";
  const len = forest.length;
  let tree: Tree<A>;
  for (let i = 0; i < len; i++) {
    tree = forest[i];
    const isLast = i === len - 1;
    r += indentation + (isLast ? "└" : "├") + "─ " + S.show(tree.value);
    r += draw(S)(indentation + (len > 1 && !isLast ? "│  " : "   "), tree.forest);
  }
  return r;
};

export function drawForest<A>(S: Show<A>): (forest: Forest<A>) => string {
  return (forest) => draw(S)("\n", forest);
}

export function drawTree<A>(S: Show<A>): (tree: Tree<A>) => string {
  return (tree) => S.show(tree.value) + drawForest(S)(tree.forest);
}

export function getShow<A>(S: Show<A>): Show<Tree<A>> {
  return {
    show: drawTree(S)
  };
}
