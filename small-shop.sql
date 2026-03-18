--
-- PostgreSQL database dump
--

\restrict 931PKJWUcwvHtLXlIT5QyDE0QY0dhfXql9ORTUrB5ikbQrM1LsIQByYK0zstw6G

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_images DROP CONSTRAINT IF EXISTS product_images_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS trg_refresh_product_rating ON public.reviews;
DROP INDEX IF EXISTS public.idx_users_google_id;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_reviews_user_id;
DROP INDEX IF EXISTS public.idx_reviews_product_id;
DROP INDEX IF EXISTS public.idx_product_variants_product;
DROP INDEX IF EXISTS public.idx_product_variants_default;
DROP INDEX IF EXISTS public.idx_product_images_product_id;
DROP INDEX IF EXISTS public.idx_orders_user_id;
DROP INDEX IF EXISTS public.idx_orders_status;
DROP INDEX IF EXISTS public.idx_orders_order_code;
DROP INDEX IF EXISTS public.idx_order_items_variant;
DROP INDEX IF EXISTS public.idx_order_items_order_id;
DROP INDEX IF EXISTS public.idx_coupons_code;
DROP INDEX IF EXISTS public.idx_contact_messages_email;
DROP INDEX IF EXISTS public.idx_contact_messages_created_at;
DROP INDEX IF EXISTS public.idx_cart_items_user_id;
ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_google_id_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.shop_settings DROP CONSTRAINT IF EXISTS shop_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_product_id_user_id_key;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_slug_key;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_ml_key;
ALTER TABLE IF EXISTS ONLY public.product_variants DROP CONSTRAINT IF EXISTS product_variants_pkey;
ALTER TABLE IF EXISTS ONLY public.product_images DROP CONSTRAINT IF EXISTS product_images_product_id_position_key;
ALTER TABLE IF EXISTS ONLY public.product_images DROP CONSTRAINT IF EXISTS product_images_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_order_code_key;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_pkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_code_key;
ALTER TABLE IF EXISTS ONLY public.contact_messages DROP CONSTRAINT IF EXISTS contact_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_variant_key;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_users DROP CONSTRAINT IF EXISTS admin_users_username_key;
ALTER TABLE IF EXISTS ONLY public.admin_users DROP CONSTRAINT IF EXISTS admin_users_pkey;
ALTER TABLE IF EXISTS ONLY public._sqlx_migrations DROP CONSTRAINT IF EXISTS _sqlx_migrations_pkey;
DROP TABLE IF EXISTS public.wishlists;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.shop_settings;
DROP TABLE IF EXISTS public.reviews;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.product_variants;
DROP TABLE IF EXISTS public.product_images;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.coupons;
DROP TABLE IF EXISTS public.contact_messages;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.cart_items;
DROP TABLE IF EXISTS public.admin_users;
DROP TABLE IF EXISTS public._sqlx_migrations;
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.refresh_product_rating();
DROP EXTENSION IF EXISTS pgcrypto;
--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: refresh_product_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_product_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE products
    SET
        rating       = COALESCE((SELECT AVG(rating)::FLOAT8 FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)), 0),
        review_count = (SELECT COUNT(*)             FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id))
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _sqlx_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._sqlx_migrations (
    version bigint NOT NULL,
    description text NOT NULL,
    installed_on timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    checksum bytea NOT NULL,
    execution_time bigint NOT NULL
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name character varying(255) DEFAULT ''::character varying NOT NULL,
    role character varying(50) DEFAULT 'super_admin'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    variant text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contact_messages_email_check CHECK ((email ~* '^[^@]+@[^@]+\.[^@]+$'::text)),
    CONSTRAINT contact_messages_message_check CHECK (((char_length(message) >= 10) AND (char_length(message) <= 2000))),
    CONSTRAINT contact_messages_name_check CHECK (((char_length(name) >= 2) AND (char_length(name) <= 100)))
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    type text NOT NULL,
    value bigint NOT NULL,
    min_order bigint DEFAULT 0 NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT coupons_type_check CHECK ((type = ANY (ARRAY['percent'::text, 'fixed'::text]))),
    CONSTRAINT coupons_value_check CHECK ((value > 0))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    product_image text NOT NULL,
    variant text DEFAULT ''::text NOT NULL,
    quantity integer NOT NULL,
    unit_price bigint NOT NULL,
    subtotal bigint NOT NULL,
    variant_id uuid,
    variant_label text DEFAULT ''::text NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_code text NOT NULL,
    user_id uuid,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NOT NULL,
    address text NOT NULL,
    note text,
    payment_method text DEFAULT 'cod'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    subtotal bigint NOT NULL,
    shipping_fee bigint DEFAULT 30000 NOT NULL,
    total bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_payment_method_check CHECK ((payment_method = ANY (ARRAY['cod'::text, 'bank_transfer'::text, 'wallet'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'shipping'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    ml integer NOT NULL,
    price bigint NOT NULL,
    original_price bigint,
    stock integer DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_variants_ml_check CHECK ((ml > 0)),
    CONSTRAINT product_variants_original_price_check CHECK ((original_price >= 0)),
    CONSTRAINT product_variants_price_check CHECK ((price >= 0)),
    CONSTRAINT product_variants_stock_check CHECK ((stock >= 0))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    price bigint NOT NULL,
    original_price bigint,
    image_url text NOT NULL,
    images text[] DEFAULT '{}'::text[] NOT NULL,
    badge text,
    description text,
    material text,
    care text,
    rating numeric(2,1) DEFAULT 5.0 NOT NULL,
    review_count integer DEFAULT 0 NOT NULL,
    in_stock boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    brand text,
    concentration text,
    top_note text,
    mid_note text,
    base_note text
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating smallint NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: shop_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_settings (
    key character varying(100) NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    google_id character varying NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    avatar_url character varying,
    role character varying DEFAULT 'customer'::character varying NOT NULL,
    refresh_token character varying,
    token_expires_at timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone character varying(20),
    address text
);


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Data for Name: _sqlx_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._sqlx_migrations (version, description, installed_on, success, checksum, execution_time) FROM stdin;
1	create users	2026-03-05 02:03:38.969769+07	t	\\x2e4a8133e7d9f0b00d7c4571dad2b728aadb8b82d879b494ad9535affecb57671256c63e42dc018db09e608817ae1ef6	58196800
2	add phone address	2026-03-05 02:03:39.029323+07	t	\\x986fb6c3d4ee4f74ea67dc76fd7fdd8e7ea00870cd0058e06e6692285879cdde26a36c91f7b9e290c4ed371b94eabded	2937600
3	contact messages	2026-03-05 02:03:39.032758+07	t	\\xcaf88e53597885042dfe88762637bc15e1f641cdd8bf4bd190be2e21782886ae080d1c3e384137845413caf2f170f606	1246100
4	categories	2026-03-05 02:03:39.034421+07	t	\\x1a3169dfdde445f53ab03bc3a4cca263d5ee64de80916708c628e8eb23d794bdeffce6460d23552f8c5a4cdd6886c2a2	1557000
5	products	2026-03-05 02:04:18.298398+07	t	\\xfcd0ab2639e5297d938f107607a6887403483bfcb6f7b7871b43d0c92f2f94d94a3596a28685e2391c08a4d5083f4a5a	6098500
6	cart items	2026-03-05 02:04:18.305384+07	t	\\x7823c8f8c99cd01cfd65627904307190b71bfaeb25a5530daaa434ae277a8d0f3d268346d179d98309f9dd0ef7c8144b	997900
7	orders	2026-03-05 02:04:18.306773+07	t	\\xd3149c82f5fe16a4ab68225cfe84296be6efc7a98512050922512d15d7c6b8b1b175be82948b2e576b92260f645164d9	1410600
8	order items	2026-03-05 02:04:18.308566+07	t	\\xe95970e1a142028959f884743217e4914d8559fc926f8aa34ddcd5e26ad671d8c619b937fdc2e4d7d8e2a9a76e275bee	897400
9	admin users	2026-03-05 02:04:18.310617+07	t	\\x8536f27b84ea07f461f3a3e134bcbd7105c8d2f29991fabcf78d97f8c8e64f69d57be776d04431a43148759ee14775e6	9043200
10	fix category names	2026-03-05 02:04:18.320111+07	t	\\x0d8e7e85800f5a2466bc09a1940a22e68a7a1a5b6e6c908794c692b3ff900315ff9bfdd0abb30f076fbc77668956492c	900400
11	add stock to products	2026-03-05 13:32:36.351721+07	t	\\x0c307c85e4d522f73ff30ba2e8f5de55b5d6b5afda999e8ecd39d09da659ae2ffacbf32b9313d659736f103e281851d7	35233100
12	fix invalid image urls	2026-03-05 22:18:49.878903+07	t	\\x9da491c43ab54b8a75d3995558c14f491c0a4fc206e945294e5f1521bd53da45413bc3e028322b484e45b06cf3a0e1a2	6780300
13	add role to admin	2026-03-05 22:51:58.136808+07	t	\\xdaf1efe09615d3b116eb3f189d28b34051dfdd53cd454513adcc598964de937c6ae51e5016436f1200fc30aa77d01ce5	81333300
14	shop settings	2026-03-05 22:51:58.219484+07	t	\\x2ae5fcaea7df907a178e67b93a8b584b549189b7253dc14ca83c0087303ae1b084b90f255892a9e98b794827cdd18bf1	35875200
15	hero slides settings	2026-03-06 01:35:01.624805+07	t	\\xf1907487acb466233beb89d9fc711ad237788ceeae55a74d0daccbc781b6db00f05b0e6bfabc625d64e90462c16165c9	6212500
16	product variants	2026-03-09 07:29:52.063165+07	t	\\x0027b0cc2ec226e95032917e77d54c64bbd3c9084620f8c67a12575d3413dedc444e23d06901b6133145dc596d7376cd	107109500
17	fragment notes	2026-03-09 12:25:07.580015+07	t	\\xbe63ab786309bf4bc1223c7023cc948296797403f102d297385c1417a27082fb855aeefadcd9bfaf828e2b186e209f6e	15547100
18	reviews	2026-03-10 22:10:25.434677+07	t	\\x8a9a28753df18ec40e770b76d069d31b0cbc62274384cd8c742dff6b222ccbf2e5bf5d0990680f706164031de436670a	183522200
19	coupons	2026-03-10 22:10:25.619717+07	t	\\x56963d44a86a3540584e6eceec696bbcb6d53f029099ed960eeadd65ce957d59e8ea582991de4dded88462d43ccc0780	10881000
20	wishlists	2026-03-14 22:56:39.817761+07	t	\\x93c518da4eec3ba21bdf1e6e7e5bd7ca2a50c8d056e3ab96fb18c82152a36f2ae3b4b12b573d7dafcd2433d3a1de4240	93544400
21	create product images	2026-03-14 22:56:39.912598+07	t	\\x40b327189bee92add6a67a61c6b2e8c73cf31f2f62a9f8d347b521c9eed2f8e5a5069aeda153cb7bfc7739dcb0b3fcd3	7087000
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_users (id, username, password_hash, created_at, full_name, role, is_active) FROM stdin;
9ba1a43a-e379-442e-943e-bae79508e453	hothienty	$argon2id$v=19$m=19456,t=2,p=1$SD24ZkdAT7KJWqCBL4RUkw$wNSLiJ3lbo4EvdsAEoiOtOjp2yG4pZMnMx0meI2s1I8	2026-03-05 02:04:18.888013+07		super_admin	t
e1bb86c0-04e1-44ee-b6c1-254b14e4c27e	tranhuynhanh	$argon2id$v=19$m=19456,t=2,p=1$Ek47ytVFh6ZPyyjlsilEoA$XZTO1Qsi2gPT905iz2HlIPcjarMDQXOOqbgrgy0sK7E	2026-03-18 17:41:30.653621+07	Trần Huỳnh Anh	staff	t
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, user_id, product_id, quantity, variant, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, image_url, created_at) FROM stdin;
2aa623e5-2854-4cfd-a8c1-684d3ad7c014	Jean Paul Gaultier	jean-paul-gaultier	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077600/shop/images/rcqjl3ob9rhtyiuv65t8.jpg	2026-03-10 00:33:15.639354+07
94268c17-53d7-49c1-9a79-7eb72da637f1	Yves Saint Laurent	yves-saint-laurent	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773814266/shop/images/palzhvyw6mu86r8ulfxm.jpg	2026-03-18 13:10:56.946179+07
be3831d8-c5d0-4bdd-95c2-0acd6f21e4b8	Louis Vuitton	louis-vuitton	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773814313/shop/images/near3qsimhlc7fknahvl.jpg	2026-03-18 13:11:56.257743+07
3f299650-571f-424a-9efe-4107eda4e7fc	Versace	versace	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773814422/shop/images/gcaqzkuertrtghtipvfv.jpg	2026-03-18 13:13:32.028642+07
2f41fe09-7b06-41b0-b4c9-2d97c6aa793b	Valentino	valentino	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773827574/shop/images/z96aw6gthiodhd5kh0mo.jpg	2026-03-18 16:52:43.601056+07
dbab1420-a0b0-4606-ac6b-7711998b9c76	Hugo Boss	hugo-boss	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773827626/shop/images/aro004ijxgyjp0peugrh.jpg	2026-03-18 16:53:35.651383+07
a8b69226-6c75-4db6-bd22-4b3b75078764	Tom Ford	tom-ford	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773827661/shop/images/cmnkol6accqbgf1nnhpa.jpg	2026-03-18 16:54:10.991099+07
0ffda9e5-f8ee-4d5d-afb4-4392a4f0a23b	Dolce Gabbana	dolce-gabbana	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773827722/shop/images/oj1nacer172rnwzhmrym.jpg	2026-03-18 16:55:18.844346+07
de610f88-c7ec-43f2-8d84-5ceaaaf38ff1	Prada	prada	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837946/shop/images/jasdryxpqi4urjhmw8ti.jpg	2026-03-18 19:45:39.305332+07
d3b55a76-4b24-45a5-8ea3-48835621bcb6	Lacoste	lacoste	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837963/shop/images/mmak70jj4qhwifdtryq0.jpg	2026-03-18 19:45:52.777231+07
8cf21081-56a4-42b9-819f-a3f80f3a0aa1	Chanel	chanel	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837969/shop/images/fmd4eor48eneto6z6deb.jpg	2026-03-18 19:46:01.854692+07
9030b3c5-672d-4723-9f02-d001555e3583	Buberry	buberry	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773838355/shop/images/rkhbs0zksnmlydzgugqd.jpg	2026-03-18 19:52:24.692692+07
b368aad0-e461-4d43-821f-d663ffdc805e	Giorgio Armani	giorgio-armani	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773814375/shop/images/d0bfpfjmygs3fdhjhlb9.jpg	2026-03-09 12:32:35.362602+07
0e09edb5-e470-4c8d-bd81-0315a9b75d0c	Bvlgari	bvlgari	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773838611/shop/images/wnkqrum1i1kwhvxfupkz.jpg	2026-03-18 19:56:32.138458+07
debf6c45-7763-404b-b80c-f29cb716a972	Creed	creed	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773838700/shop/images/uaqomnpqkqlyscv41k3f.jpg	2026-03-18 19:58:13.005978+07
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contact_messages (id, name, email, phone, message, ip_address, created_at) FROM stdin;
21bc1c4e-ce4c-4842-9b65-fb3254064ddf	Hồ Thiên Tỷ	kakasitink@gmail.com	0399623947	Tôi nhớ cô quá đi	\N	2026-03-04 12:29:55.677447+07
0e26bd39-e1cf-4e57-8834-f72fc75a581f	Khánh Hào	minhdevill@gmail.com	\N	Chào bạn tôi rất yêu bạn	\N	2026-03-04 12:32:46.170182+07
e1be0152-3dcb-4d49-9051-75696baf0386	Trần Huỳnh Anh	tranhuynhanh857@gmail.com	\N	Em mập địt	\N	2026-03-12 23:56:53.243897+07
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupons (id, code, type, value, min_order, max_uses, used_count, expires_at, is_active, created_at) FROM stdin;
e7fb3d73-b900-4466-be92-f77ddd35c221	SALE10	percent	10	1	1	1	2026-03-12 02:09:00+07	t	2026-03-11 02:09:36.414849+07
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, product_name, product_image, variant, quantity, unit_price, subtotal, variant_id, variant_label) FROM stdin;
85f54af5-6599-4d91-b862-febe1befaf0b	eea745d9-a5f0-426c-be1b-62badaf1ac99	\N	Nến Thơm Lavender Handmade	/assets/products/nen-lavender.jpg		1	185000	185000	\N	
650748eb-7547-420b-8ff0-866c1e9f1d8f	a8c940f3-fddb-43d1-8e0b-f0edc36e9c87	\N	Túi Tote Canvas Thêu Tay	/assets/products/tui-tote.jpg		1	320000	320000	\N	
20c36a97-9c78-4d95-adb2-667a0f0da7bc	50df8852-bfd7-41cd-a691-e316253b1691	\N	Túi Tote Canvas Thêu Tay	/assets/products/tui-tote.jpg		1	320000	320000	\N	
79fe53df-acec-4c57-90ab-79175c52fe8d	08c24e22-756b-4524-b7b8-1fb9e4eae7a4	\N	Vòng Tay Đá Thạch Anh Hồng	/assets/products/vong-thach-anh.jpg		1	250000	250000	\N	
fb311925-be89-4466-9808-fd97197446f4	75cf73df-ec0d-4125-b5b3-42ff0029faed	0bd547a9-db34-48f7-87dc-9075423ec14d	Stronger With You Intensely	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034507/shop/images/zqb30amer0bdihsqcv1h.jpg		1	330000	330000	\N	
1d2fc005-b77e-4679-ad4e-8aa75d6a4142	3cf368be-2f48-4c54-882a-ad197c73583d	0bd547a9-db34-48f7-87dc-9075423ec14d	Stronger With You Intensely	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034507/shop/images/zqb30amer0bdihsqcv1h.jpg	100ml	1	3000000	3000000	\N	
0a11ba4d-9a7b-4b17-8767-523c6776abe7	549d38ee-a8bf-464d-954f-399deecdeaae	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	Le Male Le Parfum	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077618/shop/images/bdcrofqcxezcdnpqn9af.jpg	200ml	1	4300000	4300000	\N	
72b6b925-e40f-449f-bd78-21d34358bc53	1f348dab-acb8-44e1-86e7-0a228b1bd2d4	0bd547a9-db34-48f7-87dc-9075423ec14d	Stronger With You Intensely	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034507/shop/images/zqb30amer0bdihsqcv1h.jpg	100ml	1	3000000	3000000	\N	
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_code, user_id, customer_name, customer_email, customer_phone, address, note, payment_method, status, subtotal, shipping_fee, total, created_at, updated_at) FROM stdin;
50df8852-bfd7-41cd-a691-e316253b1691	HS-20260304-BQMSRF	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	delivered	320000	30000	350000	2026-03-04 23:43:52.11635+07	2026-03-05 14:40:25.257004+07
08c24e22-756b-4524-b7b8-1fb9e4eae7a4	HS-20260304-OQFPP7	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	250000	30000	280000	2026-03-04 14:22:59.378491+07	2026-03-05 14:46:15.765774+07
75cf73df-ec0d-4125-b5b3-42ff0029faed	HS-20260309-GBONRA	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	330000	30000	360000	2026-03-09 13:58:05.136752+07	2026-03-10 00:30:17.20251+07
eea745d9-a5f0-426c-be1b-62badaf1ac99	HS-20260304-7EVHVM	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	185000	30000	215000	2026-03-04 15:13:35.772594+07	2026-03-10 00:30:20.863282+07
a8c940f3-fddb-43d1-8e0b-f0edc36e9c87	HS-20260304-R6XQZQ	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	320000	30000	350000	2026-03-04 14:20:05.108344+07	2026-03-10 00:30:22.296313+07
3cf368be-2f48-4c54-882a-ad197c73583d	HS-20260310-1KPNYH	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	3000000	30000	3030000	2026-03-11 02:01:53.205106+07	2026-03-11 02:09:12.63563+07
1f348dab-acb8-44e1-86e7-0a228b1bd2d4	HS-20260312-MAZCKE	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	3000000	30000	3030000	2026-03-12 23:54:23.181783+07	2026-03-12 23:54:47.273452+07
549d38ee-a8bf-464d-954f-399deecdeaae	HS-20260310-DHMI3G	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	4300000	30000	3900000	2026-03-11 02:10:06.183478+07	2026-03-12 23:54:48.742548+07
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_images (id, product_id, image_url, "position", created_at) FROM stdin;
70302eaa-bb5c-4191-92d6-c7b093a4f508	fff5826e-27b2-44f4-a99e-bdd431388e4e	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079317/shop/images/rmucu8tcnfedsq1btw05.jpg	0	2026-03-15 01:22:00.106832+07
fc532fe2-343a-412e-a578-cf4e25cdbc10	fff5826e-27b2-44f4-a99e-bdd431388e4e	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079319/shop/images/tixicttpz9q4s8vfrxok.jpg	1	2026-03-15 01:22:00.107717+07
fa2f1fbc-b2f3-4be7-b6b3-57b13a391a10	fff5826e-27b2-44f4-a99e-bdd431388e4e	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079320/shop/images/p2bohdcikxbfvepmou5h.jpg	2	2026-03-15 01:22:00.108484+07
f6843c62-e354-4037-bdf9-c6d8467c1fca	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077690/shop/images/as53szznrzwhjzb1oeil.jpg	0	2026-03-18 19:50:23.41082+07
93ccb019-b5e1-4d53-9f0a-adddb1e2fe28	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077625/shop/images/h6tp1vy9u2thagmqaojj.jpg	1	2026-03-18 19:50:23.414765+07
a5b021ac-876f-46db-9fb6-ec2854fe30d5	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077703/shop/images/xgslpi82evskql1vipgy.jpg	2	2026-03-18 19:50:23.416994+07
ee02adb8-7720-4609-afe4-dfc1c8da5a1a	c3c9ba3f-1421-491e-9a84-4da29cbfd649	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117255/shop/images/vnl0vjfwsweavhf9h77k.jpg	0	2026-03-18 19:54:21.61889+07
40bfd6a4-994d-49ae-8e23-376f506bdf74	c3c9ba3f-1421-491e-9a84-4da29cbfd649	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117253/shop/images/npehvuo0pfs4frlfbki0.jpg	1	2026-03-18 19:54:21.620833+07
443a094f-94a2-4efb-86b6-cec0e20eadae	c3c9ba3f-1421-491e-9a84-4da29cbfd649	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117256/shop/images/jxemayt7x4xxbreh6pow.jpg	2	2026-03-18 19:54:21.622354+07
15f49483-add0-4ecf-bb39-3c9cced59090	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511889/shop/images/b62o7y1imq9jmf7pumiq.jpg	0	2026-03-18 19:58:46.744687+07
eb80752d-b43a-4028-ac6c-e167f87ce277	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511890/shop/images/netlmpe5yxdx4vcywiy0.jpg	1	2026-03-18 19:58:46.745434+07
8f6da7b3-8bc6-4a2b-b9db-1c3e248d9f9b	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511892/shop/images/kactv3b3lwdsr8dhvzxv.jpg	2	2026-03-18 19:58:46.74702+07
b9c347a5-486a-406e-9ad4-2c7471ef7e7f	4674fd21-0882-42b0-b25a-55bf2335347b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839141/shop/images/ododtwahxwfev61adwos.jpg	0	2026-03-18 20:05:35.762045+07
d400d8d0-0cd1-4b56-9242-7916ff7a762f	4674fd21-0882-42b0-b25a-55bf2335347b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839142/shop/images/jpfe3ugr2wwayjwvbogx.jpg	1	2026-03-18 20:05:35.76281+07
7ebec25d-c340-44bf-84e1-5af9e77ee68c	4674fd21-0882-42b0-b25a-55bf2335347b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839143/shop/images/xwplj54hftvvewdb5lkq.jpg	2	2026-03-18 20:05:35.764204+07
e54905c5-a634-4802-8d8e-9ba4a89b3a90	eddf3359-ba70-4037-aecc-c656d135ccbe	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839333/shop/images/bo6ycij8hetlip0cd1e8.jpg	0	2026-03-18 20:11:32.163956+07
13beea95-5755-48c8-a481-4da6e3e96d4b	eddf3359-ba70-4037-aecc-c656d135ccbe	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839335/shop/images/drgyk9b6dlwqp3aoj9gd.jpg	1	2026-03-18 20:11:32.164881+07
84d648ca-020b-4a2f-a999-0f7088a24940	eddf3359-ba70-4037-aecc-c656d135ccbe	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839335/shop/images/uursum852ml6pvhelixj.jpg	2	2026-03-18 20:11:32.165661+07
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_variants (id, product_id, ml, price, original_price, stock, is_default, created_at) FROM stdin;
e2b872fe-9987-4ba9-972e-8fb8c409d95d	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	10	420000	\N	5	t	2026-03-15 01:12:15.957893+07
7b63b342-cd7d-44b4-a24d-8851d15d98ac	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	100	3800000	\N	2	f	2026-03-15 01:12:15.952319+07
b67f9e3e-fe76-4243-b3a7-73beea12705f	4674fd21-0882-42b0-b25a-55bf2335347b	10	330000	\N	3	t	2026-03-18 20:05:35.748447+07
09aed9f7-34ec-4fe4-9615-e950f0cdd640	4674fd21-0882-42b0-b25a-55bf2335347b	100	3150000	\N	2	f	2026-03-18 20:05:35.756092+07
ef886d5a-a571-434e-85ca-1c109c81c2cc	eddf3359-ba70-4037-aecc-c656d135ccbe	10	310000	\N	7	t	2026-03-18 20:11:11.58212+07
e7d46d5f-45fc-4d62-ac12-4ca99b5db418	eddf3359-ba70-4037-aecc-c656d135ccbe	100	3420000	\N	4	f	2026-03-18 20:11:11.667661+07
9af7cc44-0d64-4ecc-a71b-d73012a3c8a0	eddf3359-ba70-4037-aecc-c656d135ccbe	200	4300000	\N	2	f	2026-03-18 20:11:11.673033+07
1ed65e57-0355-4dae-b97c-9e1a31643568	fff5826e-27b2-44f4-a99e-bdd431388e4e	10	330000	\N	5	t	2026-03-10 01:02:50.581365+07
affb738c-9e02-4c7d-9336-4a329ba3dfd2	fff5826e-27b2-44f4-a99e-bdd431388e4e	100	3000000	\N	4	f	2026-03-10 01:02:50.579874+07
b87e2733-b41a-407a-ad75-2b67237bd482	0bd547a9-db34-48f7-87dc-9075423ec14d	10	330000	\N	5	t	2026-03-09 12:36:50.928178+07
ec531814-6606-42cb-8b7e-0465079565d9	0bd547a9-db34-48f7-87dc-9075423ec14d	100	3000000	\N	2	f	2026-03-09 12:36:50.924737+07
0beadd1e-9f92-4b87-b7a5-2d7370e51770	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	10	380000	\N	4	t	2026-03-10 00:38:38.046498+07
92690f68-481d-4d81-bb0c-fead8138d66c	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	100	2900000	\N	3	f	2026-03-10 00:38:38.053068+07
63efc817-21fb-4d18-aea7-8a801b5ec32a	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	125	3400000	\N	5	f	2026-03-10 00:38:38.050263+07
be46c81c-b560-42b5-a3b1-1f69a34d44b8	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	200	4300000	\N	2	f	2026-03-10 00:38:38.056736+07
39e337ea-7d82-4c5f-8b39-2638bd4e3c22	c3c9ba3f-1421-491e-9a84-4da29cbfd649	100	3800000	\N	1	t	2026-03-10 11:34:47.091836+07
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, category_id, name, slug, price, original_price, image_url, images, badge, description, material, care, rating, review_count, in_stock, created_at, stock, brand, concentration, top_note, mid_note, base_note) FROM stdin;
4674fd21-0882-42b0-b25a-55bf2335347b	dbab1420-a0b0-4606-ac6b-7711998b9c76	Hugo Boss Absolute	hugo-boss-absolute	330000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839138/shop/images/lzgnvfyocozbrxtjsrrx.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839141/shop/images/ododtwahxwfev61adwos.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839142/shop/images/jpfe3ugr2wwayjwvbogx.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839143/shop/images/xwplj54hftvvewdb5lkq.jpg}	Mới	\N	\N	\N	5.0	0	t	2026-03-18 20:05:35.733454+07	5	Hugo Boss	\N	\N	\N	\N
0bd547a9-db34-48f7-87dc-9075423ec14d	b368aad0-e461-4d43-821f-d663ffdc805e	Stronger With You Intensely	stronger-with-you-intensely	330000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034507/shop/images/zqb30amer0bdihsqcv1h.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034502/shop/images/zeqmbbbw1bqsaohryyk0.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034514/shop/images/jntil86kngvkpw7mmxbv.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034516/shop/images/fcm2hakyrc8hspw7g8nc.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-09 12:36:50.915278+07	8	GIO ARMANI	Eau de Parfum	Hoa tím, Quả bách xù, Tiêu hồng	Cây xô thơm, Hoa Oải Hương, Kẹo bơ cứng, Quế	 Da lộn, Đậu Tonka, Gỗ hổ phách, Hương Va ni (Vanila)
fff5826e-27b2-44f4-a99e-bdd431388e4e	b368aad0-e461-4d43-821f-d663ffdc805e	Stronger With You Absolutely	stronger-with-you-absolutely	330000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079316/shop/images/x4yb6o4ikyuerfsqasvq.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079317/shop/images/rmucu8tcnfedsq1btw05.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079319/shop/images/tixicttpz9q4s8vfrxok.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079320/shop/images/p2bohdcikxbfvepmou5h.jpg}	Giảm Giá	\N	\N	\N	5.0	0	t	2026-03-10 01:02:50.573746+07	9	\N	\N	\N	\N	\N
c3c9ba3f-1421-491e-9a84-4da29cbfd649	b368aad0-e461-4d43-821f-d663ffdc805e	Stronger With You Powerfully	stronger-with-you-powerfully	3800000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117253/shop/images/zy1oay7y4pn6qkeqjjy1.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117255/shop/images/vnl0vjfwsweavhf9h77k.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117253/shop/images/npehvuo0pfs4frlfbki0.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117256/shop/images/jxemayt7x4xxbreh6pow.jpg}	Mới	\N	\N	\N	5.0	1	t	2026-03-10 11:34:47.080805+07	1	Giorgio Armani	Eau de Parfum	\N	\N	\N
1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	2aa623e5-2854-4cfd-a8c1-684d3ad7c014	Le Male Le Parfum	le-male-le-parfum	380000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077618/shop/images/bdcrofqcxezcdnpqn9af.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077690/shop/images/as53szznrzwhjzb1oeil.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077625/shop/images/h6tp1vy9u2thagmqaojj.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077703/shop/images/xgslpi82evskql1vipgy.jpg}	Nổi Bật	\N	\N	\N	5.0	1	t	2026-03-10 00:38:38.022835+07	14	Jean Paul Gaultier	Parfum	Bạch đậu khấu	 Hoa Oải Hương, Iris	Hương Gỗ., Oriental note, Vani
f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	b368aad0-e461-4d43-821f-d663ffdc805e	Stronger With You Parfum	stronger-with-you-parfum	420000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511886/shop/images/sgdakzyixe6jgdtoamey.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511889/shop/images/b62o7y1imq9jmf7pumiq.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511890/shop/images/netlmpe5yxdx4vcywiy0.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511892/shop/images/kactv3b3lwdsr8dhvzxv.jpg}	Giảm Giá	\N	\N	\N	5.0	0	t	2026-03-15 01:12:15.930553+07	7	\N	Parfum	Cam, hạt tiêu hồng	Cây xô thơm, Hoa Oải Hương	Hạt dẻ, Hương Va ni (Vanilla)
eddf3359-ba70-4037-aecc-c656d135ccbe	94268c17-53d7-49c1-9a79-7eb72da637f1	YSL Y EDP	ysl-y-edp	310000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839331/shop/images/nkvhqielhg70ixqchnar.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839333/shop/images/bo6ycij8hetlip0cd1e8.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839335/shop/images/drgyk9b6dlwqp3aoj9gd.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839335/shop/images/uursum852ml6pvhelixj.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-18 20:11:11.577609+07	13	Yves Saint Laurent	Eau de Parfum	 Cam Bergamot, Gừng, Quả táo xanh	Cây xô thơm, Hoa phong lữ, Quả Bách Xù	Đậu Tonka, Gỗ tuyết tùng
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, product_id, user_id, rating, comment, created_at, updated_at) FROM stdin;
0c86f844-974f-40e7-8f00-443983540def	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	dff1b7cb-133a-4d03-ac65-3de8eb83887e	5	Mùi thơm tuyệt vời	2026-03-11 02:16:18.931547+07	2026-03-11 02:16:18.931547+07
c0a8d7b9-ba7d-485d-a313-21400f9ce091	c3c9ba3f-1421-491e-9a84-4da29cbfd649	dff1b7cb-133a-4d03-ac65-3de8eb83887e	5	Trần Huỳnh Anh mập địt	2026-03-12 23:53:21.518808+07	2026-03-12 23:53:21.518808+07
\.


