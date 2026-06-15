/**
 * ContractIQ — Fix dashboard "average processing time" metric
 *
 * Problem:
 *   v_contract_summary computed avg_processing_days as
 *       AVG(EXTRACT(DAY FROM updated_at - created_at))
 *   Two bugs:
 *     1. EXTRACT(DAY FROM interval) returns only the *day component* of the
 *        interval, silently discarding anything measured in months/years and
 *        ignoring the hours/minutes portion entirely.
 *     2. It averaged over ALL contracts — including stale Drafts that are
 *        created then edited weeks later — which has nothing to do with how
 *        long a contract takes to *process* (created → signed).
 *   The result was a nonsensical ~1234 day average on a platform that
 *   advertises 5-minute contracts.
 *
 * Fix:
 *   Measure the true elapsed time from creation to signature, in fractional
 *   days, and only for contracts that actually reached the Signed state.
 */

BEGIN;

CREATE OR REPLACE VIEW v_contract_summary AS
SELECT
    COUNT(*)                                              as total_contracts,
    SUM(CASE WHEN status = 'Draft'    THEN 1 ELSE 0 END)  as draft_count,
    SUM(CASE WHEN status = 'Review'   THEN 1 ELSE 0 END)  as review_count,
    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END)  as approved_count,
    SUM(CASE WHEN status = 'Signed'   THEN 1 ELSE 0 END)  as signed_count,
    AVG(EXTRACT(EPOCH FROM (signed_at - created_at)) / 86400.0)
        FILTER (WHERE signed_at IS NOT NULL)              as avg_processing_days
FROM contracts;

COMMIT;
