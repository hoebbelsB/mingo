/**
 * Type Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#type-expression-operators
 */

import { computeValue, Options } from '../../../core'
import { $dateToString } from '../date'
import { isNil } from '../../../util'

export function $toString(obj: object, expr: any, options: Options): string | null {
  let val = computeValue(obj, expr, null, options)
  if (isNil(val)) return null

  if (val instanceof Date) {
    let dateExpr = {
      date: expr,
      format: "%Y-%m-%dT%H:%M:%S.%LZ"
    }
    return $dateToString(obj, dateExpr, options)
  } else {
    return val.toString()
  }
}
