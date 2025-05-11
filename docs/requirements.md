# フィジカルAIプロジェクト 要件定義書

## 1. 背景・目的
近年、生成 AI（Generative AI）に加えて、現実世界の物理法則や 3D 空間を理解・活用する **フィジカル AI (Physical AI)** が次なる技術トレンドとして注目されています。本プロジェクトでは、その概念を活かし、ユーザーがリアルタイムで撮影した人物の動きを高精度にモーションキャプチャー（以下、MoCap）し、その **骨格・姿勢データ** を OpenAI 画像生成 API（DALL·E 3 など）へ入力して、動きに紐付く高品質な画像を生成する Web アプリケーション (プロダクト名: *Physical Image*) を開発します。

主なゴールは次の 3 点です。
1. **リアルタイム全身 MoCap**: 指先まで含む 3D 姿勢推定を 30fps 以上で実行し、ブラウザ上にスケルトンを重ねて表示する。
2. **MoCap データの動画・JSON 出力**: キャプチャー終了時にプレビュー動画とランドマーク座標 (JSON) をダウンロード可能にする。
3. **画像生成**: 取得した姿勢・骨格情報をプロンプト化し、OpenAI API を用いてコンテキストに適した画像を生成・表示・保存する。

## 2. 用語定義
| 用語 | 定義 |
|------|------|
| Physical AI | 物理世界の 3D 空間・力学を理解し、知覚・行動を行う AI 技術。|
| MoCap | Motion Capture。カメラ映像から人体 3D 姿勢を推定する処理。|
| ランドマーク | 人体の各関節・指先などの 3D 座標 (x, y, z[, v])。|
| フレーム | 1 枚の動画フレーム (≈ 1/30 秒)。|

## 3. 目標指標 (KPI)
* **キャプチャー FPS**: 30fps 以上 (推奨 60fps)。
* **遅延**: カメラ入力からスケルトン描画まで 100ms 未満。
* **姿勢推定精度**: COCO / MPII 相当で OKS ≥ 0.6、手指は平均誤差 ≤ 10px。
* **画像生成時間**: リクエスト送信から結果受信まで 10 秒以内。

## 4. ユーザーストーリー (抜粋)
1. **撮影者** として、人物を撮影すると同時に MoCap された骨格を確認したい。→ 認識状態を即座にフィードバック。
2. **クリエイター** として、キャプチャー後に自動生成された画像をインスピレーションとして活用したい。→ 生成画像をその場でダウンロード。
3. **研究者** として、MoCap の生データを機械学習用に取得したい。→ JSON / CSV 形式でエクスポート。

## 5. 機能要件
### 5.1 コア機能
| ID | 機能 | 詳細 |
|----|------|------|
| F-01 | リアルタイム動画入力 | Web カメラ or 外部カメラ (WebRTC) を使用し、ブラウザにストリーム表示 |
| F-02 | 全身 3D MoCap | MediaPipe Holistic / MoveNet + HandPose 併用で 33+21 ランドマーク推定 |
| F-03 | 指先認識強化 | 手指 21 点を高精度推定し、ピンチ・グーなどのジェスチャーを分類 |
| F-04 | スケルトン描画 | Three.js / WebGL を用いた 3D ビューワで骨格を重畳表示 |
| F-05 | キャプチャー制御 | 「開始 / 停止」ボタン。停止時に全フレームのランドマークを配列で保持 |
| F-06 | 動画プレビュー & 保存 | キャプチャー結果を MP4/WebM で保存、タイムライン操作可能 |
| F-07 | データエクスポート | ランドマーク配列を JSON でダウンロード (frames × landmarks × 4) |
| F-08 | 画像生成 | キャプチャー終了後、骨格情報をテキストプロンプトへ変換し OpenAI へ送信、返却画像を表示 |
| F-09 | 生成画像管理 | ギャラリー表示・ダウンロード・SNS 共有 (Twitter/X, Instagram) |

### 5.2 管理・共通
| ID | 機能 | 詳細 |
|----|------|------|
| C-01 | 設定 UI | 解像度 / FPS / モデル選択 / OpenAI API Key 入力 |
| C-02 | ログ & エラーハンドラ | 処理ステータス, API エラー, FPS 低下を通知 |
| C-03 | i18n | ja / en 切替 (最低限 UI テキスト) |

