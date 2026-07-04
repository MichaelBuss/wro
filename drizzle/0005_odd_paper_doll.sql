CREATE TABLE "recovery_link" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"target_user_id" text NOT NULL,
	"generated_by_user_id" text NOT NULL,
	"used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_link_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "recovery_link" ADD CONSTRAINT "recovery_link_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_link" ADD CONSTRAINT "recovery_link_generated_by_user_id_user_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;