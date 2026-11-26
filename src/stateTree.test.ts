import { describe, expect, it } from 'vitest'
import { parseStateTree } from './stateTree'

describe('parseStateTree', () => {
  it('merges fields across array objects and marks non-universal fields optional', () => {
    const tree = parseStateTree(
      '{"cart":[{"id":1,"name":"first"},{"id":2,"price":8}]}',
    )
    const cart = tree?.find((node) => node.name === 'cart')

    expect(cart?.children.map((node) => node.name)).toEqual([
      'id',
      'name',
      'price',
    ])
    expect(cart?.children.find((node) => node.name === 'id')?.type).toBe(
      'number',
    )
    expect(cart?.children.find((node) => node.name === 'name')?.optional).toBe(
      true,
    )
    expect(cart?.children.find((node) => node.name === 'price')?.optional).toBe(
      true,
    )
  })

  it('preserves array shape when the root value is an array', () => {
    const tree = parseStateTree('[{"id":1},{"id":2,"active":true}]')

    expect(tree?.[0].name).toBe('items')
    expect(tree?.[0].children.map((node) => node.name)).toEqual([
      'id',
      'active',
    ])
  })
})
