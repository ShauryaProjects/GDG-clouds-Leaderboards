declare module 'papaparse' {
  interface ParseResult<T> {
    data: T[]
    errors: any[]
    meta: any
  }

  interface ParseConfig {
    header?: boolean
    skipEmptyLines?: boolean
    complete?: (result: ParseResult<any>) => void
    error?: (error: any) => void
  }

  function parse<T = any>(input: string | File, config?: ParseConfig): void

  export = { parse }
}