--
-- Data for Name: shop_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shop_settings (key, value, updated_at) FROM stdin;
store_facebook		2026-03-05 22:51:58.219484+07
store_instagram		2026-03-05 22:51:58.219484+07
store_tiktok		2026-03-05 22:51:58.219484+07
shipping_fee_default	30000	2026-03-05 22:51:58.219484+07
free_shipping_from	500000	2026-03-05 22:51:58.219484+07
hero_title	Quà Handmade Tuyệt Vời	2026-03-05 22:51:58.219484+07
hero_subtitle	Được làm với tình yêu thương	2026-03-05 22:51:58.219484+07
hero_image_url		2026-03-05 22:51:58.219484+07
email_footer	Cảm ơn bạn đã ủng hộ cửa hàng của chúng tôi!	2026-03-05 22:51:58.219484+07
brand_slide_4_thumbnail		2026-03-18 15:52:21.512392+07
hero_slide_1_href		2026-03-18 19:43:11.870048+07
hero_slide_2_href	/products	2026-03-18 19:43:11.870048+07
hero_slide_1_subtitle	Nước hoa Design cao cấp	2026-03-18 19:43:11.870048+07
brand_slide_4_img		2026-03-18 15:52:21.512392+07
hero_slide_3_title		2026-03-18 19:43:11.870048+07
hero_slide_3_href		2026-03-18 19:43:11.870048+07
banner_image_url	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773080673/shop/images/dnagsurxuaryugzkhxna.jpg	2026-03-18 19:43:11.870048+07
brand_slide_1_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837799/shop/images/hmhg7awu1l6kpf485sjw.jpg	2026-03-18 19:43:11.870048+07
banner_subtitle	áp dụng từ 10/3 - 10/4	2026-03-18 19:43:11.870048+07
hero_slide_1_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773078474/shop/images/qtizlrapfnz6yeuqwtg2.jpg	2026-03-18 19:43:11.870048+07
brand_slide_1_thumbnail	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837799/shop/images/hmhg7awu1l6kpf485sjw.jpg	2026-03-18 19:43:11.870048+07
brand_slide_3_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837665/shop/images/qvm5oagafwr9byguattq.jpg	2026-03-18 19:43:11.870048+07
brand_slide_2_thumbnail	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773831930/ulysse-pointcheval--j6LLsAehUo-unsplash_w2jo9u.jpg	2026-03-18 19:43:11.870048+07
hero_slide_2_title	Nhiều Loại Nước Hoa Và Mùi Thơm Độc Đáo	2026-03-18 19:43:11.870048+07
brand_slide_6_img		2026-03-18 15:52:21.512392+07
hero_slide_1_cta		2026-03-18 19:43:11.870048+07
brand_slide_5_img		2026-03-18 15:52:21.512392+07
brand_section_title	Thương Hiệu	2026-03-18 19:43:11.870048+07
hero_slide_3_subtitle		2026-03-18 19:43:11.870048+07
brand_slide_2_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773831930/ulysse-pointcheval--j6LLsAehUo-unsplash_w2jo9u.jpg	2026-03-18 19:43:11.870048+07
hero_slide_2_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773078898/shop/images/xeezjbbg67b865trzwio.jpg	2026-03-18 19:43:11.870048+07
hero_slide_3_cta		2026-03-18 19:43:11.870048+07
brand_slide_3_thumbnail	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837665/shop/images/qvm5oagafwr9byguattq.jpg	2026-03-18 19:43:11.870048+07
shop_font	Playfair Display	2026-03-18 19:43:11.870048+07
banner_link	/products	2026-03-18 19:43:11.870048+07
banner_title	Sale Cực Sâu	2026-03-18 19:43:11.870048+07
hero_slide_3_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1772997255/shop/images/uln1oic7y3wdbujuxnjv.jpg	2026-03-18 19:43:11.870048+07
social_facebook	https://www.facebook.com/deactivateyoursoul/	2026-03-10 01:30:58.828666+07
store_email	tytybill123@gmail.com	2026-03-10 01:30:58.828666+07
store_name	Handmade Haven	2026-03-10 01:30:58.828666+07
social_instagram		2026-03-10 01:30:58.828666+07
brand_slide_6_thumbnail		2026-03-18 15:52:21.512392+07
social_tiktok		2026-03-10 01:30:58.828666+07
store_phone	0399623947	2026-03-10 01:30:58.828666+07
store_address	Châu Đốc, An Giang	2026-03-10 01:30:58.828666+07
hero_slide_2_cta		2026-03-18 19:43:11.870048+07
hero_slide_1_title	Trãi Nghiệm Nước Hoa Cao Cấp	2026-03-18 19:43:11.870048+07
brand_slide_5_thumbnail		2026-03-18 15:52:21.512392+07
hero_slide_2_subtitle	Stronger With You Intensely	2026-03-18 19:43:11.870048+07
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, google_id, email, name, avatar_url, role, refresh_token, token_expires_at, last_login_at, created_at, updated_at, phone, address) FROM stdin;
dff1b7cb-133a-4d03-ac65-3de8eb83887e	103078503954791498680	tytybill123@gmail.com	Hồ Thiên Tỷ	https://lh3.googleusercontent.com/a/ACg8ocJZIEzmnwv_2LnyEwViDz4IINjRwywzRC40EpZpMZxKO5IeLM6H7g=s96-c	customer	\N	\N	2026-03-15 01:56:49.298995+07	2026-03-04 10:25:39.890684+07	2026-03-15 01:56:49.298995+07	0399623497	Cần Thơ
\.


