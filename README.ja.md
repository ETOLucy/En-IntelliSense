<div align="center">
  <img src="docs/assets/en-intellisense-hero.svg" width="860" alt="En-IntelliSense - 文脈対応の英語ライティング支援" />
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

## デモのモデル、上限、プライバシー

公開デモは現在 Cloudflare Workers AI の `@cf/meta/llama-3.1-8b-instruct-fp8` を使用しています。無料枠は現在 [1 日 10,000 Neurons](https://developers.cloudflare.com/workers-ai/platform/pricing/) で、`00:00 UTC` にリセットされ、すべてのデモ利用者と同じアカウントの Workers AI アプリで共有されます。変更していない文章に Review、Polish、Chat を繰り返し実行しないでください。

この構成では、マルチユーザー分離はサーバーアカウントではなくブラウザのローカルストレージに依存します。下書きは `localStorage` のみに保存され、サーバー側の下書きデータベースはありません。端末、ブラウザ、ブラウザプロファイルごとに分離されますが、同じプロファイルを共有する利用者はローカルデータも共有します。AI 機能では処理に必要な文章が設定済みプロバイダーへ送信されるため、公開デモに機密情報を入力しないでください。

## メール連携デモ

![完成したメールを Web メールへ引き継ぐ](docs/assets/demo-email.png)

## 設定と実行

`.env.example` を `.env` にコピーし、`OPENAI_API_KEY` を設定してください。必要に応じて `OPENAI_MODEL`、`OPENAI_AUTOCOMPLETE_MODEL`、`OPENAI_BASE_URL` も設定できます。

```powershell
python -m pip install -r requirements.txt
python server.py
```

`http://127.0.0.1:8000` を開きます。

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

EdgeOne のプリセットドメインは `eo_token` と `eo_time` を含む期限付き署名 URL を必要とするため、パラメーターなしの `.edgeone.cool` アドレスは `401 Authorization Required` を返します。安定した公開 URL を用意するには、**EdgeOne Pages > Settings > Custom Domains** でカスタムサブドメインを追加し、表示された CNAME を設定して、状態が `Pass` になるまで待ちます。期限付き署名 URL は共有または Git にコミットしないでください。中国本土向けアクセラレーションには、カスタムドメインの ICP 登録が必要です。

## テスト

```powershell
python -m unittest discover -p "test_*.py"
npm test
```

## ライセンス

[MIT](LICENSE)
