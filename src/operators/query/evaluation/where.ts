// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/

import { Callback, isFunction } from '../../../util'
import { Options } from '../../../core'


/**
 * Matches documents that satisfy a JavaScript expression.
 *
 * @param selector
 * @param value
 * @returns {Function}
 */
export function $where(selector: string, value: any, options: Options): Callback<boolean> {
  let f: Function
  if (!isFunction(value)) {
    f = new Function('return ' + value + ';')
  } else {
    f = value as Function
  }
  return obj => f.call(obj) === true
}