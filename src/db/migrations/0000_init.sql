CREATE TYPE "public"."cancel_reason" AS ENUM('found_myself', 'no_longer_needed', 'other');--> statement-breakpoint
CREATE TYPE "public"."found_status" AS ENUM('received', 'matching', 'awaiting_handover', 'resolved', 'transferred_to_police', 'disposed');--> statement-breakpoint
CREATE TYPE "public"."lost_status" AS ENUM('searching', 'maybe_found', 'awaiting_handover', 'resolved', 'transferred_to_police', 'disposed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pickup_method" AS ENUM('today', 'later', 'other');--> statement-breakpoint
CREATE TYPE "public"."sender_role" AS ENUM('admin', 'guest');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" smallint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_valuable_default" boolean NOT NULL,
	"sort_order" smallint NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "found_item_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"found_item_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"thumb_path" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "found_item_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "found_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "found_items_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" smallint NOT NULL,
	"features" text NOT NULL,
	"brand" text,
	"found_place" text NOT NULL,
	"found_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_valuable" boolean NOT NULL,
	"memo" text,
	"status" "found_status" DEFAULT 'received' NOT NULL,
	"registered_by_email" text NOT NULL,
	"disposed_at" timestamp with time zone,
	"disposal_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "found_items_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "found_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"agreed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"found_item_id" uuid NOT NULL,
	"lost_report_id" uuid,
	"handed_at" timestamp with time zone NOT NULL,
	"receiver_name" text,
	"recorded_by_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "handovers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lost_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "lost_reports_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guest_id" uuid NOT NULL,
	"category_id" smallint NOT NULL,
	"features" text NOT NULL,
	"brand" text,
	"lost_place" text NOT NULL,
	"lost_at" timestamp with time zone NOT NULL,
	"note" text,
	"status" "lost_status" DEFAULT 'searching' NOT NULL,
	"verified_at" timestamp with time zone,
	"pickup_method" "pickup_method",
	"pickup_note" text,
	"cancel_reason" "cancel_reason",
	"cancel_note" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lost_reports_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "lost_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lost_report_id" uuid NOT NULL,
	"found_item_id" uuid NOT NULL,
	"matched_by_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lost_report_id" uuid NOT NULL,
	"sender_role" "sender_role" NOT NULL,
	"sender_email" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "found_item_photos" ADD CONSTRAINT "found_item_photos_found_item_id_found_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."found_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_found_item_id_found_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."found_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_lost_report_id_lost_reports_id_fk" FOREIGN KEY ("lost_report_id") REFERENCES "public"."lost_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_reports" ADD CONSTRAINT "lost_reports_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_reports" ADD CONSTRAINT "lost_reports_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_lost_report_id_lost_reports_id_fk" FOREIGN KEY ("lost_report_id") REFERENCES "public"."lost_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_found_item_id_found_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."found_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_lost_report_id_lost_reports_id_fk" FOREIGN KEY ("lost_report_id") REFERENCES "public"."lost_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "found_item_photos_found_item_idx" ON "found_item_photos" USING btree ("found_item_id");--> statement-breakpoint
CREATE INDEX "found_items_status_idx" ON "found_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "found_items_category_status_idx" ON "found_items" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "found_items_found_at_idx" ON "found_items" USING btree ("found_at");--> statement-breakpoint
CREATE INDEX "handovers_found_item_idx" ON "handovers" USING btree ("found_item_id");--> statement-breakpoint
CREATE INDEX "lost_reports_guest_idx" ON "lost_reports" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "lost_reports_status_idx" ON "lost_reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_active_lost_report_uq" ON "matches" USING btree ("lost_report_id") WHERE "matches"."released_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "matches_active_found_item_uq" ON "matches" USING btree ("found_item_id") WHERE "matches"."released_at" is null;--> statement-breakpoint
CREATE INDEX "messages_lost_report_created_idx" ON "messages" USING btree ("lost_report_id","created_at");