# En-IntelliSense

文章全体の文脈を理解する英語ライティング支援ツールです。書き手の意図を推測し、単語・フレーズ・文を補完し、問題箇所を特定して修正案を提示します。

常設公開デモ: [en-intellisense.etolucy.workers.dev](https://en-intellisense.etolucy.workers.dev)

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

EdgeOne Pages にも本番環境をデプロイ済みです。プリセットドメイン `en-intellisense-85d4szue.edgeone.cool` は保護されているため、EdgeOne コンソールの **Visit site** から開いてください。`eo_token` を含む一時 URL は共有またはコミットしないでください。常設の公開 URL にはカスタムドメインが必要で、中国本土向けアクセラレーションにはそのドメインの ICP 登録も必要です。

## テスト

```powershell
python -m unittest discover -p "test_*.py"
npm test
```

## ライセンス

[MIT](LICENSE)
