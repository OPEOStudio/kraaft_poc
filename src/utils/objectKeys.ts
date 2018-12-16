import { isObject, isArray, reduce, camelCase } from 'lodash'

export function camelCaseKeys(object: Record<string, any>) {
  return transformObjectKeys(object, camelCase)
}

function transformObjectKeys(object: Record<string, any>, transform: (path: string) => string): Record<string, any> {
  if (isArray(object)) {
    return object.map(o => transformObjectKeys(o, transform))
  }
  if (isObject(object)) {
    return reduce(
      object,
      (acc, value, key) => {
        acc[transform(key)] = transformObjectKeys(value, transform)
        return acc
      },
      {} as Record<string, unknown>,
    )
  }
  return object
}
