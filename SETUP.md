# 新環境開發 SOP（MacroMate）

在一台新電腦第一次開發本專案時，照這份清單做即可。

---

## 0. 前置需求（只需裝一次）

| 工具 | 說明 | 檢查指令 |
|------|------|----------|
| **Git** | Windows 建議裝 [Git for Windows](https://git-scm.com/)，內建 Git Credential Manager | `git --version` |
| **Node.js** | 建議 v20+（本專案在 v24 測試過）；會一併裝好 npm | `node -v` / `npm -v` |

---

## 1. 取得程式碼

```bash
cd /c/Users/<你的帳號>/Documents      # 或任何你想放的目錄
git clone https://github.com/infanta0127-star/MacroMate.git
cd MacroMate
```

> 用 **HTTPS** 網址即可，clone 公開倉庫不需要認證。

---

## 2. 設定 Git 身分（新電腦必做，否則無法 commit）

```bash
git config --global user.name  "你的名字"
git config --global user.email "你的 email"
```

檢查：`git config --global --list`

---

## 3. 安裝相依套件

```bash
npm install
```

會產生 `node_modules/`（已被 gitignore，不會進版控）。

---

## 4. 建立環境變數檔

專案的 `.env*` 不進版控，只保留範本 `.env.example`。複製一份並填入實際值：

```bash
cp .env.example .env
```

然後編輯 `.env`：

| 變數 | 用途 | 備註 |
|------|------|------|
| `GEMINI_API_KEY` | Gemini AI API 呼叫 | 填入自己的金鑰 |
| `APP_URL` | 應用程式部署網址 | 本機開發可先留範本值或設為 `http://localhost:3000` |

---

## 5. 啟動開發伺服器

```bash
npm run dev
```

Vite 會在 **http://localhost:3000** 啟動（設定於 `package.json`，`--host=0.0.0.0` 代表同網段裝置也能連）。

---

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 本機開發伺服器（port 3000） |
| `npm run build` | 建置產出到 `dist/` |
| `npm run preview` | 預覽 build 結果 |
| `npm run lint` | TypeScript 型別檢查（`tsc --noEmit`） |
| `npm run clean` | 刪除 `dist/` 與 `server.js` |

---

## 6. 推送變更（Push）

第一次 push 時，**Git Credential Manager 會自動跳出視窗/瀏覽器**，用 GitHub 帳號登入授權一次即可，之後憑證會存進 Windows 憑證管理員，不用再登入。

```bash
git add .
git commit -m "你的說明"
git push
```

> 前提：你的 GitHub 帳號對本倉庫有**寫入權限**。
>
> 若想改用免密碼的 SSH：產生金鑰 → 把公鑰加到 GitHub Settings > SSH keys → 把 remote 換成 SSH：
> `git remote set-url origin git@github.com:infanta0127-star/MacroMate.git`

---

## 技術棧速查

- **前端**：React 19 + TypeScript + Vite 6
- **樣式**：Tailwind CSS 4
- **AI**：`@google/genai`（Gemini）
- **後端/伺服器**：Express
- **動畫**：`motion`
