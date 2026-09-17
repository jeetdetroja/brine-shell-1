/* =========================================
   The four fulfillment stages an order moves through.
   Kept here as the one backend source of truth (admin route validates
   against this list). The frontend (account.html) renders the same
   four labels for the stepper UI — if you ever change these, update
   both places.
   ========================================= */
const STAGES = ['Order Placed', 'Dispatched', 'Shipped', 'Delivered'];

function stageIndex(status) {
  return STAGES.indexOf(status);
}

module.exports = { STAGES, stageIndex };
