-- 特徴（features）を消し、選択式の色（color）にする。自由記述は拾得物の memo・遺失物申請の note を使う。
-- drizzle-kit が出した SQL を、すでに行がある DB でも中身を失わずに当たるよう手で直した。
-- ・NOT NULL の color を足せるよう、足すときだけ既定値 'other' を付けて、すぐに外す（schema.ts の color に既定値はない）。
--   そのため、もとからある行は、色を決めていなくても 'other' になる
-- ・features を消す前に、その中身（前後の空白を除いたもの）を memo・note の先頭へ移す。
--   features が空白だけの行は触らない。memo・note が空文字なら、features だけにする
CREATE TYPE "public"."item_color" AS ENUM('black', 'white', 'gray', 'brown', 'beige', 'red', 'pink', 'orange', 'yellow', 'green', 'blue', 'navy', 'purple', 'gold', 'silver', 'clear', 'other');--> statement-breakpoint
ALTER TABLE "found_items" ADD COLUMN "color" "item_color" NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "found_items" ALTER COLUMN "color" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lost_reports" ADD COLUMN "color" "item_color" NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "lost_reports" ALTER COLUMN "color" DROP DEFAULT;--> statement-breakpoint
UPDATE "found_items"
SET "memo" = concat_ws(E'\n', btrim("features", E' \t\r\n　'), NULLIF("memo", ''))
WHERE btrim("features", E' \t\r\n　') <> '';--> statement-breakpoint
UPDATE "lost_reports"
SET "note" = concat_ws(E'\n', btrim("features", E' \t\r\n　'), NULLIF("note", ''))
WHERE btrim("features", E' \t\r\n　') <> '';--> statement-breakpoint
ALTER TABLE "found_items" DROP COLUMN "features";--> statement-breakpoint
ALTER TABLE "lost_reports" DROP COLUMN "features";
