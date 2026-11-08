import { Action, ActionPanel, Color, Icon, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { CompactDictionary, Migemo } from "jsmigemo";
import { useEffect, useMemo, useState } from "react";

type Preferences = {
  itemsFile: string;
  executable: string;
  dictFile: string;
  passMode?: "arg" | "stdin";
};

type Item = {
  id: string;
  title: string;
  subtitle?: string;
  value: string;
  keywords: string[];
};

const MAX_RESULTS = 100;

const isWindows = process.platform === "win32";

const expand = (p: string) => (/^~[\\/]/.test(p) ? homedir() + p.slice(1) : p);

/** Windows では shebang が効かないため、拡張子に応じて起動方法を決める */
function resolveCommand(executable: string, value: string, mode: "arg" | "stdin"): { command: string; args: string[] } {
  const exe = expand(executable);
  const args = mode === "arg" ? [value] : [];
  if (!isWindows) return { command: exe, args };

  const ext = exe.slice(exe.lastIndexOf(".")).toLowerCase();
  if (ext === ".ps1") {
    return { command: "powershell.exe", args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", exe, ...args] };
  }
  if (ext === ".bat" || ext === ".cmd") {
    // cmd.exe はメタ文字の扱いが危険なため、引数モードでは危険な文字を含む値を拒否する
    if (mode === "arg" && /[&|<>^%"\r\n]/.test(value)) {
      throw new Error("この値は .bat/.cmd に引数で渡せません。「標準入力」モードを使ってください");
    }
    return { command: "cmd.exe", args: ["/d", "/s", "/c", exe, ...args] };
  }
  return { command: exe, args }; // .exe など
}

/** 検索対象ファイルを読み込む。.json は配列、それ以外は1行1項目のテキストとして扱う */
async function loadItems(file: string): Promise<Item[]> {
  const raw = await readFile(expand(file), "utf8");

  if (!file.toLowerCase().endsWith(".json")) {
    return raw
      .split(/\r?\n/)
      .filter((l) => l.trim() !== "")
      .map((l, i) => ({ id: String(i), title: l, value: l, keywords: [] }));
  }

  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("JSONのトップレベルは配列にしてください");

  return data.map((d, i): Item => {
    if (typeof d === "string") return { id: String(i), title: d, value: d, keywords: [] };
    const o = d as Record<string, unknown>;
    const title = String(o.title ?? o.value ?? "");
    return {
      id: String(i),
      title,
      subtitle: o.subtitle != null ? String(o.subtitle) : undefined,
      value: String(o.value ?? title),
      keywords: Array.isArray(o.keywords) ? o.keywords.map(String) : [],
    };
  });
}

async function loadMigemo(dictFile: string): Promise<Migemo> {
  const data = await readFile(expand(dictFile));
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const migemo = new Migemo();
  migemo.setDict(new CompactDictionary(buffer));
  return migemo;
}

/** 空白区切りのAND検索。各トークンをmigemo正規表現に変換する */
function buildMatchers(migemo: Migemo | undefined, text: string): RegExp[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      try {
        if (migemo) return new RegExp(migemo.query(token), "i");
      } catch {
        // 正規表現化に失敗したら部分一致にフォールバック
      }
      return new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    });
}

function runExecutable(executable: string, value: string, mode: "arg" | "stdin"): Promise<string> {
  return new Promise((resolve, reject) => {
    let resolved: { command: string; args: string[] };
    try {
      resolved = resolveCommand(executable, value, mode);
    } catch (e) {
      reject(e);
      return;
    }
    const child = spawn(resolved.command, resolved.args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b) => (stdout += b));
    child.stderr.on("data", (b) => (stderr += b));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `exit code ${code}`));
    });
    if (mode === "stdin") child.stdin.write(value);
    child.stdin.end();
  });
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [items, setItems] = useState<Item[]>([]);
  const [migemo, setMigemo] = useState<Migemo>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [loadedItems, loadedMigemo] = await Promise.all([
          loadItems(prefs.itemsFile),
          loadMigemo(prefs.dictFile),
        ]);
        setItems(loadedItems);
        setMigemo(loadedMigemo);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [prefs.itemsFile, prefs.dictFile]);

  const results = useMemo(() => {
    const matchers = buildMatchers(migemo, query);
    const filtered =
      matchers.length === 0
        ? items
        : items.filter((it) => {
            const haystack = [it.title, it.subtitle ?? "", ...it.keywords].join("\n");
            return matchers.every((re) => re.test(haystack));
          });
    return filtered.slice(0, MAX_RESULTS);
  }, [items, migemo, query]);

  async function run(item: Item) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "実行中…", message: item.title });
    try {
      const out = await runExecutable(prefs.executable, item.value, prefs.passMode ?? "arg");
      toast.style = Toast.Style.Success;
      toast.title = "実行しました";
      toast.message = out.split("\n")[0] || item.title;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "実行に失敗しました";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setQuery} searchBarPlaceholder="ローマ字で検索 (空白でAND)">
      {error ? (
        <List.EmptyView icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} title="読み込みエラー" description={error} />
      ) : (
        <List.EmptyView title="該当なし" />
      )}
      {results.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action title="実行ファイルに渡す" icon={Icon.Play} onAction={() => run(item)} />
              <Action.CopyToClipboard title="値をコピー" content={item.value} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
