// deno-lint-ignore-file no-namespace

export namespace Strings {

  export function capitalize(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

}