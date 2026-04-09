--
-- PostgreSQL database dump
--

\restrict wtuxk8BTrZXf37mlHecy8jmPLtt1xCcyRnKOZxf1A5X64ErbDv8MQkFZGSSI1V7

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

DROP DATABASE IF EXISTS smallshop;
--
-- Name: smallshop; Type: DATABASE; Schema: -; Owner: -
--

CREATE DATABASE smallshop WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_United States.1252';


\unrestrict wtuxk8BTrZXf37mlHecy8jmPLtt1xCcyRnKOZxf1A5X64ErbDv8MQkFZGSSI1V7
\connect smallshop
\restrict wtuxk8BTrZXf37mlHecy8jmPLtt1xCcyRnKOZxf1A5X64ErbDv8MQkFZGSSI1V7

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
    coupon_code text,
    coupon_type text,
    coupon_value bigint,
    discount_amt bigint DEFAULT 0 NOT NULL,
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
22	add coupon snapshot to orders	2026-03-21 13:32:35.702387+07	t	\\x80112374a5179b74aff0927dc4adcf0f86c43205c72829af7aa6ceae3237fd52355fb3ca4ac3ce48c14776dbb9c89838	81200800
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
5b836f34-acdb-4c2f-89ec-815a14890a36	Rayhaan	rayhaan	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774115429/shop/images/hykduxmrlge4l3bozqpo.png	2026-03-21 17:50:29.384509+07
ee57dcd6-6eeb-421f-beee-91a8d344d2af	Ex Nihilo	ex-nihilo	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774117832/shop/images/hn45fgyexh1qejzhv9d9.png	2026-03-21 18:30:36.829763+07
a47a4c76-737c-4249-90b6-51e42faa5ccb	Kilian	kilian	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119109/shop/images/gsegscdfcjlflzpla49q.png	2026-03-21 18:51:47.975912+07
9038e7c9-b0e2-415b-b16c-90719c880b10	Azzaro	azzaro	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119739/shop/images/tum0yxknyj3hlwma5m8l.webp	2026-03-21 19:02:06.929294+07
ceec429d-0028-4891-a5e2-d7709620be82	Dior	dior	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120349/shop/images/jkyhqgerkbaose2oqzz9.png	2026-03-21 19:12:27.330929+07
816937ae-7d47-4ce2-88ac-9a26b36acf51	Parfums de Marly	parfums-de-marly	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121758/shop/images/d610tr1r2c50cwtrg3mu.png	2026-03-21 19:35:47.445785+07
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
5dc85483-7b97-4c62-b78f-70744bd5982d	HUYNHANHODO	percent	10	3000000	1	1	2026-03-22 13:35:00+07	t	2026-03-21 13:36:03.053943+07
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
4a49d7b3-1152-4cfa-9262-8559df89cdd6	5acf493c-8097-46e7-a28e-90610c77d368	eddf3359-ba70-4037-aecc-c656d135ccbe	YSL Y EDP	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839331/shop/images/nkvhqielhg70ixqchnar.jpg		1	310000	310000	\N	
4e05e50b-06f9-4398-8485-dc8b6b0267ea	5acf493c-8097-46e7-a28e-90610c77d368	4674fd21-0882-42b0-b25a-55bf2335347b	Hugo Boss Absolute	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839138/shop/images/lzgnvfyocozbrxtjsrrx.jpg	100ml	1	3150000	3150000	\N	
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_code, user_id, customer_name, customer_email, customer_phone, address, note, payment_method, status, subtotal, shipping_fee, total, created_at, updated_at, coupon_code, coupon_type, coupon_value, discount_amt) FROM stdin;
50df8852-bfd7-41cd-a691-e316253b1691	HS-20260304-BQMSRF	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	delivered	320000	30000	350000	2026-03-04 23:43:52.11635+07	2026-03-05 14:40:25.257004+07	\N	\N	\N	0
08c24e22-756b-4524-b7b8-1fb9e4eae7a4	HS-20260304-OQFPP7	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	250000	30000	280000	2026-03-04 14:22:59.378491+07	2026-03-05 14:46:15.765774+07	\N	\N	\N	0
75cf73df-ec0d-4125-b5b3-42ff0029faed	HS-20260309-GBONRA	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	330000	30000	360000	2026-03-09 13:58:05.136752+07	2026-03-10 00:30:17.20251+07	\N	\N	\N	0
eea745d9-a5f0-426c-be1b-62badaf1ac99	HS-20260304-7EVHVM	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	185000	30000	215000	2026-03-04 15:13:35.772594+07	2026-03-10 00:30:20.863282+07	\N	\N	\N	0
a8c940f3-fddb-43d1-8e0b-f0edc36e9c87	HS-20260304-R6XQZQ	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	320000	30000	350000	2026-03-04 14:20:05.108344+07	2026-03-10 00:30:22.296313+07	\N	\N	\N	0
3cf368be-2f48-4c54-882a-ad197c73583d	HS-20260310-1KPNYH	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	3000000	30000	3030000	2026-03-11 02:01:53.205106+07	2026-03-11 02:09:12.63563+07	\N	\N	\N	0
1f348dab-acb8-44e1-86e7-0a228b1bd2d4	HS-20260312-MAZCKE	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	3000000	30000	3030000	2026-03-12 23:54:23.181783+07	2026-03-12 23:54:47.273452+07	\N	\N	\N	0
549d38ee-a8bf-464d-954f-399deecdeaae	HS-20260310-DHMI3G	dff1b7cb-133a-4d03-ac65-3de8eb83887e	Hồ Thiên Tỷ	tytybill123@gmail.com	0399623497	Cần Thơ	\N	cod	cancelled	4300000	30000	3900000	2026-03-11 02:10:06.183478+07	2026-03-12 23:54:48.742548+07	\N	\N	\N	0
5acf493c-8097-46e7-a28e-90610c77d368	HS-20260321-GZKYON	cb26f10c-c5d9-4c09-a38d-8c3d64da8014	Tỷ Hồ Thiên	httya23113@cusc.ctu.edu.vn	0399623497	Cần Thơ	\N	cod	confirmed	3460000	30000	3144000	2026-03-21 13:37:18.365805+07	2026-03-21 13:37:52.66401+07	HUYNHANHODO	percent	10	346000
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_images (id, product_id, image_url, "position", created_at) FROM stdin;
8f9ca647-4833-4738-ba59-2173e54d0533	33345168-1649-442c-889e-9553f6742881	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774117470/shop/images/pbvlvkqdb1mbm4ccdgdy.jpg	0	2026-03-21 18:58:10.817221+07
3c06ddd7-bf27-42dd-9ebe-fdcf4a7a0448	33345168-1649-442c-889e-9553f6742881	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774117183/shop/images/xu3vdwhzpxlzresggkvo.jpg	1	2026-03-21 18:58:10.826351+07
3979cfd4-52cc-4007-8117-1b0bb0005995	33345168-1649-442c-889e-9553f6742881	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774117473/shop/images/hmfvof2p8hljwspcinsw.jpg	2	2026-03-21 18:58:10.828058+07
f86c9e2d-8ef8-4323-a7c2-7b8dd3a13d5e	75eb7819-5dbe-4543-b834-92c40ef52bd4	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119920/shop/images/b9mtr5qrj3ertkpr3muv.jpg	0	2026-03-21 19:08:01.936656+07
691a56a9-4f2e-4277-9b35-af39621ebf2f	75eb7819-5dbe-4543-b834-92c40ef52bd4	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119925/shop/images/ggneqph4bmndwxl4zabn.jpg	1	2026-03-21 19:08:01.951576+07
31438b1a-a68c-426f-8194-7707f4c8c179	75eb7819-5dbe-4543-b834-92c40ef52bd4	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119922/shop/images/ymgjclj7phclw1r3cuiq.jpg	2	2026-03-21 19:08:01.952611+07
b21deb40-5795-49a3-a3cc-24f5e7a042db	98c4a189-22fc-42fc-8f4a-9041b51da647	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120611/shop/images/jims9bicephrtjo5usuq.jpg	0	2026-03-21 19:18:14.985952+07
9b0ec883-7d0a-44aa-8925-caa77a4be05d	98c4a189-22fc-42fc-8f4a-9041b51da647	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120614/shop/images/ykpxo3cgo54kgrgzhips.jpg	1	2026-03-21 19:18:14.987713+07
5458eaf8-2497-45e2-84e2-d904eee484b6	98c4a189-22fc-42fc-8f4a-9041b51da647	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120616/shop/images/lsngctd8pdpthr2wiwbq.jpg	2	2026-03-21 19:18:14.989595+07
79ff463a-1452-4b7a-b3c3-7bd98319733b	91ee6d33-be6c-4f1d-8f9a-4446d8d93e2e	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120974/shop/images/mohmimvpjczcpbfzb0tk.jpg	0	2026-03-21 19:22:56.018709+07
4d4da358-432a-42e0-b617-77d8a85e32f1	91ee6d33-be6c-4f1d-8f9a-4446d8d93e2e	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120975/shop/images/ax1uijdvzkkh2mtpfrpw.jpg	1	2026-03-21 19:22:56.019743+07
d2764d70-c84d-4c6e-b71a-64d550cf185f	91ee6d33-be6c-4f1d-8f9a-4446d8d93e2e	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120977/shop/images/bnasud8arsyjocqn0ugf.jpg	2	2026-03-21 19:22:56.020627+07
3b1bdf7f-200f-4d4c-8f7f-74e71e380d16	97dcfe37-f058-4ec7-b520-3bd78e4ef38b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121332/shop/images/bmkgau9l4mdj46rnsxmc.jpg	0	2026-03-21 19:30:05.997146+07
f6843c62-e354-4037-bdf9-c6d8467c1fca	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077690/shop/images/as53szznrzwhjzb1oeil.jpg	0	2026-03-18 19:50:23.41082+07
93ccb019-b5e1-4d53-9f0a-adddb1e2fe28	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077625/shop/images/h6tp1vy9u2thagmqaojj.jpg	1	2026-03-18 19:50:23.414765+07
a5b021ac-876f-46db-9fb6-ec2854fe30d5	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077703/shop/images/xgslpi82evskql1vipgy.jpg	2	2026-03-18 19:50:23.416994+07
e54905c5-a634-4802-8d8e-9ba4a89b3a90	eddf3359-ba70-4037-aecc-c656d135ccbe	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839333/shop/images/bo6ycij8hetlip0cd1e8.jpg	0	2026-03-18 20:11:32.163956+07
13beea95-5755-48c8-a481-4da6e3e96d4b	eddf3359-ba70-4037-aecc-c656d135ccbe	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839335/shop/images/drgyk9b6dlwqp3aoj9gd.jpg	1	2026-03-18 20:11:32.164881+07
84d648ca-020b-4a2f-a999-0f7088a24940	eddf3359-ba70-4037-aecc-c656d135ccbe	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839335/shop/images/uursum852ml6pvhelixj.jpg	2	2026-03-18 20:11:32.165661+07
432ec851-31f4-4e65-a29b-f11f6a169358	0bd547a9-db34-48f7-87dc-9075423ec14d	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034502/shop/images/zeqmbbbw1bqsaohryyk0.jpg	0	2026-03-21 17:51:43.481414+07
73b2a3fd-4d98-4172-a10a-ade26b6de7ad	0bd547a9-db34-48f7-87dc-9075423ec14d	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034514/shop/images/jntil86kngvkpw7mmxbv.jpg	1	2026-03-21 17:51:43.482471+07
1ab71db1-a34c-4491-adfb-d3097cc3494c	0bd547a9-db34-48f7-87dc-9075423ec14d	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034516/shop/images/fcm2hakyrc8hspw7g8nc.jpg	2	2026-03-21 17:51:43.484943+07
38b9cb0d-7a6e-48fd-82b3-f0541dd809f4	c3c9ba3f-1421-491e-9a84-4da29cbfd649	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117255/shop/images/vnl0vjfwsweavhf9h77k.jpg	0	2026-03-21 18:56:48.713713+07
efb59478-2926-4efd-bb03-5461ebcddd04	c3c9ba3f-1421-491e-9a84-4da29cbfd649	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117253/shop/images/npehvuo0pfs4frlfbki0.jpg	1	2026-03-21 18:56:48.715384+07
e9e77220-2afc-4bbe-9e97-00dc2d8c86cc	c3c9ba3f-1421-491e-9a84-4da29cbfd649	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117256/shop/images/jxemayt7x4xxbreh6pow.jpg	2	2026-03-21 18:56:48.717175+07
73b955b9-1314-40e8-b453-56a649826bb1	6dbcf767-610b-4a7c-8591-72e25d7e2bd4	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774115285/shop/images/msnyghsl1f3skfmm4oy7.jpg	0	2026-03-21 18:56:55.937037+07
2247dcd7-d861-4497-9e7b-5dbb7a316f67	6dbcf767-610b-4a7c-8591-72e25d7e2bd4	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774115286/shop/images/kv9hkleeygacstnzftkc.jpg	1	2026-03-21 18:56:55.937843+07
84559aff-32a6-45f0-902f-9d4b111ad6ea	6dbcf767-610b-4a7c-8591-72e25d7e2bd4	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774115288/shop/images/gv8v4ydmklr2jovftj5k.jpg	2	2026-03-21 18:56:55.93892+07
76d0dbf6-5876-4347-bcfa-874919710889	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511889/shop/images/b62o7y1imq9jmf7pumiq.jpg	0	2026-03-21 18:57:08.317562+07
f05d11fb-4d49-46b8-9c37-c2564958f4ae	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511890/shop/images/netlmpe5yxdx4vcywiy0.jpg	1	2026-03-21 18:57:08.318415+07
a2cdde04-5deb-4a44-b2c2-f57a25d43165	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511892/shop/images/kactv3b3lwdsr8dhvzxv.jpg	2	2026-03-21 18:57:08.319241+07
0f749a73-7e3f-4da1-9525-7ae002a0995e	fff5826e-27b2-44f4-a99e-bdd431388e4e	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079317/shop/images/rmucu8tcnfedsq1btw05.jpg	0	2026-03-21 18:57:17.527941+07
125f6ca9-31af-4c5f-8893-0fcd96e83992	fff5826e-27b2-44f4-a99e-bdd431388e4e	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079319/shop/images/tixicttpz9q4s8vfrxok.jpg	1	2026-03-21 18:57:17.528738+07
12159313-fa6f-4830-8bb3-c84b3b95de65	fff5826e-27b2-44f4-a99e-bdd431388e4e	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079320/shop/images/p2bohdcikxbfvepmou5h.jpg	2	2026-03-21 18:57:17.529718+07
d562f0bf-debb-4a32-a711-641b1223d2c5	97dcfe37-f058-4ec7-b520-3bd78e4ef38b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121332/shop/images/tp8qy9zkkdaum9k3iq4p.jpg	1	2026-03-21 19:30:05.998207+07
56e3fbcc-9d51-4bca-af1e-8074cef6673a	97dcfe37-f058-4ec7-b520-3bd78e4ef38b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121334/shop/images/qqqwt42spweculc3gmu3.jpg	2	2026-03-21 19:30:06.000232+07
ef3cde5b-fedc-4cb9-8bed-21dd9c036d29	de479978-d426-497b-a3be-6d292f119f73	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121988/shop/images/bwnb7dntyqfovmv1ux76.jpg	0	2026-03-21 19:41:15.680641+07
401cf421-0080-4cd1-bca4-6ed256e5d527	de479978-d426-497b-a3be-6d292f119f73	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121990/shop/images/u67bfn1oanhuhx3c1u2e.jpg	1	2026-03-21 19:41:15.681339+07
cbe47d12-4772-4791-956a-9cb0491465c6	de479978-d426-497b-a3be-6d292f119f73	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121995/shop/images/kbiy8n2ajxtxonhmmy6n.jpg	2	2026-03-21 19:41:15.682364+07
5e066dc9-7c38-4eb5-9746-e64f32c28e0c	5a0dd565-0e8a-4aed-b4d0-1a125790ac7f	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123071/shop/images/jydosdyplvvdzeop4rht.jpg	0	2026-03-21 20:00:16.760447+07
f8cc3a90-6155-4b89-90fb-dedf7e5b42bd	5a0dd565-0e8a-4aed-b4d0-1a125790ac7f	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123073/shop/images/zw3fncusvij3a1mxffhf.jpg	1	2026-03-21 20:00:16.761427+07
72b36068-c694-4343-bd70-cbbdd440acd6	5a0dd565-0e8a-4aed-b4d0-1a125790ac7f	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123075/shop/images/pgijsnxhqjrxz0nzjxpi.jpg	2	2026-03-21 20:00:16.762325+07
c6da8e59-7d8c-4163-894c-a6b29fe40b8e	c688e961-24df-4861-b76a-135b85927562	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119247/shop/images/b1pw4afcn6quddec16yc.jpg	0	2026-03-21 20:01:29.151359+07
dc508ae8-1d3a-4cac-bfe9-4e84083fdc2c	c688e961-24df-4861-b76a-135b85927562	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119250/shop/images/xg4ycun2huyimkau3sjz.jpg	1	2026-03-21 20:01:29.153132+07
1a3de698-cb3d-4060-84fd-c4ce9defe9b4	c688e961-24df-4861-b76a-135b85927562	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119251/shop/images/w7twzuuv3cdfea6e0jjm.jpg	2	2026-03-21 20:01:29.155094+07
a5a5e57c-b440-4426-826a-150955c972ef	469be3b3-4315-4809-96d6-5a59d6a62375	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118625/shop/images/qxnatfcmw0r1kvg5vydk.jpg	0	2026-03-21 20:02:48.586431+07
40021f03-4a55-4fad-9bd6-17daceb29153	469be3b3-4315-4809-96d6-5a59d6a62375	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118628/shop/images/phclczutgmaieelecxws.jpg	1	2026-03-21 20:02:48.589035+07
d84e67b4-cbf4-4733-89ac-4433924feebe	469be3b3-4315-4809-96d6-5a59d6a62375	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118632/shop/images/kdwwskvonx82o6n5c285.jpg	2	2026-03-21 20:02:48.590182+07
f261af09-4952-42b1-b040-ff8e79626918	4674fd21-0882-42b0-b25a-55bf2335347b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839141/shop/images/ododtwahxwfev61adwos.jpg	0	2026-03-21 20:03:05.464761+07
c7e7788a-e70d-42be-84ff-43ca0a6caf43	4674fd21-0882-42b0-b25a-55bf2335347b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839142/shop/images/jpfe3ugr2wwayjwvbogx.jpg	1	2026-03-21 20:03:05.465599+07
7ee16869-006a-428b-85a8-8a30a62b623c	4674fd21-0882-42b0-b25a-55bf2335347b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839143/shop/images/xwplj54hftvvewdb5lkq.jpg	2	2026-03-21 20:03:05.466459+07
2fcc3bcc-c12a-4a92-9eac-e309c60fe144	63ab5667-e6ce-4e04-92dc-44b06bd8a32b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123752/shop/images/uhwvwy1g59tfuantzfu4.jpg	0	2026-03-21 20:12:46.120573+07
9f743539-b74a-4ce7-a0da-66361f7952fe	63ab5667-e6ce-4e04-92dc-44b06bd8a32b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123754/shop/images/wddmjoxzpsgmobhpgkdz.jpg	1	2026-03-21 20:12:46.121422+07
898e1b72-1c0e-4ebc-a7ce-b0bc33c31fe6	63ab5667-e6ce-4e04-92dc-44b06bd8a32b	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123755/shop/images/pux2gpknvwirznc7p9pe.jpg	2	2026-03-21 20:12:46.122385+07
0da9ce8d-b27e-48f3-adcb-691bd62e21c7	7421d321-a105-4d80-ba22-c13084492cfe	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124138/shop/images/avjv85tkdhluhczhmkij.jpg	0	2026-03-21 20:17:25.168859+07
a9717026-1ce7-4ea1-aecc-a987f60768e2	7421d321-a105-4d80-ba22-c13084492cfe	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124140/shop/images/whlipmz0fgu9odhxxttl.jpg	1	2026-03-21 20:17:25.170074+07
ba5a5873-9e26-4f6c-9f0c-3e2e2dd7ed4a	7421d321-a105-4d80-ba22-c13084492cfe	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124142/shop/images/ec9eajq0lciflarrlmir.jpg	2	2026-03-21 20:17:25.170873+07
37fddfcd-f2f1-4452-a91c-82053d29e633	bc39764d-ec96-4378-9673-c6b7811765cc	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124470/shop/images/nnhq23e4scc0gbzesszj.jpg	0	2026-03-21 20:23:15.216037+07
743438a1-7a36-452e-b5ad-316f9a9b969c	bc39764d-ec96-4378-9673-c6b7811765cc	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124505/shop/images/pvvalgjbcffl45ch9qpi.jpg	1	2026-03-21 20:23:15.217159+07
ed9b1c60-ce2d-4fb4-ac2b-ea7d960dc6b6	bc39764d-ec96-4378-9673-c6b7811765cc	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124474/shop/images/ymtnj2bcbbrufh2obwd6.jpg	2	2026-03-21 20:23:15.218137+07
8a0ed3ff-a137-4a32-9a87-6c5866459a4f	eb72f505-7ad1-46e4-bf8b-c27169960129	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125041/shop/images/qqaw6blbo7aozbyokjlr.jpg	0	2026-03-21 20:32:37.117946+07
086cb066-1da1-40ab-8c1a-9a7a635c0d16	eb72f505-7ad1-46e4-bf8b-c27169960129	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125043/shop/images/rnbkjfzjntykunqplo5d.jpg	1	2026-03-21 20:32:37.118612+07
b96f0345-e192-4489-8158-f9e311fc5a0e	eb72f505-7ad1-46e4-bf8b-c27169960129	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125045/shop/images/e4b0m7rb8etbapzi9ezy.jpg	2	2026-03-21 20:32:37.119728+07
6e5c6f19-6553-4be9-bd28-6f7685e4920a	3f4fe669-59b1-413c-9f29-00029067ebce	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118094/shop/images/p50ntk8adzz4yhpjqaab.jpg	0	2026-03-21 20:34:56.936404+07
ac4fa576-7900-4c66-9d7e-cc9d7565dbc1	3f4fe669-59b1-413c-9f29-00029067ebce	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118092/shop/images/crrs394vdufagy03xhkj.jpg	1	2026-03-21 20:34:56.938472+07
8d5c3590-356d-4564-a8af-a95fed4c674d	7e57ad84-db34-4076-9517-2652da504dd2	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125438/shop/images/rxb7r33vyxnlzj4n6qvx.jpg	0	2026-03-21 20:39:00.739372+07
8d92e0fb-9cd1-44f7-9029-fcc1ae0d4774	7e57ad84-db34-4076-9517-2652da504dd2	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125441/shop/images/cdie1mketa6c0wfmzq1v.jpg	1	2026-03-21 20:39:00.740319+07
2e4b456a-11cf-4cff-962a-a652d0807a90	7e57ad84-db34-4076-9517-2652da504dd2	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125442/shop/images/uuqqs4ycnwhfnbiuhbbm.jpg	2	2026-03-21 20:39:00.741276+07
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_variants (id, product_id, ml, price, original_price, stock, is_default, created_at) FROM stdin;
0f76f5e0-bfc0-4154-8618-fee34785643b	63ab5667-e6ce-4e04-92dc-44b06bd8a32b	100	4500000	\N	1	t	2026-03-21 20:12:46.093034+07
6605e515-af08-46a3-ab87-6f9bee9459b5	6dbcf767-610b-4a7c-8591-72e25d7e2bd4	100	800000	\N	9	f	2026-03-21 17:48:47.050454+07
2d69e92c-7abb-448c-8164-c587d3c02ee3	7421d321-a105-4d80-ba22-c13084492cfe	100	3310000	\N	2	t	2026-03-21 20:17:25.162346+07
55a0e400-0d03-4604-9373-b8aa32eb5ca7	7421d321-a105-4d80-ba22-c13084492cfe	200	4620000	\N	1	f	2026-03-21 20:17:25.163488+07
b89b5c57-92e5-4bb5-87c4-7a04e32a098f	bc39764d-ec96-4378-9673-c6b7811765cc	125	3200000	\N	2	t	2026-03-21 20:23:15.209698+07
9c96564a-0d06-4c0e-9b89-5b43c6587444	bc39764d-ec96-4378-9673-c6b7811765cc	10	320000	\N	7	f	2026-03-21 20:23:15.210624+07
e2b872fe-9987-4ba9-972e-8fb8c409d95d	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	10	420000	\N	5	t	2026-03-15 01:12:15.957893+07
ef886d5a-a571-434e-85ca-1c109c81c2cc	eddf3359-ba70-4037-aecc-c656d135ccbe	10	310000	\N	7	t	2026-03-18 20:11:11.58212+07
e7d46d5f-45fc-4d62-ac12-4ca99b5db418	eddf3359-ba70-4037-aecc-c656d135ccbe	100	3420000	\N	4	f	2026-03-18 20:11:11.667661+07
9af7cc44-0d64-4ecc-a71b-d73012a3c8a0	eddf3359-ba70-4037-aecc-c656d135ccbe	200	4300000	\N	2	f	2026-03-18 20:11:11.673033+07
7b63b342-cd7d-44b4-a24d-8851d15d98ac	f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	100	3800000	\N	2	f	2026-03-15 01:12:15.952319+07
8b954543-1092-41dc-b200-c6f840acfef1	eb72f505-7ad1-46e4-bf8b-c27169960129	10	420000	\N	4	t	2026-03-21 20:32:23.396894+07
a45843b7-32e4-4aa3-8188-f8ef450bf1fa	eb72f505-7ad1-46e4-bf8b-c27169960129	100	3420000	\N	2	f	2026-03-21 20:32:23.392576+07
a8d52e41-092f-46a3-85bd-c4e8be2b0448	3f4fe669-59b1-413c-9f29-00029067ebce	100	13100000	\N	1	t	2026-03-21 18:36:22.27844+07
a76d95ba-d179-4753-8981-8eb40c4c8c0b	7e57ad84-db34-4076-9517-2652da504dd2	100	9570000	\N	1	t	2026-03-21 20:39:00.728718+07
968b738d-8281-4934-8d9e-c374cb0566d3	7e57ad84-db34-4076-9517-2652da504dd2	10	1160000	\N	3	f	2026-03-21 20:39:00.73012+07
1ed65e57-0355-4dae-b97c-9e1a31643568	fff5826e-27b2-44f4-a99e-bdd431388e4e	10	330000	\N	5	t	2026-03-10 01:02:50.581365+07
b87e2733-b41a-407a-ad75-2b67237bd482	0bd547a9-db34-48f7-87dc-9075423ec14d	10	330000	\N	5	t	2026-03-09 12:36:50.928178+07
affb738c-9e02-4c7d-9336-4a329ba3dfd2	fff5826e-27b2-44f4-a99e-bdd431388e4e	100	3000000	\N	4	f	2026-03-10 01:02:50.579874+07
ec531814-6606-42cb-8b7e-0465079565d9	0bd547a9-db34-48f7-87dc-9075423ec14d	100	3000000	\N	2	f	2026-03-09 12:36:50.924737+07
0377ab7b-44ee-4c06-83b2-aacc2ab2ee5d	33345168-1649-442c-889e-9553f6742881	10	430000	\N	1	t	2026-03-21 18:20:58.296927+07
0beadd1e-9f92-4b87-b7a5-2d7370e51770	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	10	380000	\N	4	t	2026-03-10 00:38:38.046498+07
fe626462-5474-49d4-9b4b-f85a5c5fe62c	33345168-1649-442c-889e-9553f6742881	100	4080000	\N	2	f	2026-03-21 18:20:58.288579+07
75609c36-1259-4438-9011-ee1c92dc7df2	75eb7819-5dbe-4543-b834-92c40ef52bd4	10	310000	\N	2	t	2026-03-21 19:08:01.928848+07
92690f68-481d-4d81-bb0c-fead8138d66c	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	100	2900000	\N	3	f	2026-03-10 00:38:38.053068+07
63efc817-21fb-4d18-aea7-8a801b5ec32a	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	125	3400000	\N	5	f	2026-03-10 00:38:38.050263+07
41322c6e-be80-458e-8e9c-b32598e4641c	75eb7819-5dbe-4543-b834-92c40ef52bd4	100	2530000	\N	2	f	2026-03-21 19:08:01.930871+07
be46c81c-b560-42b5-a3b1-1f69a34d44b8	1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	200	4300000	\N	2	f	2026-03-10 00:38:38.056736+07
ee834082-917e-4cb8-87e5-003ccb84de53	75eb7819-5dbe-4543-b834-92c40ef52bd4	150	3090000	\N	1	f	2026-03-21 19:08:01.93237+07
81bb44bd-04b0-4b8d-a4c9-7f68d3867386	98c4a189-22fc-42fc-8f4a-9041b51da647	100	4950000	\N	1	t	2026-03-21 19:18:14.978272+07
6841f64a-45ef-41b0-8c3d-df31e9c63679	98c4a189-22fc-42fc-8f4a-9041b51da647	150	6060000	\N	1	f	2026-03-21 19:18:14.979346+07
8fc8a1d7-611f-4671-a16c-5069d2969ddb	91ee6d33-be6c-4f1d-8f9a-4446d8d93e2e	100	4400000	\N	1	t	2026-03-21 19:22:56.004428+07
39e337ea-7d82-4c5f-8b39-2638bd4e3c22	c3c9ba3f-1421-491e-9a84-4da29cbfd649	100	3800000	\N	1	t	2026-03-10 11:34:47.091836+07
afed6f90-f6a7-47d3-9f7f-82423f63542b	6dbcf767-610b-4a7c-8591-72e25d7e2bd4	10	120000	\N	2	t	2026-03-21 17:48:47.040573+07
fdb27841-d4b3-44ee-a8ea-dcc087fff6a7	91ee6d33-be6c-4f1d-8f9a-4446d8d93e2e	10	500000	\N	2	f	2026-03-21 19:22:56.005756+07
645471be-56ab-40ea-bcf4-d4f6eab5f9a0	97dcfe37-f058-4ec7-b520-3bd78e4ef38b	100	8470000	\N	2	t	2026-03-21 19:30:05.987559+07
1905dd53-3080-45a5-abc0-e85df060d9a8	97dcfe37-f058-4ec7-b520-3bd78e4ef38b	10	720000	\N	3	f	2026-03-21 19:30:05.988799+07
316cf473-3d58-47d4-a9d9-d54668c790af	de479978-d426-497b-a3be-6d292f119f73	125	6610000	\N	1	t	2026-03-21 19:41:15.674921+07
06856b11-c8f6-4c8a-b5e6-d8376fc1600f	de479978-d426-497b-a3be-6d292f119f73	10	610000	\N	2	f	2026-03-21 19:41:15.675946+07
5e9b41d8-c655-46fa-a629-c079ac3f8b62	5a0dd565-0e8a-4aed-b4d0-1a125790ac7f	100	4800000	\N	1	t	2026-03-21 19:58:54.065743+07
0c282dea-cd7e-43ff-b4cb-12195863e245	c688e961-24df-4861-b76a-135b85927562	10	1320000	\N	2	t	2026-03-21 18:55:44.509861+07
764795ae-c8fa-4114-b5a6-13d056135b2e	c688e961-24df-4861-b76a-135b85927562	50	9570000	\N	1	f	2026-03-21 18:55:44.508644+07
0b06ee24-6f05-4143-881b-cc4cc883560d	469be3b3-4315-4809-96d6-5a59d6a62375	100	11560000	\N	3	t	2026-03-21 18:45:25.796885+07
2847ecbb-ab81-4223-9e71-ca32c15466b9	469be3b3-4315-4809-96d6-5a59d6a62375	200	18260000	\N	1	f	2026-03-21 18:45:25.798564+07
b67f9e3e-fe76-4243-b3a7-73beea12705f	4674fd21-0882-42b0-b25a-55bf2335347b	10	330000	\N	3	t	2026-03-18 20:05:35.748447+07
09aed9f7-34ec-4fe4-9615-e950f0cdd640	4674fd21-0882-42b0-b25a-55bf2335347b	100	3150000	\N	2	f	2026-03-18 20:05:35.756092+07
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, category_id, name, slug, price, original_price, image_url, images, badge, description, material, care, rating, review_count, in_stock, created_at, stock, brand, concentration, top_note, mid_note, base_note) FROM stdin;
c688e961-24df-4861-b76a-135b85927562	a47a4c76-737c-4249-90b6-51e42faa5ccb	Kilian Black Phantom Memento Mori	kilian-black-phantom-memento-mori	1320000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119244/shop/images/jx7tazdgtvxh5r6tv8h0.png	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119247/shop/images/b1pw4afcn6quddec16yc.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119250/shop/images/xg4ycun2huyimkau3sjz.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119251/shop/images/w7twzuuv3cdfea6e0jjm.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-21 18:55:44.493445+07	3	Kilian	Eau de Parfum	 Đường, Rượu Rum, Sô cô la đen	Cà phê, Đường thắng, Hạnh nhân	Gỗ đàn hương, Hoa vòi voi
75eb7819-5dbe-4543-b834-92c40ef52bd4	9038e7c9-b0e2-415b-b16c-90719c880b10	Azzaro The Most Wanted EDP Intense	azzaro-the-most-wanted-edp-intense	310000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119919/shop/images/v1qrpjtzfaunhmjjmz1l.png	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119920/shop/images/b9mtr5qrj3ertkpr3muv.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119925/shop/images/ggneqph4bmndwxl4zabn.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774119922/shop/images/ymgjclj7phclw1r3cuiq.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-21 19:08:01.923661+07	5	Azzaro	Eau de Parfum Intense	Nhục đậu khấu	Toffee	Gỗ hổ phách
98c4a189-22fc-42fc-8f4a-9041b51da647	ceec429d-0028-4891-a5e2-d7709620be82	Christian Dior Homme Intense	christian-dior-homme-intense	4950000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120608/shop/images/a9ywjjh78gogmbmzcsik.png	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120611/shop/images/jims9bicephrtjo5usuq.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120614/shop/images/ykpxo3cgo54kgrgzhips.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120616/shop/images/lsngctd8pdpthr2wiwbq.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-21 19:18:14.960784+07	2	Dior	Eau de Parfum Intense	Hoa diên vĩ, vani	Gỗ tuyết tùng, Hổ phách	Cỏ hương bài
91ee6d33-be6c-4f1d-8f9a-4446d8d93e2e	2f41fe09-7b06-41b0-b4c9-2d97c6aa793b	Valentino Uomo Born In Roma EDP Intense	valentino-uomo-born-in-roma-edp-intense	500000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120973/shop/images/xksrusiwqovttznkxihi.png	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120974/shop/images/mohmimvpjczcpbfzb0tk.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120975/shop/images/ax1uijdvzkkh2mtpfrpw.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774120977/shop/images/bnasud8arsyjocqn0ugf.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-21 19:22:56.000256+07	3	Valentino	Eau de Parfum Intense	Vani	Hoa Oải Hương	 Cỏ Vetiver
97dcfe37-f058-4ec7-b520-3bd78e4ef38b	debf6c45-7763-404b-b80c-f29cb716a972	Creed Aventus EDP	creed-aventus-edp	720000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121330/shop/images/hncu21mydokfgxo86vyn.png	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121332/shop/images/bmkgau9l4mdj46rnsxmc.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121332/shop/images/tp8qy9zkkdaum9k3iq4p.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121334/shop/images/qqqwt42spweculc3gmu3.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-21 19:30:05.982456+07	5	Creed	Eau de Parfum	Cam Bergamot, Quả dứa (quả thơm), Quả lý chua đen	Cây hoắc hương, Gỗ bulo, Hoa hồng	Hương Vani, Long diên hương, Rêu cây sồi, Xạ hương
de479978-d426-497b-a3be-6d292f119f73	816937ae-7d47-4ce2-88ac-9a26b36acf51	Parfums de Marly Althair EDP	parfums-de-marly-althair-edp	610000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121984/shop/images/ia0fpddzhmrovxyvw93q.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121988/shop/images/bwnb7dntyqfovmv1ux76.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121990/shop/images/u67bfn1oanhuhx3c1u2e.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774121995/shop/images/kbiy8n2ajxtxonhmmy6n.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-21 19:41:15.654912+07	3	Parfum de Marly	Eau de Parfum	Bạch đậu khấu, Cam Bergamot, Hoa cam, Hương quế	 Elemi, Vanilla	Gỗ Guaiac, Kẹo Praline, Xạ hương, Ambroxan
469be3b3-4315-4809-96d6-5a59d6a62375	be3831d8-c5d0-4bdd-95c2-0acd6f21e4b8	Louis Vuitton Imagination	louis-vuitton-imagination	11560000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118621/shop/images/xjvurog7izrmzcg3elwe.png	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118625/shop/images/qxnatfcmw0r1kvg5vydk.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118628/shop/images/phclczutgmaieelecxws.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118632/shop/images/kdwwskvonx82o6n5c285.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-21 18:45:25.792515+07	4	Louis  Vuitton 	Eau de Parfum	Cam Bergamot Calabria, Cam Sicilian, Citron	Gừng, Hoa Neroli Tunisia, Quế	Gỗ, Olibanum, Trà đen
5a0dd565-0e8a-4aed-b4d0-1a125790ac7f	2f41fe09-7b06-41b0-b4c9-2d97c6aa793b	Valentino Uomo Born in Roma Purple Melancholia	valentino-uomo-born-in-roma-purple-melancholia	4800000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123069/shop/images/ovvy2scmklfvavg3itr3.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123071/shop/images/jydosdyplvvdzeop4rht.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123073/shop/images/zw3fncusvij3a1mxffhf.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123075/shop/images/pgijsnxhqjrxz0nzjxpi.jpg}	Mới	\N	\N	\N	5.0	0	t	2026-03-21 19:58:54.060799+07	1	Valentino 	Eau de Toilette	Cardamom	Coconut, Lavender 	Amberwood
7421d321-a105-4d80-ba22-c13084492cfe	2aa623e5-2854-4cfd-a8c1-684d3ad7c014	Scandal Pour Homme Le Parfum Jean Paul Gaultier	scandal-pour-homme-le-parfum-jean-paul-gaultier	3310000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124135/shop/images/o8kt2cgzksalgmlog393.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124138/shop/images/avjv85tkdhluhczhmkij.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124140/shop/images/whlipmz0fgu9odhxxttl.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124142/shop/images/ec9eajq0lciflarrlmir.jpg}	\N	\N	\N	\N	5.0	0	t	2026-03-21 20:17:25.146188+07	3	Jean Paul Gaultier	Parfum	Geranium	Tonka Bean	Sandalwood
63ab5667-e6ce-4e04-92dc-44b06bd8a32b	2aa623e5-2854-4cfd-a8c1-684d3ad7c014	Scandal Pour Homme Absolu Jean Paul Gaultier	scandal-pour-homme-absolu-jean-paul-gaultier	4500000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123750/shop/images/epoogow1lgjk31jik6op.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123752/shop/images/uhwvwy1g59tfuantzfu4.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123754/shop/images/wddmjoxzpsgmobhpgkdz.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774123755/shop/images/pux2gpknvwirznc7p9pe.jpg}	Mới	\N	\N	\N	5.0	0	t	2026-03-21 20:12:46.078425+07	1	Jean Paul Gaultier	Parfum	Black Cherry, Bergamot Bergamot, Clary Sage,  Lemon	Patchouli, Lavender, Rum, Geranium, Spearmint	Tonka, Akigalawood, Vanilla
0bd547a9-db34-48f7-87dc-9075423ec14d	b368aad0-e461-4d43-821f-d663ffdc805e	Stronger With You Intensely	stronger-with-you-intensely	330000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034507/shop/images/zqb30amer0bdihsqcv1h.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034502/shop/images/zeqmbbbw1bqsaohryyk0.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034514/shop/images/jntil86kngvkpw7mmxbv.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773034516/shop/images/fcm2hakyrc8hspw7g8nc.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-09 12:36:50.915278+07	7	GIO ARMANI	Eau de Parfum	Hoa tím, Quả bách xù, Tiêu hồng	Cây xô thơm, Hoa Oải Hương, Kẹo bơ cứng, Quế	 Da lộn, Đậu Tonka, Gỗ hổ phách, Hương Va ni (Vanila)
fff5826e-27b2-44f4-a99e-bdd431388e4e	b368aad0-e461-4d43-821f-d663ffdc805e	Stronger With You Absolutely	stronger-with-you-absolutely	330000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079316/shop/images/x4yb6o4ikyuerfsqasvq.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079317/shop/images/rmucu8tcnfedsq1btw05.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079319/shop/images/tixicttpz9q4s8vfrxok.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773079320/shop/images/p2bohdcikxbfvepmou5h.jpg}	\N	\N	\N	\N	5.0	0	t	2026-03-10 01:02:50.573746+07	9	\N	\N	\N	\N	\N
1d9d6a16-6d0d-47c4-a4bf-5e5e428e9aef	2aa623e5-2854-4cfd-a8c1-684d3ad7c014	Le Male Le Parfum	le-male-le-parfum	380000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077618/shop/images/bdcrofqcxezcdnpqn9af.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077690/shop/images/as53szznrzwhjzb1oeil.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077625/shop/images/h6tp1vy9u2thagmqaojj.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773077703/shop/images/xgslpi82evskql1vipgy.jpg}	Nổi Bật	\N	\N	\N	5.0	1	t	2026-03-10 00:38:38.022835+07	14	Jean Paul Gaultier	Parfum	Bạch đậu khấu	 Hoa Oải Hương, Iris	Hương Gỗ., Oriental note, Vani
eddf3359-ba70-4037-aecc-c656d135ccbe	94268c17-53d7-49c1-9a79-7eb72da637f1	YSL Y EDP	ysl-y-edp	310000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839331/shop/images/nkvhqielhg70ixqchnar.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839333/shop/images/bo6ycij8hetlip0cd1e8.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839335/shop/images/drgyk9b6dlwqp3aoj9gd.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839335/shop/images/uursum852ml6pvhelixj.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-18 20:11:11.577609+07	12	Yves Saint Laurent	Eau de Parfum	 Cam Bergamot, Gừng, Quả táo xanh	Cây xô thơm, Hoa phong lữ, Quả Bách Xù	Đậu Tonka, Gỗ tuyết tùng
6dbcf767-610b-4a7c-8591-72e25d7e2bd4	5b836f34-acdb-4c2f-89ec-815a14890a36	Rayhaan Aquatica	rayhaan-aquatica	120000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774115157/shop/images/ijuwff9sj09xvynxqroi.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774115285/shop/images/msnyghsl1f3skfmm4oy7.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774115286/shop/images/kv9hkleeygacstnzftkc.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774115288/shop/images/gv8v4ydmklr2jovftj5k.jpg}	Mới	\N	\N	\N	5.0	0	t	2026-03-21 17:48:47.02517+07	11	Rayhaan Aquatica	\N	Cam Bergamot, Quả chanh, Quả Quýt, Sữa dừa	Đường mía, Hạt dâm bụt, Hoa Dành Dành, Hoa nhài	Cây hoắc hương, cỏ xạ hương, Đậu Tonka, Rượu Rum
c3c9ba3f-1421-491e-9a84-4da29cbfd649	b368aad0-e461-4d43-821f-d663ffdc805e	Stronger With You Powerfully	stronger-with-you-powerfully	3800000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117253/shop/images/zy1oay7y4pn6qkeqjjy1.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117255/shop/images/vnl0vjfwsweavhf9h77k.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117253/shop/images/npehvuo0pfs4frlfbki0.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773117256/shop/images/jxemayt7x4xxbreh6pow.jpg}	Mới	\N	\N	\N	5.0	1	t	2026-03-10 11:34:47.080805+07	1	Giorgio Armani	Eau de Parfum	\N	\N	\N
f7e3d9b2-abeb-4b41-96b4-7f6c41fd2f3c	b368aad0-e461-4d43-821f-d663ffdc805e	Stronger With You Parfum	stronger-with-you-parfum	420000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511886/shop/images/sgdakzyixe6jgdtoamey.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511889/shop/images/b62o7y1imq9jmf7pumiq.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511890/shop/images/netlmpe5yxdx4vcywiy0.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773511892/shop/images/kactv3b3lwdsr8dhvzxv.jpg}	\N	\N	\N	\N	5.0	0	t	2026-03-15 01:12:15.930553+07	7	\N	Parfum	Cam, hạt tiêu hồng	Cây xô thơm, Hoa Oải Hương	Hạt dẻ, Hương Va ni (Vanilla)
33345168-1649-442c-889e-9553f6742881	94268c17-53d7-49c1-9a79-7eb72da637f1	Yves Saint Laurent YSL MYSLF EDP	yves-saint-laurent-ysl-myslf-edp	430000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774117363/shop/images/rdfqf2diptwknxmcqm0f.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774117470/shop/images/pbvlvkqdb1mbm4ccdgdy.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774117183/shop/images/xu3vdwhzpxlzresggkvo.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774117473/shop/images/hmfvof2p8hljwspcinsw.jpg}	\N	\N	\N	\N	5.0	0	t	2026-03-21 18:20:58.275625+07	3	Yves Saint Laurent 	Eau de Parfum	Cam bergamot và cam bergamot vùng Calabria	Hoa cam Tunisia	\N
4674fd21-0882-42b0-b25a-55bf2335347b	dbab1420-a0b0-4606-ac6b-7711998b9c76	Hugo Boss Absolute	hugo-boss-absolute	330000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839138/shop/images/lzgnvfyocozbrxtjsrrx.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839141/shop/images/ododtwahxwfev61adwos.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839142/shop/images/jpfe3ugr2wwayjwvbogx.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1773839143/shop/images/xwplj54hftvvewdb5lkq.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-18 20:05:35.733454+07	5	Hugo Boss	Eau de Parfum	\N	\N	\N
3f4fe669-59b1-413c-9f29-00029067ebce	ee57dcd6-6eeb-421f-beee-91a8d344d2af	Ex Nihilo Blue Talisman Extrait De Parfum	ex-nihilo-blue-talisman-extrait-de-parfum	13100000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118089/shop/images/xk1omotsdtmu63eh0r9y.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118094/shop/images/p50ntk8adzz4yhpjqaab.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774118092/shop/images/crrs394vdufagy03xhkj.jpg}	Mới	\N	\N	\N	5.0	0	t	2026-03-21 18:36:22.267059+07	1	Ex Nihilo	Extrait de Parfum	Cam bergamote, lê	 Hoa nhài, Hoa nhài Sambac	Amberwood, Gỗ đàn hương, Hổ Phách Ambrofix, Hương Va ni (Vanilla), Musks (Xạ hương)
bc39764d-ec96-4378-9673-c6b7811765cc	2aa623e5-2854-4cfd-a8c1-684d3ad7c014	Le Beau Le Parfum Jean Paul Gaultier	le-beau-le-parfum-jean-paul-gaultier	320000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124468/shop/images/mhr3cjc67g7pehhrp8rj.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124470/shop/images/nnhq23e4scc0gbzesszj.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124505/shop/images/pvvalgjbcffl45ch9qpi.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774124474/shop/images/ymtnj2bcbbrufh2obwd6.jpg}	\N	\N	\N	\N	5.0	0	t	2026-03-21 20:23:15.206915+07	9	Jean Paul Gaultier	Eau de Parfum	Cây bách, Gừng, Mống mắt (Iris), Quả dứa (Thơm)	Hương gỗ, Quả Dừa	Đậu Tonka, Gỗ đàn hương, Hổ phách, Long diên hương
eb72f505-7ad1-46e4-bf8b-c27169960129	94268c17-53d7-49c1-9a79-7eb72da637f1	YSL Ice Cologne	ysl-ice-cologne	420000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125039/shop/images/adixhy7tt3lmcyp1t08w.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125041/shop/images/qqaw6blbo7aozbyokjlr.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125043/shop/images/rnbkjfzjntykunqplo5d.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125045/shop/images/e4b0m7rb8etbapzi9ezy.jpg}	Mới	\N	\N	\N	5.0	0	t	2026-03-21 20:32:23.2466+07	6	Yves Saint Laurent	Eau de Cologne	Mint, Ice	Mint, Mint Tea, Blue Sage	Patchouli, Ambroxan
7e57ad84-db34-4076-9517-2652da504dd2	ee57dcd6-6eeb-421f-beee-91a8d344d2af	Blue Talisman	blue-talisman	1160000	\N	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125436/shop/images/tofi6aejptsepugsnysy.jpg	{https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125438/shop/images/rxb7r33vyxnlzj4n6qvx.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125441/shop/images/cdie1mketa6c0wfmzq1v.jpg,https://res.cloudinary.com/dbhth7rqz/image/upload/v1774125442/shop/images/uuqqs4ycnwhfnbiuhbbm.jpg}	Nổi Bật	\N	\N	\N	5.0	0	t	2026-03-21 20:39:00.715025+07	4	Ex Nihilo	Eau de Parfum	Cam đắng, Gừng, lê, Quýt	Gỗ, Hoa cam	Gỗ tuyết tùng, Hổ Phách Ambrofix, Xạ hương
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
hero_slide_1_subtitle		2026-03-21 17:01:50.106128+07
hero_slide_1_title	Trãi Nghiệm Nước Hoa Cao Cấp	2026-03-21 17:01:50.106128+07
hero_slide_3_cta		2026-03-21 17:01:50.106128+07
brand_slide_4_img		2026-03-18 15:52:21.512392+07
hero_slide_2_subtitle		2026-03-21 17:01:50.106128+07
banner_subtitle	áp dụng từ 10/3 - 10/4	2026-03-21 17:01:50.106128+07
brand_section_title	Thương Hiệu	2026-03-21 17:01:50.106128+07
hero_slide_2_cta		2026-03-21 17:01:50.106128+07
brand_slide_2_thumbnail	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773831930/ulysse-pointcheval--j6LLsAehUo-unsplash_w2jo9u.jpg	2026-03-21 17:01:50.106128+07
hero_slide_2_href	/products	2026-03-21 17:01:50.106128+07
hero_slide_1_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774112345/shop/images/oak21pxxxoqklwvimzj9.jpg	2026-03-21 17:01:50.106128+07
hero_slide_1_href		2026-03-21 17:01:50.106128+07
banner_image_url	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774112210/shop/images/u7tjmibchhoiydezy1hz.jpg	2026-03-21 17:01:50.106128+07
banner_title	Sale Cực Sâu	2026-03-21 17:01:50.106128+07
brand_slide_6_img		2026-03-18 15:52:21.512392+07
hero_slide_2_title	Nhiều Loại Nước Hoa Và Mùi Thơm Độc Đáo	2026-03-21 17:01:50.106128+07
brand_slide_5_img		2026-03-18 15:52:21.512392+07
hero_slide_2_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774111389/shop/images/zrfqyirevpthgwf7xolj.jpg	2026-03-21 17:01:50.106128+07
hero_slide_3_subtitle		2026-03-21 17:01:50.106128+07
hero_slide_3_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1774112411/shop/images/wnphdtxbka2ch9wtnbgc.jpg	2026-03-21 17:01:50.106128+07
hero_slide_1_cta		2026-03-21 17:01:50.106128+07
hero_slide_3_title	Cam kết nước hoa chính hãng	2026-03-21 17:01:50.106128+07
banner_link	/products	2026-03-21 17:01:50.106128+07
brand_slide_1_thumbnail	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837799/shop/images/hmhg7awu1l6kpf485sjw.jpg	2026-03-21 17:01:50.106128+07
hero_slide_3_href		2026-03-21 17:01:50.106128+07
brand_slide_1_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837799/shop/images/hmhg7awu1l6kpf485sjw.jpg	2026-03-21 17:01:50.106128+07
brand_slide_3_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837665/shop/images/qvm5oagafwr9byguattq.jpg	2026-03-21 17:01:50.106128+07
social_facebook	https://www.facebook.com/deactivateyoursoul/	2026-03-10 01:30:58.828666+07
store_email	tytybill123@gmail.com	2026-03-10 01:30:58.828666+07
store_name	Handmade Haven	2026-03-10 01:30:58.828666+07
social_instagram		2026-03-10 01:30:58.828666+07
brand_slide_6_thumbnail		2026-03-18 15:52:21.512392+07
social_tiktok		2026-03-10 01:30:58.828666+07
store_phone	0399623947	2026-03-10 01:30:58.828666+07
store_address	Châu Đốc, An Giang	2026-03-10 01:30:58.828666+07
brand_slide_3_thumbnail	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773837665/shop/images/qvm5oagafwr9byguattq.jpg	2026-03-21 17:01:50.106128+07
brand_slide_2_img	https://res.cloudinary.com/dbhth7rqz/image/upload/v1773831930/ulysse-pointcheval--j6LLsAehUo-unsplash_w2jo9u.jpg	2026-03-21 17:01:50.106128+07
shop_font	Playfair Display	2026-03-21 17:01:50.106128+07
brand_slide_5_thumbnail		2026-03-18 15:52:21.512392+07
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, google_id, email, name, avatar_url, role, refresh_token, token_expires_at, last_login_at, created_at, updated_at, phone, address) FROM stdin;
dff1b7cb-133a-4d03-ac65-3de8eb83887e	103078503954791498680	tytybill123@gmail.com	Hồ Thiên Tỷ	https://lh3.googleusercontent.com/a/ACg8ocJZIEzmnwv_2LnyEwViDz4IINjRwywzRC40EpZpMZxKO5IeLM6H7g=s96-c	customer	\N	\N	2026-03-21 13:34:06.551172+07	2026-03-04 10:25:39.890684+07	2026-03-21 13:34:06.551172+07	0399623497	Cần Thơ
cb26f10c-c5d9-4c09-a38d-8c3d64da8014	102229733949668349478	httya23113@cusc.ctu.edu.vn	Tỷ Hồ Thiên	https://lh3.googleusercontent.com/a/ACg8ocIVohuWdNLF3ZASN1KMPB1HTU-vXNX_XUh5yJpHwBv9bti2ow=s96-c	customer	\N	\N	2026-03-21 13:34:16.169498+07	2026-03-21 13:33:40.770456+07	2026-03-21 13:34:16.169498+07	\N	\N
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

\unrestrict wtuxk8BTrZXf37mlHecy8jmPLtt1xCcyRnKOZxf1A5X64ErbDv8MQkFZGSSI1V7

