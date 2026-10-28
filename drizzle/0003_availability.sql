CREATE TABLE "availability" (
	"day" date NOT NULL,
	"player_id" uuid NOT NULL,
	"slot" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_day_player_id_pk" PRIMARY KEY("day","player_id")
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;