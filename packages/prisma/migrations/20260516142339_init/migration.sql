-- CreateEnum
CREATE TYPE "FileProvider" AS ENUM ('LOCAL_S3');

-- CreateEnum
CREATE TYPE "CatererStaffType" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "OrgStaffType" AS ENUM ('ADMIN', 'STAFF');

-- CreateTable
CREATE TABLE "CatererStaff" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "caterer_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "type" "CatererStaffType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "CatererStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgStaff" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "type" "OrgStaffType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "OrgStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caterer" (
    "id" SERIAL NOT NULL,
    "name_uk" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Caterer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatererClientContract" (
    "id" SERIAL NOT NULL,
    "caterer_id" INTEGER NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "invite_code_id" INTEGER,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "CatererClientContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTelegramBot" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ClientTelegramBot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDay" (
    "id" SERIAL NOT NULL,
    "meal_plan_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "PlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDayDiner" (
    "id" SERIAL NOT NULL,
    "plan_day_id" INTEGER NOT NULL,
    "diner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "PlanDayDiner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinerDishSelection" (
    "id" SERIAL NOT NULL,
    "plan_day_diner_id" INTEGER NOT NULL,
    "plan_course_id" INTEGER NOT NULL,
    "course_option_id" INTEGER NOT NULL,

    CONSTRAINT "DinerDishSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "label_uk" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanMeal" (
    "id" SERIAL NOT NULL,
    "meal_plan_id" INTEGER NOT NULL,
    "meal_id" INTEGER NOT NULL,

    CONSTRAINT "PlanMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCourse" (
    "id" SERIAL NOT NULL,
    "plan_meal_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,

    CONSTRAINT "PlanCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" SERIAL NOT NULL,
    "label_uk" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "description" TEXT,
    "caterer_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPeriod" (
    "id" SERIAL NOT NULL,
    "meal_id" INTEGER NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,

    CONSTRAINT "MealPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "meal_id" INTEGER NOT NULL,
    "label_uk" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePeriod" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,

    CONSTRAINT "CoursePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOption" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "dish_id" INTEGER NOT NULL,

    CONSTRAINT "CourseOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCourseDefault" (
    "id" SERIAL NOT NULL,
    "plan_course_id" INTEGER NOT NULL,
    "course_option_id" INTEGER NOT NULL,

    CONSTRAINT "PlanCourseDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dish" (
    "id" SERIAL NOT NULL,
    "name_uk" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "ingredients" TEXT[],
    "notes" TEXT,
    "caterer_id" INTEGER NOT NULL,
    "photo_id" INTEGER,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishPrice" (
    "id" SERIAL NOT NULL,
    "dish_id" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "DishPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name_uk" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "bot_token" TEXT,
    "bot_webhook_secret" TEXT,
    "notification_time" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgInviteCode" (
    "id" SERIAL NOT NULL,
    "caterer_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diner" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "phone" TEXT,
    "telegram_id" BIGINT,
    "telegram_lang" TEXT,
    "organization_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Diner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "phone" TEXT,
    "telegram_id" BIGINT,
    "telegram_lang" TEXT,
    "organization_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianDiner" (
    "id" SERIAL NOT NULL,
    "guardian_id" INTEGER NOT NULL,
    "diner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GuardianDiner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinerPasskey" (
    "id" SERIAL NOT NULL,
    "diner_id" INTEGER NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "passkey_user_id" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "transports" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "DinerPasskey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianPasskey" (
    "id" SERIAL NOT NULL,
    "guardian_id" INTEGER NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "passkey_user_id" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "transports" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GuardianPasskey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "provider" "FileProvider" NOT NULL,
    "uploader_org_admin_id" INTEGER,
    "uploader_caterer_staff_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "ip" TEXT,
    "device" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" SERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasskeyChallenge" (
    "id" SERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasskeyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinerGroup" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name_uk" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "DinerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinerGroupMember" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "diner_id" INTEGER NOT NULL,

    CONSTRAINT "DinerGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatererStaff_email_key" ON "CatererStaff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrgStaff_email_key" ON "OrgStaff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDay_meal_plan_id_date_key" ON "PlanDay"("meal_plan_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDayDiner_plan_day_id_diner_id_key" ON "PlanDayDiner"("plan_day_id", "diner_id");

-- CreateIndex
CREATE UNIQUE INDEX "DinerDishSelection_plan_day_diner_id_plan_course_id_key" ON "DinerDishSelection"("plan_day_diner_id", "plan_course_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlanMeal_meal_plan_id_meal_id_key" ON "PlanMeal"("meal_plan_id", "meal_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlanCourse_plan_meal_id_course_id_key" ON "PlanCourse"("plan_meal_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "CourseOption_course_id_dish_id_key" ON "CourseOption"("course_id", "dish_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlanCourseDefault_plan_course_id_key" ON "PlanCourseDefault"("plan_course_id");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_bot_webhook_secret_key" ON "Organization"("bot_webhook_secret");

-- CreateIndex
CREATE UNIQUE INDEX "OrgInviteCode_code_key" ON "OrgInviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Diner_phone_key" ON "Diner"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Diner_telegram_id_key" ON "Diner"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_phone_key" ON "Guardian"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_telegram_id_key" ON "Guardian"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianDiner_guardian_id_diner_id_key" ON "GuardianDiner"("guardian_id", "diner_id");

-- CreateIndex
CREATE UNIQUE INDEX "DinerPasskey_credential_id_key" ON "DinerPasskey"("credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianPasskey_credential_id_key" ON "GuardianPasskey"("credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "File_uuid_key" ON "File"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "DinerGroupMember_group_id_diner_id_key" ON "DinerGroupMember"("group_id", "diner_id");

-- AddForeignKey
ALTER TABLE "CatererStaff" ADD CONSTRAINT "CatererStaff_caterer_id_fkey" FOREIGN KEY ("caterer_id") REFERENCES "Caterer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgStaff" ADD CONSTRAINT "OrgStaff_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererClientContract" ADD CONSTRAINT "CatererClientContract_caterer_id_fkey" FOREIGN KEY ("caterer_id") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererClientContract" ADD CONSTRAINT "CatererClientContract_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererClientContract" ADD CONSTRAINT "CatererClientContract_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "OrgInviteCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTelegramBot" ADD CONSTRAINT "ClientTelegramBot_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDay" ADD CONSTRAINT "PlanDay_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDayDiner" ADD CONSTRAINT "PlanDayDiner_diner_id_fkey" FOREIGN KEY ("diner_id") REFERENCES "Diner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDayDiner" ADD CONSTRAINT "PlanDayDiner_plan_day_id_fkey" FOREIGN KEY ("plan_day_id") REFERENCES "PlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinerDishSelection" ADD CONSTRAINT "DinerDishSelection_plan_day_diner_id_fkey" FOREIGN KEY ("plan_day_diner_id") REFERENCES "PlanDayDiner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinerDishSelection" ADD CONSTRAINT "DinerDishSelection_plan_course_id_fkey" FOREIGN KEY ("plan_course_id") REFERENCES "PlanCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinerDishSelection" ADD CONSTRAINT "DinerDishSelection_course_option_id_fkey" FOREIGN KEY ("course_option_id") REFERENCES "CourseOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMeal" ADD CONSTRAINT "PlanMeal_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMeal" ADD CONSTRAINT "PlanMeal_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCourse" ADD CONSTRAINT "PlanCourse_plan_meal_id_fkey" FOREIGN KEY ("plan_meal_id") REFERENCES "PlanMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCourse" ADD CONSTRAINT "PlanCourse_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_caterer_id_fkey" FOREIGN KEY ("caterer_id") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPeriod" ADD CONSTRAINT "MealPeriod_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePeriod" ADD CONSTRAINT "CoursePeriod_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOption" ADD CONSTRAINT "CourseOption_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOption" ADD CONSTRAINT "CourseOption_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCourseDefault" ADD CONSTRAINT "PlanCourseDefault_plan_course_id_fkey" FOREIGN KEY ("plan_course_id") REFERENCES "PlanCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCourseDefault" ADD CONSTRAINT "PlanCourseDefault_course_option_id_fkey" FOREIGN KEY ("course_option_id") REFERENCES "CourseOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dish" ADD CONSTRAINT "Dish_caterer_id_fkey" FOREIGN KEY ("caterer_id") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dish" ADD CONSTRAINT "Dish_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishPrice" ADD CONSTRAINT "DishPrice_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInviteCode" ADD CONSTRAINT "OrgInviteCode_caterer_id_fkey" FOREIGN KEY ("caterer_id") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diner" ADD CONSTRAINT "Diner_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianDiner" ADD CONSTRAINT "GuardianDiner_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianDiner" ADD CONSTRAINT "GuardianDiner_diner_id_fkey" FOREIGN KEY ("diner_id") REFERENCES "Diner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinerPasskey" ADD CONSTRAINT "DinerPasskey_diner_id_fkey" FOREIGN KEY ("diner_id") REFERENCES "Diner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianPasskey" ADD CONSTRAINT "GuardianPasskey_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploader_org_admin_id_fkey" FOREIGN KEY ("uploader_org_admin_id") REFERENCES "OrgStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploader_caterer_staff_id_fkey" FOREIGN KEY ("uploader_caterer_staff_id") REFERENCES "CatererStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinerGroup" ADD CONSTRAINT "DinerGroup_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinerGroupMember" ADD CONSTRAINT "DinerGroupMember_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "DinerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinerGroupMember" ADD CONSTRAINT "DinerGroupMember_diner_id_fkey" FOREIGN KEY ("diner_id") REFERENCES "Diner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
