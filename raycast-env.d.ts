/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `migemo-search` command */
  export type MigemoSearch = ExtensionPreferences & {
  /** 検索対象ファイル - JSON (.json) または 1行1項目のテキスト */
  "itemsFile": string,
  /** 実行ファイル - 選択項目を渡して実行するスクリプト/コマンド(macOS: 実行権限と shebang が必要 / Windows: .exe .ps1 .bat .cmd) */
  "executable": string,
  /** migemo辞書ファイル - jsmigemo の migemo-compact-dict */
  "dictFile": string,
  /** 値の渡し方 - 選択した項目の value を実行ファイルにどう渡すか */
  "passMode": "arg" | "stdin"
}
  /** Preferences accessible in the `migemo-search-address` command */
  export type MigemoSearchAddress = ExtensionPreferences & {
  /** 検索対象ファイル - JSON (.json) または 1行1項目のテキスト */
  "itemsFile": string,
  /** 実行ファイル - 選択項目を渡して実行するスクリプト/コマンド(macOS: 実行権限と shebang が必要 / Windows: .exe .ps1 .bat .cmd) */
  "executable": string,
  /** migemo辞書ファイル - jsmigemo の migemo-compact-dict */
  "dictFile": string,
  /** 値の渡し方 - 選択した項目の value を実行ファイルにどう渡すか */
  "passMode": "arg" | "stdin"
}
}

declare namespace Arguments {
  /** Arguments passed to the `migemo-search` command */
  export type MigemoSearch = {}
  /** Arguments passed to the `migemo-search-address` command */
  export type MigemoSearchAddress = {}
}

