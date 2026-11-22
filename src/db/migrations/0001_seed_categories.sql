-- カテゴリ 12 種と貴重品の初期値（Notion の機能仕様「カテゴリ一覧」）。
-- 本番にも同じものを入れるため、シードではなくマイグレーションにしている。
-- カテゴリを足す・変えるときは、このファイルを書き換えずに新しいマイグレーションを作る。
INSERT INTO "categories" ("id", "name", "is_valuable_default", "sort_order") VALUES
  (1, '証明書・カード・定期券類', true, 1),
  (2, '財布類', true, 2),
  (3, '携帯電話類', true, 3),
  (4, '鍵類', true, 4),
  (5, '時計・貴金属類', true, 5),
  (6, '電気製品類', false, 6),
  (7, '眼鏡類', false, 7),
  (8, 'かばん類', false, 8),
  (9, '衣類・履物類', false, 9),
  (10, 'かさ類', false, 10),
  (11, '書類・紙類', false, 11),
  (12, 'その他', false, 12)
ON CONFLICT ("id") DO NOTHING;
