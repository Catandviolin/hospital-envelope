# 病院宛 封筒印刷 Webアプリ

iPad Safariで使う、長形3号（235 × 120 mm）横書き封筒の宛名作成・印刷アプリです。

## できること

- 病院名を検索
- 候補から病院を選択
- 郵便番号・住所・病院名を自動入力
- 診療科・医師名を入力
- 「先生 御机下」「診療科 御中」「病院 御中」を選択
- 長形3号の実寸レイアウトをプレビュー
- 左右・上下位置、文字サイズを微調整
- iPadのSafariから印刷

患者情報は扱いません。

## 完全無料で使う構成

- Webアプリ: HTML / CSS / JavaScriptのみ
- 病院検索: OpenStreetMap Nominatim 公開検索
- 公開場所: GitHub Pages（GitHub Freeの公開リポジトリ）

クレジットカード登録は不要です。

## 重要：病院検索サービスの利用条件

このアプリは OpenStreetMap Foundation の公開 Nominatim を利用します。
小規模利用を前提に、以下を守る実装です。

- 1秒に1回を超えて検索しない
- ブラウザのRefererを送る
- OpenStreetMapの出典を画面に表示
- 同じ検索結果をiPadのlocalStorageにキャッシュ

公開Nominatimは大規模・高頻度利用向けではありません。
複数施設で大量利用する場合は別の検索サービスまたは自前データベースへ切り替えてください。

利用規約:
https://operations.osmfoundation.org/policies/nominatim/

## GitHub Pagesで無料公開する手順

### 1. GitHubアカウントを作る
https://github.com/

無料アカウントで構いません。カード登録は不要です。

### 2. 新しいRepositoryを作る
GitHub画面右上の「+」→「New repository」

例:
- Repository name: `hospital-envelope`
- Public を選択
- 「Create repository」

### 3. 4ファイルをアップロード
このフォルダにある以下をRepositoryの一番上へアップロードします。

- `index.html`
- `style.css`
- `app.js`
- `.nojekyll`

GitHubのRepository画面:
「Add file」→「Upload files」→4ファイルを選択→「Commit changes」

### 4. GitHub Pagesを有効化
Repository:
「Settings」→左メニュー「Pages」

Build and deployment:
- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/(root)`
- Save

しばらくするとURLが表示されます。

通常:
`https://あなたのGitHubユーザー名.github.io/hospital-envelope/`

### 5. iPadでホーム画面に置く
1. Safariで上記URLを開く
2. 共有ボタン
3. 「ホーム画面に追加」
4. 名前を「封筒印刷」などにして追加

以後、アプリアイコンのように起動できます。

## iPadから印刷

1. 病院を検索して選択
2. 住所・郵便番号が正しいか確認
3. 診療科・医師名を入力
4. 宛名形式を選択
5. 「印刷」
6. AirPrint対応プリンターを選択
7. 用紙サイズを「長形3号」または「235 × 120 mm」に設定
8. 拡大縮小設定があれば100%

### 最初は必ずテスト印刷
プリンターによって給紙位置に数mmの差があります。
最初は普通紙を235 × 120 mmに切るなどして試し、
画面の「左右位置」「上下位置」で調整してください。

位置設定はそのiPad内に保存されます。

## 注意点

- OpenStreetMapに登録されていない病院は検索できません。
- 郵便番号が登録されていない場合があります。
- 同名施設や旧住所が出る可能性があります。
- 印刷前に必ず病院公式サイト等で住所を確認してください。
- GitHub PagesのRepositoryはPublicなので、コードは公開されます。
  このアプリは患者情報を保存しない設計ですが、将来患者情報を追加しないでください。

## ファイル構成

```
hospital-envelope-app/
├── index.html
├── style.css
├── app.js
├── .nojekyll
└── README.md
```
