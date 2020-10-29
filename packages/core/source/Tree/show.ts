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

export const drawForest = <A>(S: Show<A>) => (forest: Forest<A>): string => draw(S)("\n", forest);

export const drawTree = <A>(S: Show<A>) => (tree: Tree<A>): string => S.show(tree.value) + drawForest(S)(tree.forest);

export const getShow = <A>(S: Show<A>): Show<Tree<A>> => ({
   show: drawTree(S)
});
