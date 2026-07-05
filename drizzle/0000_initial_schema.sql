CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"movie_id" integer NOT NULL,
	"visitor_id" text NOT NULL,
	"kind" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"bucket" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"poster_path" text,
	"release_date" text,
	"vote_average" double precision,
	"original_language" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trending" (
	"movie_id" integer NOT NULL,
	"half_life" integer NOT NULL,
	"log_acc" double precision NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trending_movie_id_half_life_pk" PRIMARY KEY("movie_id","half_life")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trending" ADD CONSTRAINT "trending_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_dedupe" ON "events" USING btree ("visitor_id","movie_id","kind","bucket");--> statement-breakpoint
CREATE INDEX "trending_rank" ON "trending" USING btree ("half_life","log_acc" DESC NULLS LAST);