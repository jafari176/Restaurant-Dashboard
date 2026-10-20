-- ================================================
-- MIGRATION: Normalize phone numbers to 10 digits
-- ================================================
-- Phone numbers arrived in two formats depending on their source:
--   "+15148679786"  from Retell caller ID (E.164)
--   "5676467465"    typed/transcribed
-- handle_new_order() matches customers with `WHERE phone = NEW.phone_number`,
-- an exact string compare, so the same caller could produce a second customer
-- row and split their order history. The retell-webhook edge function now
-- writes bare 10-digit numbers; this aligns existing rows with that format.

-- ------------------------------------------------
-- 1. Normalizer: strip non-digits, drop leading country code 1.
--    Returns the input unchanged if it is not a 10/11-digit NANP number,
--    so junk and international rows are left for a human to look at.
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_phone(raw TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT;
BEGIN
  IF raw IS NULL THEN RETURN NULL; END IF;

  digits := regexp_replace(raw, '\D', '', 'g');

  IF length(digits) = 11 AND left(digits, 1) = '1' THEN
    digits := substring(digits FROM 2);
  END IF;

  IF length(digits) = 10 THEN
    RETURN digits;
  END IF;

  RETURN raw;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------
-- 2. Merge customers that are the same person under two phone formats.
--    Must run before the backfill: normalizing first would collide two rows
--    onto the same phone value. The oldest row wins, since its customer_id
--    is the one already on historical orders.
-- ------------------------------------------------
WITH normalized AS (
  SELECT customer_id, normalize_phone(phone) AS np, created_at
  FROM public.customers
),
survivors AS (
  SELECT DISTINCT ON (np) np, customer_id AS keep_id
  FROM normalized
  ORDER BY np, created_at ASC
),
merges AS (
  SELECT n.customer_id AS drop_id, s.keep_id
  FROM normalized n
  JOIN survivors s ON s.np = n.np
  WHERE n.customer_id <> s.keep_id
)
UPDATE public.orders o
SET customer_id = m.keep_id
FROM merges m
WHERE o.customer_id = m.drop_id;

-- Remove the now-orphaned duplicate rows. Stats on the surviving row are
-- recomputed below rather than summed, so no totals are lost.
WITH normalized AS (
  SELECT customer_id, normalize_phone(phone) AS np, created_at
  FROM public.customers
),
survivors AS (
  SELECT DISTINCT ON (np) np, customer_id AS keep_id
  FROM normalized
  ORDER BY np, created_at ASC
)
DELETE FROM public.customers c
USING normalized n
JOIN survivors s ON s.np = n.np
WHERE c.customer_id = n.customer_id
  AND n.customer_id <> s.keep_id;

-- ------------------------------------------------
-- 3. Backfill existing rows.
--    customers.phone is referenced by orders.phone_number only by value,
--    not by a foreign key, so the two updates are independent.
-- ------------------------------------------------
UPDATE public.customers
SET phone = normalize_phone(phone)
WHERE phone IS DISTINCT FROM normalize_phone(phone);

UPDATE public.orders
SET phone_number = normalize_phone(phone_number)
WHERE phone_number IS DISTINCT FROM normalize_phone(phone_number);

-- Recompute stats from the orders that actually reached 'received', so a
-- merge cannot double-count or lose a customer's history.
UPDATE public.customers c
SET no_of_orders = COALESCE(agg.cnt, 0),
    total_order_cost = COALESCE(agg.total, 0),
    last_order_date = agg.last_date
FROM (
  SELECT customer_id,
         count(*) AS cnt,
         sum(subtotal) AS total,
         max(COALESCE(received_at, new_order_at)) AS last_date
  FROM public.orders
  WHERE status = 'received'
  GROUP BY customer_id
) agg
WHERE c.customer_id = agg.customer_id;

-- ------------------------------------------------
-- 4. Normalize on the way in, so this cannot drift again.
--    BEFORE INSERT OR UPDATE, and named so it runs before trigger_new_order
--    (Postgres fires same-event triggers in alphabetical order, and
--    "trigger_a_normalize_phone" sorts before "trigger_new_order").
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_order_phone()
RETURNS TRIGGER AS $$
BEGIN
  NEW.phone_number := normalize_phone(NEW.phone_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_a_normalize_phone ON public.orders;

CREATE TRIGGER trigger_a_normalize_phone
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION normalize_order_phone();

CREATE OR REPLACE FUNCTION normalize_customer_phone()
RETURNS TRIGGER AS $$
BEGIN
  NEW.phone := normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_a_normalize_customer_phone ON public.customers;

CREATE TRIGGER trigger_a_normalize_customer_phone
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION normalize_customer_phone();

-- ------------------------------------------------
-- 5. Report what is left unnormalized (junk / international).
-- ------------------------------------------------
DO $$
DECLARE
  odd_count INTEGER;
BEGIN
  SELECT count(*) INTO odd_count
  FROM public.customers
  WHERE length(regexp_replace(phone, '\D', '', 'g')) <> 10;

  IF odd_count > 0 THEN
    RAISE NOTICE 'Phone normalization complete. % customer row(s) are not 10-digit NANP numbers and were left as-is.', odd_count;
  ELSE
    RAISE NOTICE 'Phone normalization complete. All customer phones are 10-digit.';
  END IF;
END $$;
