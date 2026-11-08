# Migemo Search (Raycast extension)

ローマ字入力で日本語を検索(migemo)し、選択した項目を任意の実行ファイルに渡します。
migemo エンジンには [jsmigemo](https://github.com/oguna/jsmigemo) を使用しています。

## セットアップ

```bash
cd migemo-search
npm install
npm run dev   # Raycast に開発版として読み込まれます
```

`assets/extension-icon.png`(512x512 PNG)を置いてください(`ray build` に必要)。

Raycast でコマンドを開くと設定画面が出るので、次の3つを指定します。

| 設定 | 内容 |
|---|---|
| 検索対象ファイル | 下記フォーマットの JSON またはテキスト |
| 実行ファイル | 選択項目を渡すスクリプト。実行権限 (`chmod +x`) と shebang が必須 |
| migemo辞書ファイル | `migemo-compact-dict`。`node_modules/jsmigemo/migemo-compact-dict` を指定するか、`jsmigemo-dict.mjs` で自分の辞書から生成 |
| 値の渡し方 | 第1引数 / 標準入力 |

## Windows での利用

`platforms` に Windows を追加済みです。実行ファイルは拡張子で起動方法が変わります。

| 拡張子 | 起動方法 |
|---|---|
| `.exe` | 直接実行 |
| `.ps1` | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File` で実行 |
| `.bat` / `.cmd` | `cmd.exe /c` で実行。引数モードでは `& | < > ^ % "` を含む値は拒否されるので、その場合は「標準入力」モードを使用 |

shebang スクリプト(`.sh`)は直接は動きません。`.ps1` か、`.exe` / `.bat` から bash を呼ぶ形にしてください。
辞書や検索対象のパスは `C:\Users\me\...` のままで指定できます。

## 検索対象のフォーマット

JSON 配列。要素は文字列、またはオブジェクト。

```json
[
  { "title": "表示名", "subtitle": "補足(検索対象にもなる)", "value": "実行ファイルに渡す値", "keywords": ["追加の検索語"] },
  "文字列だけでもOK"
]
```

- `value` を省略すると `title` が渡されます。
- 拡張子が `.json` 以外のファイルは「1行=1項目(title=value)」のテキストとして読みます。

## 検索の挙動

- 空白区切りで AND 検索(例: `kensaku manyuaru`)
- 表示は最大100件
- 検索対象ファイルはコマンドを開くたびに再読込されます

## 複数の組み合わせを使いたい場合

設定はコマンド単位なので、`package.json` の `commands` にエントリを複製(`name` / `title` を変更)し、`src/` にも同名の `.tsx` を作ると、別の検索対象・実行ファイルを持つコマンドを増やせます。
