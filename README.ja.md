<div align="center">
  <img src="docs/assets/en-intellisense-logo.svg" width="140" alt="En-IntelliSense ロゴ" />
  <h1>En-IntelliSense</h1>
</div>

文章全体の文脈を理解する英語ライティング支援ツールです。書き手の意図を推測し、単語・フレーズ・文を補完し、問題箇所を特定して修正案を提示します。

ドキュメント: [English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | **日本語** | [Русский](README.ru.md)

## 機能

- ローカル単語補完と、モデルによるフレーズ・文の補完。
- 下書き全体から意図を推測し、その意図を後続の補完に利用。
- 文法、明瞭さ、語彙、重複、トーンを自動レビュー。
- 原文の問題箇所をハイライトし、説明と修正案を表示してワンクリックで置換。
- 件名と本文の推敲、翻訳、説明、簡略化。
- Useful phrases は追記ではなく、選択範囲または現在の文を置換。
- 手紙の完成後、宛先・件名・本文を引き継いで QQ Mail、163 Mail、Gmail、またはカスタム Web メールを開く。
- 完成済み文書をローカルに保存し、編集可能なコピーとして開き直す。

## AI モデル、費用、プライバシー

En-IntelliSense には言語モデル、共有 API キー、無料の AI 利用枠は含まれません。モデルによる補完、レビュー、推敲、チャットを使用するには、各利用者が OpenAI 互換プロバイダーを設定します。料金、上限、データ保持、プライバシー条件は選択したプロバイダーに従います。本プロジェクトは非公式な中継サービスを提供または推奨しません。

API キーがなくても、ローカル単語補完、下書き、完成済み文書、メール連携は利用できます。AI 機能は無効のままで、画面には `Add API key for AI` と表示されます。

この構成では、マルチユーザー分離はサーバーアカウントではなくブラウザのローカルストレージに依存します。下書きは `localStorage` のみに保存され、サーバー側の下書きデータベースはありません。AI 機能では必要な文章が利用者の設定したプロバイダーへ送信されます。`.env` はローカルの平文ファイルです。Git に追加したり、GitHub Issue にキーを貼り付けたりせず、機密情報を扱う前にプロバイダーの条件を確認してください。

## メール連携デモ

![完成したメールを Web メールへ引き継ぐ](docs/assets/demo-email.png)

## 設定と実行

`.env.example` を `.env` にコピーし、自分のプロバイダー情報を設定します。

```dotenv
OPENAI_API_KEY=your_own_api_key
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL=gpt-4.1-mini
OPENAI_AUTOCOMPLETE_MODEL=gpt-4.1-mini
OPENAI_API_STYLE=chat
```

選択したプロバイダーが対応するモデル名を使用してください。

```powershell
python -m pip install -r requirements.txt
python server.py
```

`http://127.0.0.1:8000` を開きます。

## Windows デスクトップアプリ

通常は[最新リリース](https://github.com/ETOLucy/En-IntelliSense/releases/latest)から `En-IntelliSense.exe` をダウンロードしてダブルクリックするだけで、コマンドは不要です。現在の `v1.0.1` は未署名のため、Windows Smart App Control にブロックされる場合があります。プロジェクトは SignPath Foundation に申請済みで、承認後に署名済み公開リリースを提供します。

`powershell -ExecutionPolicy Bypass -File .\scripts\build_windows.ps1` はソース変更後の再ビルド専用です。EXE に API キー、モデル、メンテナー個人のリソースは含まれません。`En-IntelliSense.env.example` を `.env` に変更し、自分のプロバイダー情報を入力してアプリを再起動します。

## Cloudflare へのデプロイ

既定では Cloudflare Workers AI を使用するため、外部 API キーなしでデプロイできます。OpenAI 互換プロバイダーを使用する場合のみ Secret を追加します。

```powershell
npx wrangler login
npx wrangler deploy

# 任意の外部プロバイダー
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_BASE_URL
```

## EdgeOne Pages へのデプロイ

EdgeOne Pages にこのリポジトリをインポートし、本番ブランチに `main` を指定して、ビルドコマンドは空欄にします。`edgeone.json` が `public/` と `node-functions/` をデプロイします。

## テスト

```powershell
python -m unittest discover -p "test_*.py"
npm test
```

## ライセンス

[MIT](LICENSE)
