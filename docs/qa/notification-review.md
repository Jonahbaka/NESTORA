# Notification Review

## Safe local capture

The local database QA captured thirteen labelled notification records:

1. New registration
2. Password reset
3. New enquiry
4. Agent reply
5. Inspection booking
6. Inspection rescheduling
7. Hotel reservation request
8. Listing approval
9. Verification decision
10. Team invitation
11. Availability reconfirmation
12. Listing expiration
13. Subscription assignment

All were stored with `delivery_status='captured'`; no external recipient was contacted.

## Delivery status

- In-app persistence: schema and local fixtures pass; user-facing notification center is not fully API-wired.
- Email: not configured. Environment placeholders exist, but there is no verified provider or captured inbox.
- WhatsApp: not configured. No delivery or webhook claim is made.
- SMS and push: not implemented.

Before pilot, configure a sandbox email provider, verify bounce and reset flows, add idempotent delivery jobs, and retain provider delivery events without exposing message secrets.
