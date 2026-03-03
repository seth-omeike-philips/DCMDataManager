type StringKeys<T> = {
  [K in keyof T]-?:
    NonNullable<T[K]> extends string ? K : never
}[keyof T]