--
-- Data for Name: wishlists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wishlists (user_id, product_id, created_at) FROM stdin;
\.


--
-- Name: _sqlx_migrations _sqlx_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._sqlx_migrations
    ADD CONSTRAINT _sqlx_migrations_pkey PRIMARY KEY (version);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_username_key UNIQUE (username);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_user_id_product_id_variant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_product_id_variant_key UNIQUE (user_id, product_id, variant);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_code_key UNIQUE (order_code);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_product_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_position_key UNIQUE (product_id, "position");


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_product_id_ml_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_ml_key UNIQUE (product_id, ml);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- Name: shop_settings shop_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_settings
    ADD CONSTRAINT shop_settings_pkey PRIMARY KEY (key);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (user_id, product_id);


--
-- Name: idx_cart_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);


--
-- Name: idx_contact_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_messages_created_at ON public.contact_messages USING btree (created_at DESC);


--
-- Name: idx_contact_messages_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_messages_email ON public.contact_messages USING btree (email);


--
-- Name: idx_coupons_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_code ON public.coupons USING btree (code);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_variant ON public.order_items USING btree (variant_id);


--
-- Name: idx_orders_order_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_code ON public.orders USING btree (order_code);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_product_images_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);


--
-- Name: idx_product_variants_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_product_variants_default ON public.product_variants USING btree (product_id) WHERE (is_default = true);


--
-- Name: idx_product_variants_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_product ON public.product_variants USING btree (product_id);


--
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);


--
-- Name: reviews trg_refresh_product_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_refresh_product_rating AFTER INSERT OR DELETE OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 931PKJWUcwvHtLXlIT5QyDE0QY0dhfXql9ORTUrB5ikbQrM1LsIQByYK0zstw6G

