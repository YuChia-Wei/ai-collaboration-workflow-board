# Illustrative contract and test boundaries: ../architecture-boundaries.md.
# Requires a selected local transaction covering stock, outbox and inbox completion.
Feature: Process a stock reservation message reliably
  Rule: Local business state and message bookkeeping complete together
    @MSG-TX-01
    Scenario: Commit a reservation and its outgoing intent
      Given item S1 has 10 available units
      And incoming message M1 requests reservation R1 for 3 units of S1
      When the consumer processes M1
      Then S1 has 7 available units in committed storage
      And one outgoing StockReserved intent for R1 is committed
      And successful processing of M1 is committed

    @MSG-TX-02
    Scenario: Roll back when outgoing intent cannot be stored
      Given item S1 has 10 available units and no reservation R1
      And incoming message M1 requests reservation R1 for 3 units of S1
      And storing the outgoing intent will fail before commit
      When M1 is processed
      Then processing reports a persistence failure
      And S1 still has 10 available units in committed storage
      And no reservation R1 or outgoing intent for R1 is committed
      And M1 is not marked as successfully processed

  Rule: A completed incoming message does not repeat its local effects
    @MSG-TX-03
    Scenario: Receive the same message after commit but before acknowledgement
      Given M1 already committed reservation R1 and one outgoing intent O1
      And S1 has 7 available units after that reservation
      And M1 is recorded as successfully processed within the deduplication window
      When M1 is delivered again to the same consumer
      Then S1 still has 7 available units
      And no additional reservation or outgoing intent is committed

  Rule: Retried dispatch preserves the outgoing message identity
    @MSG-TX-04
    Scenario: Retry after broker acceptance but before durable dispatch confirmation
      Given outgoing intent O1 is committed
      And the broker accepted O1 but its dispatch confirmation was not stored
      When the relay retries O1
      Then the retried message has the same message identifier O1
