// A bunch of helper functions.

export function isFunction(value) {
  return typeof value === 'function'
}

export function isObject(value) {
  return typeof value === 'object'
}

export function toString(token) {
  if (typeof token === 'string') {
    return token
  }

  if (token === undefined || token === null) {
    return '' + token
  }

  if (token.name) {
    return token.name
  }

  return token.toString()
}



