/**
 * Use with filter() to remove null and undefined from an array
 *
 * Example:
 * [1, 2, 0, null].filter(nonNullable) // number[]
 *
 */
export const nonNullable = <TValue>(
  value: TValue,
): value is NonNullable<TValue> => {
  return value !== null && value !== undefined
}

/**
 * Constructs a type by excluding specified keys from another type in a homomorphic manner.
 * Homomorphic types maintain the same shape as the original type but exclude specified keys.
 * For example, this works correctly on discriminated unions whereas Omit messes up the type.
 * https://github.com/microsoft/TypeScript/issues/54451
 *
 * @template TOriginal - The original type.
 * @template KeysToExclude - The keys to be excluded from the original type.
 * @property {TOriginal} TResult - The resulting type excluding the keys specified by KeysToExclude while preserving the original structure.
 */
export type DistributiveOmit<
  TOriginal,
  TKeysToExclude extends keyof TOriginal,
> = {
  [TResult in keyof TOriginal as TResult extends TKeysToExclude
    ? never
    : TResult]: TOriginal[TResult]
}

/* -------------------------------------------------------------------------- */
/* Typed Object constructor alternatives */
/* -------------------------------------------------------------------------- */
export type Entries<TObject> = Array<{
    [Key in keyof TObject]: [Key, TObject[Key]]
  }[keyof TObject]>

type KeyValueTupleToObject<
  TEntries extends ReadonlyArray<readonly [PropertyKey, unknown]>,
> = {
  [Key in TEntries[number] as Key[0]]: Key[1]
}

/**
 * Converts an object into an array of properly typed key-value pairs.
 * This is a type-faithful alternative to Object.entries().
 *
 * Uses the `Object.entries()` to get an array of the object's key-value pairs,
 * and then casts each key-value pair to `[keyof TObject, TObject[keyof TObject]]`
 *
 * See https://stackoverflow.com/a/76176570
 *
 * @param {TObject} object - The object to convert.
 * @template TObject - The type of the object.
 */
export const objectEntries = <TObject extends Record<PropertyKey, unknown>>(
  object: TObject,
): Entries<TObject> => Object.entries(object) as Entries<TObject>
/**
 * Converts an array of key-value pairs into an object.
 * This is a type-faithful alternative to Object.fromEntries().
 *
 * @param {TEntries} entries - The array of key-value pairs to convert.
 * @template TEntries - The type of the entries array.
 */
export const objectFromEntries = <
  const TEntries extends ReadonlyArray<readonly [PropertyKey, unknown]>,
>(
  entries: TEntries,
): KeyValueTupleToObject<TEntries> => {
  return Object.fromEntries(entries) as KeyValueTupleToObject<TEntries>
}

/**
 * Returns an array of the **correctly typed** keys of a given object.
 * This is a type-faithful alternative to Object.keys().
 *
 * Uses the `Object.keys()` to get an array of the object's keys,
 * and then casts each key to `keyof TObject`
 *
 * See https://stackoverflow.com/a/76176570
 *
 * @template TObject - The type of the object.
 * @param {TObject} object - The object to get the keys from.
 * @returns {(keyof TObject)[]} An array of the keys of the object.
 */
export const objectKeys = <TObject extends Record<PropertyKey, unknown>>(
  object: TObject,
): Array<keyof TObject> => {
  return Object.keys(object).map((key) => key as keyof TObject)
}

/**
 * Returns an array of the **correctly typed** values of a given object.
 * This is a type-faithful alternative to Object.values().
 *
 * Uses the `Object.values()` to get an array of the object's values,
 * and then casts each value to `TObject[keyof TObject]`
 *
 * @template TObject - The type of the object.
 * @param {TObject} object - The object to get the values from.
 * @returns {Array} An array of the values of the object.
 */
export const objectValues = <TObject extends Record<PropertyKey, unknown>>(
  object: TObject,
): Array<TObject[keyof TObject]> =>
  Object.values(object) as Array<TObject[keyof TObject]>
