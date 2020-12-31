/* eslint-disable functional/immutable-data */
import type { Stack } from '../src/util/support/Stack'

import '../src/unsafe/Operators'

import Benchmark from 'benchmark'

import { MutableStack } from '../src/util/support/MutableStack'
import { makeStack } from '../src/util/support/Stack'

const suite = new Benchmark.Suite('Rolling Buffer Stack vs Pointer Stack')

suite
  .add('Rolling Buffer Stack', () => {
    const stack = new MutableStack<number>()
    for (let i = 0; i < 100; i++) {
      stack.push(Math.random())
    }
    for (let i = 0; i < 100; i++) {
      stack.pop()
    }
  })
  .add('Pointer Stack', () => {
    let stack  = undefined as Stack<number> | undefined
    const push = (n: number) => {
      stack = makeStack(n, stack?.previous)
    }
    const pop = () => {
      const v = stack?.value
      stack   = stack?.previous
      return v
    }
    for (let i = 0; i < 100; i++) {
      push(Math.random())
    }
    for (let i = 0; i < 100; i++) {
      pop()
    }
  })
  .on('cycle', (event: any) => {
    console.log(String(event.target))
  })
  .run()
