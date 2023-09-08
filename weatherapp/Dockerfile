# ベースイメージを指定
FROM node:14

# アプリケーションディレクトリを設定
WORKDIR /usr/src/app

# 依存関係のあるファイルをコピー
COPY package*.json ./

# npmパッケージをインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# ポート番号を指定
EXPOSE 3000

# コマンド実行
CMD [ "npm", "start" ]
