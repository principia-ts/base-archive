import * as I from '../src/IO'
import * as IA from '../src/IOAspect'
import * as S from '../src/Schedule'

const x = I.fail('A')['@@'](IA.debug)
