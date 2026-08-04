-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "request_type" AS ENUM ('FOOD', 'SHELTER', 'MEDICAL', 'EMPLOYMENT', 'GUIDANCE');

-- CreateEnum
CREATE TYPE "response_status" AS ENUM ('ACCEPTED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "service_type" AS ENUM ('FOOD', 'SHELTER', 'MEDICAL', 'EMPLOYMENT', 'EDUCATION', 'LEGAL', 'GUIDANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('MIGRANT', 'VOLUNTEER', 'NGO', 'ADMIN');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('PENDING', 'GOVERNMENT_VERIFIED', 'CONTACT_VERIFIED', 'MANUALLY_VERIFIED');

-- CreateTable
CREATE TABLE "chats" (
    "chat_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "responder_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("chat_id")
);

-- CreateTable
CREATE TABLE "cities" (
    "city_id" SERIAL NOT NULL,
    "city_name" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("city_id")
);

-- CreateTable
CREATE TABLE "help_requests" (
    "request_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "request_type" "request_type" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "status" "request_status" DEFAULT 'PENDING',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "help_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "sent_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_read" BOOLEAN DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "ngo_services" (
    "service_id" SERIAL NOT NULL,
    "ngo_id" INTEGER NOT NULL,
    "service" "service_type" NOT NULL,

    CONSTRAINT "ngo_services_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "ngo_verification" (
    "verification_id" SERIAL NOT NULL,
    "ngo_id" INTEGER NOT NULL,
    "verification_method" VARCHAR(100) NOT NULL,
    "verified_by" VARCHAR(100),
    "verification_date" DATE DEFAULT CURRENT_DATE,
    "remarks" TEXT,

    CONSTRAINT "ngo_verification_pkey" PRIMARY KEY ("verification_id")
);

-- CreateTable
CREATE TABLE "ngos" (
    "ngo_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ngo_name" VARCHAR(255) NOT NULL,
    "registration_number" VARCHAR(100),
    "ngo_darpan_id" VARCHAR(100),
    "contact_person" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(15),
    "email" VARCHAR(255),
    "website" TEXT,
    "city_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "verification_status" "verification_status" DEFAULT 'PENDING',
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ngos_pkey" PRIMARY KEY ("ngo_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "report_id" SERIAL NOT NULL,
    "ngo_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "report_status" DEFAULT 'PENDING',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "request_responses" (
    "response_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "responder_id" INTEGER NOT NULL,
    "response_message" TEXT NOT NULL,
    "response_time" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "status" "response_status" DEFAULT 'ACCEPTED',

    CONSTRAINT "request_responses_pkey" PRIMARY KEY ("response_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(15),
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "city_id" INTEGER,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "profile_photo" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT true,
    "is_verified" BOOLEAN DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_chat" ON "chats"("request_id", "responder_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_city" ON "cities"("city_name", "district", "state");

-- CreateIndex
CREATE UNIQUE INDEX "unique_ngo_service" ON "ngo_services"("ngo_id", "service");

-- CreateIndex
CREATE UNIQUE INDEX "ngos_user_id_key" ON "ngos"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ngos_registration_number_key" ON "ngos"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "ngos_ngo_darpan_id_key" ON "ngos"("ngo_darpan_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_response" ON "request_responses"("request_id", "responder_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "fk_chat_request" FOREIGN KEY ("request_id") REFERENCES "help_requests"("request_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "fk_chat_responder" FOREIGN KEY ("responder_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "help_requests" ADD CONSTRAINT "fk_request_city" FOREIGN KEY ("city_id") REFERENCES "cities"("city_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "help_requests" ADD CONSTRAINT "fk_request_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "fk_message_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("chat_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "fk_message_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ngo_services" ADD CONSTRAINT "fk_service_ngo" FOREIGN KEY ("ngo_id") REFERENCES "ngos"("ngo_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ngo_verification" ADD CONSTRAINT "fk_verification_ngo" FOREIGN KEY ("ngo_id") REFERENCES "ngos"("ngo_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ngos" ADD CONSTRAINT "fk_ngo_city" FOREIGN KEY ("city_id") REFERENCES "cities"("city_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ngos" ADD CONSTRAINT "fk_ngo_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "fk_report_ngo" FOREIGN KEY ("ngo_id") REFERENCES "ngos"("ngo_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "fk_report_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "request_responses" ADD CONSTRAINT "fk_response_request" FOREIGN KEY ("request_id") REFERENCES "help_requests"("request_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "request_responses" ADD CONSTRAINT "fk_response_user" FOREIGN KEY ("responder_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("city_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
