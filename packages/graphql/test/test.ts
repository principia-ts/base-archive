import '@principia/base/unsafe/Operators'

import { flow } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import * as HM from '@principia/base/HashMap'
import * as O from '@principia/base/Option'
import * as I from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as L from '@principia/io/Layer'
import * as S from '@principia/io/Stream'
import * as K from '@principia/koa'
import { runMain } from '@principia/node/Runtime'

import { DefaultGraphQlInterpreters } from '../src/schema'
import { makeGraphQl } from '../src/server/koa'

const gql = makeGraphQl(DefaultGraphQlInterpreters)(
  {
    subscriptions: { onConnect: () => I.effectTotal(() => console.log('Connected')) },
    playground: {
      subscriptionEndpoint: 'ws://localhost:4000'
    }
  },
  ({ ctx }) => I.succeed(ctx)
)

// interface UserService {
//   readonly getUser: (id: number) => I.UIO<Student | Employee | UserNotFoundError>
//   readonly putUser: (user: Student | Employee) => I.FIO<Error, void>
// }
// const UserService = tag<UserService>()

// interface User {
//   _tag: string
//   name: string
//   id: number
// }

// interface Employee {
//   _tag: 'Employee'
//   name: string
//   id: number
//   position: string
// }

// interface Student {
//   _tag: 'Student'
//   name: string
//   id: number
//   major: string
// }

// const IUser = gql.makeInterface(
//   'User',
//   (F) => ({
//     _tag: F.string(),
//     name: F.string(),
//     id: F.int()
//   }),
//   (obj) => obj._tag
// )

// const User = gql.makeObject<User>()('User', (F) => ({}), { implements: [IUser] })

// const Employee = gql.makeObject<Employee>()(
//   'Employee',
//   (F) => ({
//     position: F.string()
//   }),
//   { implements: [IUser] }
// )

// const Student = gql.makeObject<Student>()(
//   'Student',
//   (F) => ({
//     major: F.string()
//   }),
//   { implements: [IUser] }
// )

// interface UserNotFoundError {
//   _tag: 'UserNotFoundError'
//   message: string
// }

// const UserNotFoundError = gql.makeObject<UserNotFoundError>()('UserNotFoundError', (F) => ({
//   _tag: F.string(),
//   message: F.string()
// }))

// const UserInput = gql.makeInputObject('UserInput', (F) => ({
//   id: F.intArg(),
//   name: F.stringArg()
// }))

// const EmployeeInput = gql.makeInputObject('EmployeeInput', (F) => ({
//   ...UserInput.fields,
//   position: F.stringArg()
// }))

// const StudentInput = gql.makeInputObject('StudentInput', (F) => ({
//   ...UserInput.fields,
//   major: F.stringArg()
// }))

const InfiniteNumbers = gql.makeSubscription((F) => ({
  numbers: F.subscription({
    type: F.float(),
    resolve: {
      subscribe: () => S.iterate(0, (n) => n + 1),
      resolve: (n: any) => n
    } as any
  })
}))

const Mutation = gql.makeMutation((F) => ({
  m: F.field({
    type: F.string(),
    resolve: () => I.succeed('Sample mutation')
  })
}))

const Query = gql.makeQuery((F) => ({
  q: F.field({
    type: F.string(),
    resolve: () => I.succeed('Sample query')
  })
}))

// const UserResponse = gql.makeUnion(Employee, Student, UserNotFoundError)('UserResponse', (obj) => obj._tag)

// const Query = gql.makeQuery((F) => ({
//   getUser: F.field({
//     type: F.union(() => UserResponse, { nullable: false, list: false }),
//     args: {
//       id: F.intArg()
//     },
//     resolve: (root, args, ctx) => I.asksServiceM(UserService)((_) => _.getUser(args.id))
//   })
// }))

// const Mutation = gql.makeMutation((F) => ({
//   putEmployee: F.field({
//     type: F.boolean(),
//     args: {
//       user: F.objectArg(() => EmployeeInput)
//     },
//     resolve: (root, args, ctx) =>
//       I.asksServiceM(UserService)((_) => _.putUser({ _tag: 'Employee', ...args.user }))['|>'](
//         I.fold(
//           (_) => false,
//           () => true
//         )
//       )
//   }),
//   putStudent: F.field({
//     type: F.boolean(),
//     args: {
//       user: F.objectArg(() => StudentInput)
//     },
//     resolve: (root, args, ctx) =>
//       I.asksServiceM(UserService)((_) => _.putUser({ _tag: 'Student', ...args.user }))['|>'](
//         I.fold(
//           (_) => false,
//           () => true
//         )
//       )
//   })
// }))

const schemaParts = gql.makeSchema(InfiniteNumbers, Query, Mutation)

const liveGraphQl = gql.getInstance({ schemaParts })

// const LiveUserService = L.fromEffect(UserService)(
//   I.gen(function* (_) {
//     const db      = yield* _(Ref.make<HM.HashMap<number, Student | Employee>>(HM.makeDefault()))
//     const putUser = (user: Student | Employee) =>
//       db.get['|>'](I.map(HM.get(user.id)))['|>'](
//         I.bind(
//           O.fold(
//             () => Ref.update_(db, HM.set(user.id, user)),
//             (_) => I.fail(new Error('User already exists'))
//           )
//         )
//       )

//     const getUser = (id: number): I.UIO<Student | Employee | UserNotFoundError> =>
//       db.get['|>'](
//         I.map(
//           flow(
//             HM.get(id),
//             O.getOrElse(() => ({ _tag: 'UserNotFoundError' as const, message: `User with id ${id} not found` }))
//           )
//         )
//       )

//     return {
//       getUser,
//       putUser
//     }
//   })
// )

I.never['|>'](I.giveLayer(liveGraphQl))
  ['|>'](I.giveLayer(K.live(4000, 'localhost')['<<<'](K.KoaConfig.live)))
  ['|>']((x) => runMain(x))
