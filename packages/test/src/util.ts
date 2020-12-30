export type WidenLiteral<A> = string extends A ? string : number extends A ? number : boolean extends A ? boolean : A
