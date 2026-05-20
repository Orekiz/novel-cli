# Novel CLI 📖

[English](README-en.md) | **中文**

**Novel CLI** 是一款基于终端的全屏小说阅读器，采用 Vim 风格快捷键操作。支持自动章节识别、目录搜索、书签、编码自动检测等功能。

由 TypeScript + [React 18](https://react.dev/) + [Ink 5](https://github.com/vadimdemedes/ink) 构建。

---

## 功能

- **Vim 风格导航** — `j`/`k` 滚动、`Ctrl+d`/`Ctrl+u` 半页翻、`g`/`G` 跳转章节首尾
- **章节自动识别** — 自动检测 `第X章/节/回/卷`、`序号+标题` 等中文章节模式
- **按章节阅读** — 一次只读一个章节，`[`/`]` 切换上下章
- **目录覆盖层** — `t` 键或 `:toc` 打开目录，支持 `j`/`k` 导航和 `/` 搜索
- **搜索** — `/` 搜索全文，`n`/`N` 跳转上/下一匹配
- **书签** — `m` 添加书签，`` ` `` 跳转书签
- **命令系统** — `:` 进入命令模式（`:q`、`:open`、`:goto` 等）
- **编码自动检测** — 自动识别 UTF-8/GBK，支持 `--encoding` 手动指定
- **阅读进度记忆** — 自动保存章节进度，`--resume` 恢复上次阅读位置
- **文件浏览器** — 内置文件选择器，浏览并打开 `.txt`/`.md` 文件
- **书架** — 首页展示最近阅读记录，快速继续阅读

---

## 命令行选项

```bash
novel [file] [options]

参数：
  file                    要打开的 .txt 文件路径

选项：
  --resume                从上次阅读位置继续
  --encoding <encoding>   指定文件编码 (utf-8 或 gbk)
  --browse                启动时直接进入文件浏览器
  --help                  显示帮助信息
```

### 示例

```bash
# 打开文件直接阅读
novel ./novel.txt

# 从上次位置继续阅读
novel --resume

# 指定 GBK 编码
novel --encoding gbk ./book.txt

# 启动文件浏览器
novel --browse

# 不传参数：进入书架页面
novel
```

---

## 快捷键

| 键位 | 功能 |
|------|------|
| `j` / `↓` | 向下滚动 |
| `k` / `↑` | 向上滚动 |
| `Ctrl+d` / `PgDn` | 下半页 |
| `Ctrl+u` / `PgUp` | 上半页 |
| `g` / `G` | 章节开头 / 章节末尾 |
| `[` / `]` | 上一章 / 下一章 |
| `t` | 打开目录 |
| `/` | 搜索（`n`/`N` 上/下一结果） |
| `:` | 进入命令模式 |
| `Esc` | 取消 / 关闭面板 / 返回书架 |
| `m` / `` ` `` | 设置书签 / 跳转书签 |

### 命令

| 命令 | 功能 |
|------|------|
| `:q` | 退出程序 |
| `:help` | 显示帮助面板 |
| `:toc` | 打开目录 |
| `:goto <行号>` | 跳转到指定行 |
| `:open <路径>` | 打开文件 |
| `:encoding <编码>` | 设置编码（utf-8 / gbk） |
| `:set number` | 切换行号显示 |
| `:123` | 直接输入数字跳转到对应行 |

---

## 数据存储

阅读历史、书签和按键配置保存在 `~/.novel-cli/` 目录：

```
~/.novel-cli/
├── history.json     # 阅读记录（进度百分比）
├── bookmarks.json   # 书签
└── keymap.json      # 按键配置
```

---

## 从源码构建

```bash
git clone https://github.com/Orekiz/novel-cli.git
cd novel-cli
npm install
npm run build
```

构建产物为 `dist/cli.js`，可通过 `node dist/cli.js <file>` 运行，或使用 `npm link` 全局链接后通过 `novel <file>` 运行。

---

## 技术架构

```
src/
├── index.ts               # CLI 入口 (Commander + Ink render)
├── app.tsx                # 根组件，模式路由
├── types.ts               # 类型定义
├── components/
│   ├── reader.tsx         # 阅读器（状态机核心）
│   ├── bookshelf.tsx      # 书架首页
│   ├── toc-panel.tsx      # 目录覆盖层
│   ├── text-viewer.tsx    # 文本渲染
│   ├── status-bar.tsx     # 底部状态栏
│   ├── command-bar.tsx    # 命令输入栏
│   ├── search-bar.tsx     # 搜索输入栏
│   ├── help-panel.tsx     # 帮助面板
│   └── file-browser.tsx   # 文件浏览器
├── hooks/
│   ├── use-file.ts        # 文件加载 Hook
│   └── use-theme.tsx      # 主题 Context
├── themes/
│   └── index.ts           # 主题定义
└── utils/
    ├── chapter-parser.ts  # 章节解析
    ├── commands.ts        # 命令解析
    ├── encoding.ts        # 编码检测 / 解码
    ├── storage.ts         # 持久化存储
    └── wrap-text.ts       # CJK 感知文本换行
```

**技术栈：** TypeScript · React 18 · Ink 5 · Commander · iconv-lite · esbuild

---

## License

[MIT](LICENSE)
