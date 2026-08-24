CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "UserRole" AS ENUM ('customer', 'owner', 'staff', 'admin');
CREATE TYPE "TableShape" AS ENUM ('circle', 'rectangle');
CREATE TYPE "TableStatus" AS ENUM ('available', 'occupied', 'reserved', 'held', 'maintenance');
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled');
CREATE TYPE "OrderType" AS ENUM ('dine_in', 'takeaway', 'pre_order');
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'served', 'paid');
CREATE TYPE "OrderItemStatus" AS ENUM ('pending', 'preparing', 'ready', 'served');
CREATE TYPE "SplitSessionStatus" AS ENUM ('open', 'locked', 'paid');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "dietary_pref" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "refresh_token_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "cuisine_type" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "opening_time" TIME(0) NOT NULL,
  "closing_time" TIME(0) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "total_tables" INTEGER NOT NULL,
  "avg_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "location" geography(Point,4326) NOT NULL,
  CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurant_floors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "floor_order" INTEGER NOT NULL,
  CONSTRAINT "restaurant_floors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tables" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL,
  "floor_id" UUID NOT NULL,
  "table_number" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "min_capacity" INTEGER NOT NULL,
  "position_x" DOUBLE PRECISION NOT NULL,
  "position_y" DOUBLE PRECISION NOT NULL,
  "shape" "TableShape" NOT NULL,
  "rotation" INTEGER NOT NULL,
  "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "qr_code" TEXT NOT NULL,
  "status" "TableStatus" NOT NULL,
  "held_by" UUID,
  "held_until" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category_id" UUID NOT NULL,
  "restaurant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "image_url" TEXT NOT NULL,
  "is_veg" BOOLEAN NOT NULL,
  "is_available" BOOLEAN NOT NULL DEFAULT true,
  "is_fresh_today" BOOLEAN NOT NULL DEFAULT false,
  "calories" INTEGER NOT NULL,
  "allergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "prep_time_min" INTEGER NOT NULL,
  CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bookings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL,
  "table_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "booking_date" DATE NOT NULL,
  "start_time" TIME(0) NOT NULL,
  "end_time" TIME(0) NOT NULL,
  "party_size" INTEGER NOT NULL,
  "status" "BookingStatus" NOT NULL,
  "special_requests" TEXT NOT NULL,
  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL,
  "table_id" UUID NOT NULL,
  "booking_id" UUID,
  "user_id" UUID NOT NULL,
  "type" "OrderType" NOT NULL,
  "status" "OrderStatus" NOT NULL,
  "total_amount" INTEGER NOT NULL,
  "is_split" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "menu_item_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" INTEGER NOT NULL,
  "notes" TEXT NOT NULL,
  "status" "OrderItemStatus" NOT NULL,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "split_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "share_code" TEXT NOT NULL,
  "status" "SplitSessionStatus" NOT NULL,
  CONSTRAINT "split_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "split_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "amount_owed" INTEGER NOT NULL,
  "payment_status" "PaymentStatus" NOT NULL,
  "razorpay_order_id" TEXT NOT NULL,
  CONSTRAINT "split_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tables" ADD CONSTRAINT "tables_position_x_check" CHECK ("position_x" >= 0 AND "position_x" <= 100);
ALTER TABLE "tables" ADD CONSTRAINT "tables_position_y_check" CHECK ("position_y" >= 0 AND "position_y" <= 100);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");
CREATE UNIQUE INDEX "tables_qr_code_key" ON "tables"("qr_code");
CREATE UNIQUE INDEX "split_sessions_share_code_key" ON "split_sessions"("share_code");

ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "restaurant_floors" ADD CONSTRAINT "restaurant_floors_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tables" ADD CONSTRAINT "tables_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "restaurant_floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tables" ADD CONSTRAINT "tables_held_by_fkey" FOREIGN KEY ("held_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "split_sessions" ADD CONSTRAINT "split_sessions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "split_sessions" ADD CONSTRAINT "split_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "split_participants" ADD CONSTRAINT "split_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "split_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "split_participants" ADD CONSTRAINT "split_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