## 6. 非機能要件
| 区分 | 要件 |
|------|------|
| パフォーマンス | (KPI 参照) モデル推論は WebGL / WASM / WebGPU に最適化。|
| セキュリティ | 映像データはローカル処理。外部送信は骨格・プロンプトのみ。API Key はユーザーのローカルストレージに保存。|
| 拡張性 | 新モデル追加やマルチカメラ対応をモジュール化した構成。|
| 可観測性 | FPS / メモリ / レンダリング負荷を HUD 表示できる Dev パネル。|
| ブラウザ互換 | Chrome, Edge, Safari 最新版で動作。モバイル (iOS/Android) はベストエフォート。|
| アクセシビリティ | Web Content Accessibility Guidelines (WCAG) 2.1 AA 相当。|

## 7. 技術スタック
| レイヤー | 採用技術 & ライブラリ | 備考 |
|-----------|-----------------------|-------|
| Frontend | Next.js (App Router), React 18, TypeScript | 当リポジトリ準拠 |
| MoCap | MediaPipe Holistic Landmarker (@mediapipe/tasks-vision) | 公式 JS ソリューション。全身・両手・顔の 540+ ランドマークをリアルタイム推定可能。Next.js との連携実績あり。高精度な指先検出の要件を満たすため選定。 |
| 3D 表示 | Three.js, @react-three/fiber | Skeleton 可視化 & 背景合成 |
| 状態管理 | Zustand or Redux Toolkit | 軽量を優先 |
| スタイリング | Tailwind CSS | PostCSS 設定済み |
| Backend (API Route) | Next.js Edge Functions (Node.js 20) | OpenAI へのサーバーサイド Proxy |
| AI 画像生成 | OpenAI Images API (DALL·E 3) | GPT-4o でプロンプト最適化も検討 |
| テスト | Vitest, React Testing Library, Playwright (E2E) | CI で自動実行 |
| CI/CD | GitHub Actions, Vercel | main ブランチ push 時に自動デプロイ |

## 8. 外部 API インターフェース
### 8.1 `/api/generate-image` (POST)
| 項目 | 型 | 必須 | 説明 |
|------|----|------|------|
| `pose` | `PoseFrame[]` | ○ | 各フレームのランドマーク配列 |
| `stylePrompt` | `string` | △ | 画像スタイル (例: "oil painting") |

レスポンス例:
```json
{
  "imageUrl": "https://.../dalle/image.png",
  "prompt": "A futuristic dancer in the captured pose ..."
}
```

## 9. データ構造
```ts
// PoseFrame 型 (簡易例)
export type PoseFrame = {
  timestamp: number; // ms
  landmarks: Array<{ x: number; y: number; z: number; v: number }>; // 33 + 21*2
};
```

## 10. アーキテクチャ概略
```
User
 │  (WebRTC)
 ▼
Camera → Pose Model (TF.js) → Skeleton Renderer (Three.js)
                                       │
                                       ▼ stop
          ┌───────────────┐
          │ JSON Export  │
          └───────────────┘
                                       ▼
                                Prompt Builder → OpenAI Images API
                                       │
                                       ▼
                                 Returned Image
```

## 11. リスク & 対策
| リスク | 影響 | 対策 |
|--------|------|------|
| 推論負荷で FPS 低下 | UX 劣化 | モデル軽量版 / WebGPU オフロード / 解像度調整 |
| ブラウザ非対応 | 動作不可 | Feature Detection, graceful degrade |
| OpenAI API コスト増 | 予算超過 | 生成サイズ制限 & キャッシュ |
| 個人情報 (映像) 流出 | プライバシー侵害 | ローカル処理厳守 & カメラ許可の明示 |

## 12. マイルストーン
| Phase | 期間 | 内容 |
|-------|------|------|
| 0 | 2025-05 W3 | 要件確定 & プロトタイプ設計 |
| 1 | 2025-06 W1 | MoCap MVP (骨格描画) 完成 |
| 2 | 2025-06 W3 | データ出力・動画保存対応 |
| 3 | 2025-07 W1 | OpenAI 連携 & 画像生成 UI 完成 |
| 4 | 2025-07 W3 | テスト・チューニング・アクセシビリティ対応 |
| 5 | 2025-08 W1 | β リリース & フィードバック反映 |

## 13. 参考文献・リンク
* NVIDIA: "What is Physical AI?" (https://www.nvidia.com/ja-jp/glossary/generative-physical-ai/)
* AI4EU: "A simple guide to Physical AI" (2020)
* MediaPipe Hands/Pose 公式ドキュメント
* OpenAI Developers: Image Generation API

---
以上
