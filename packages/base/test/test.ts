/* eslint-disable functional/immutable-data */
import type { Stack } from '../src/util/support/Stack'

import '../src/unsafe/Operators'

import Benchmark from 'benchmark'

import { MutableStack } from '../src/util/support/MutableStack'
import { makeStack } from '../src/util/support/Stack'

import * as E from '../src/Either'

