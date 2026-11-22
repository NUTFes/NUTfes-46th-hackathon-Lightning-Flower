-- 特徴（features）を消し、選択式の色（color）にする。自由記述は拾得物の memo・遺失物申請の note を使う。
-- すでに行がある DB でも NOT NULL の列を足せるよう、足すときだけ既定値 'other' を付けて、すぐに外す
-- （drizzle-kit が出した SQL を手で直した。schema.ts の color に既定値はない）。
CREATE TYPE "public"."color" AS ENUM('black', 'white', 'gray', 'brown', 'beige', 'red', 'pink', 'orange', 'yellow', 'green', 'blue', 'navy', 'purple', 'gold', 'silver', 'clear', 'other');--> statement-breakpoint
ALTER TABLE "found_items" ADD COLUMN "color" "color" NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "found_items" ALTER COLUMN "color" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lost_reports" ADD COLUMN "color" "color" NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "lost_reports" ALTER COLUMN "color" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "found_items" DROP COLUMN "features";--> statement-breakpoint
ALTER TABLE "lost_reports" DROP COLUMN "features";
