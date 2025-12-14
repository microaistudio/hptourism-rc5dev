--
-- PostgreSQL database dump
--

\restrict lOOdhmhpLm7cs9H9QBfmlng8rgbsxvTafnMFCo7kiP2PV9JZ5kMzGHheRcIRlpe

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: lgd_blocks; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_blocks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    block_name character varying(100) NOT NULL,
    district_id character varying NOT NULL,
    tehsil_id character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_blocks OWNER TO hptourism_user;

--
-- Name: lgd_districts; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_districts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    district_name character varying(100) NOT NULL,
    division_name character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_districts OWNER TO hptourism_user;

--
-- Name: lgd_gram_panchayats; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_gram_panchayats (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    gram_panchayat_name character varying(100) NOT NULL,
    district_id character varying NOT NULL,
    block_id character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_gram_panchayats OWNER TO hptourism_user;

--
-- Name: lgd_tehsils; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_tehsils (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    tehsil_name character varying(100) NOT NULL,
    district_id character varying NOT NULL,
    tehsil_type character varying(50) DEFAULT 'tehsil'::character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_tehsils OWNER TO hptourism_user;

--
-- Name: lgd_urban_bodies; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_urban_bodies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    urban_body_name character varying(200) NOT NULL,
    district_id character varying NOT NULL,
    body_type character varying(50) NOT NULL,
    number_of_wards integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_urban_bodies OWNER TO hptourism_user;

--
-- Name: lgd_blocks lgd_blocks_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_blocks
    ADD CONSTRAINT lgd_blocks_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_blocks lgd_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_blocks
    ADD CONSTRAINT lgd_blocks_pkey PRIMARY KEY (id);


--
-- Name: lgd_districts lgd_districts_district_name_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_districts
    ADD CONSTRAINT lgd_districts_district_name_key UNIQUE (district_name);


--
-- Name: lgd_districts lgd_districts_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_districts
    ADD CONSTRAINT lgd_districts_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_districts lgd_districts_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_districts
    ADD CONSTRAINT lgd_districts_pkey PRIMARY KEY (id);


--
-- Name: lgd_gram_panchayats lgd_gram_panchayats_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_gram_panchayats
    ADD CONSTRAINT lgd_gram_panchayats_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_gram_panchayats lgd_gram_panchayats_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_gram_panchayats
    ADD CONSTRAINT lgd_gram_panchayats_pkey PRIMARY KEY (id);


--
-- Name: lgd_tehsils lgd_tehsils_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_tehsils
    ADD CONSTRAINT lgd_tehsils_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_tehsils lgd_tehsils_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_tehsils
    ADD CONSTRAINT lgd_tehsils_pkey PRIMARY KEY (id);


--
-- Name: lgd_urban_bodies lgd_urban_bodies_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_urban_bodies
    ADD CONSTRAINT lgd_urban_bodies_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_urban_bodies lgd_urban_bodies_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_urban_bodies
    ADD CONSTRAINT lgd_urban_bodies_pkey PRIMARY KEY (id);


--
-- Name: idx_lgd_blocks_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_blocks_district ON public.lgd_blocks USING btree (district_id);


--
-- Name: idx_lgd_blocks_tehsil; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_blocks_tehsil ON public.lgd_blocks USING btree (tehsil_id);


--
-- Name: idx_lgd_gps_block; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_gps_block ON public.lgd_gram_panchayats USING btree (block_id);


--
-- Name: idx_lgd_gps_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_gps_district ON public.lgd_gram_panchayats USING btree (district_id);


--
-- Name: idx_lgd_tehsils_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_tehsils_district ON public.lgd_tehsils USING btree (district_id);


--
-- Name: idx_lgd_urban_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_urban_district ON public.lgd_urban_bodies USING btree (district_id);


--
-- Name: lgd_blocks lgd_blocks_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_blocks
    ADD CONSTRAINT lgd_blocks_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.lgd_districts(id) ON DELETE CASCADE;


--
-- Name: lgd_blocks lgd_blocks_tehsil_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_blocks
    ADD CONSTRAINT lgd_blocks_tehsil_id_fkey FOREIGN KEY (tehsil_id) REFERENCES public.lgd_tehsils(id) ON DELETE SET NULL;


--
-- Name: lgd_gram_panchayats lgd_gram_panchayats_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_gram_panchayats
    ADD CONSTRAINT lgd_gram_panchayats_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.lgd_blocks(id) ON DELETE SET NULL;


--
-- Name: lgd_gram_panchayats lgd_gram_panchayats_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_gram_panchayats
    ADD CONSTRAINT lgd_gram_panchayats_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.lgd_districts(id) ON DELETE CASCADE;


--
-- Name: lgd_tehsils lgd_tehsils_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_tehsils
    ADD CONSTRAINT lgd_tehsils_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.lgd_districts(id) ON DELETE CASCADE;


--
-- Name: lgd_urban_bodies lgd_urban_bodies_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_urban_bodies
    ADD CONSTRAINT lgd_urban_bodies_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.lgd_districts(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict lOOdhmhpLm7cs9H9QBfmlng8rgbsxvTafnMFCo7kiP2PV9JZ5kMzGHheRcIRlpe

