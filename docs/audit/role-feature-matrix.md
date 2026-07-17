# Role Feature Matrix

## Classification legend

- `IV`: Implemented and verified through deployed UI
- `IA`: Implemented but inaccessible
- `BO`: Implemented only in backend
- `SU`: Implemented only as static UI
- `MD`: Implemented only with mock data
- `GS`: Shared generic screen
- `PL`: Placeholder link
- `PI`: Partially implemented
- `NI`: Not implemented
- `BR`: Broken
- `UN`: Unknown

The codes are exact aliases for the classifications above. `GS` in professional columns usually means ordinary login exposed the shared customer page, not a role-specific capability.

## Customer

| Feature | Renter/buyer | Agent | Developer | Hotel | Agency | Platform admin |
| --- | --- | --- | --- | --- | --- | --- |
| Search | IV | GS | GS | GS | GS | GS |
| Save property | IV | GS | GS | GS | GS | GS |
| Saved collections | PI | GS | GS | GS | GS | GS |
| Messaging | MD | MD | MD | MD | MD | MD |
| Enquiry | PI | GS | GS | GS | GS | GS |
| Inspection booking | IV | GS | GS | GS | GS | GS |
| Hotel reservation | PI | GS | GS | GS | GS | GS |
| Notifications | MD | MD | MD | MD | MD | MD |
| Trips and bookings | IV | GS | GS | GS | GS | GS |
| Account settings | SU | GS | GS | GS | GS | GS |
| Security settings | PL | PL | PL | PL | PL | PL |
| Logout | BR | BR | BR | BR | BR | BR |

## Agent

| Feature | Renter/buyer | Agent | Developer | Hotel | Agency | Platform admin |
| --- | --- | --- | --- | --- | --- | --- |
| Agent dashboard | NI | SU | NI | NI | IA | IA |
| Agent profile editor | NI | NI | NI | NI | NI | NI |
| Listing creation | NI | SU | NI | NI | SU | SU |
| Listing editing | NI | NI | NI | NI | NI | NI |
| Photo upload | NI | NI | NI | NI | NI | NI |
| Video upload | NI | NI | NI | NI | NI | NI |
| 360-degree upload | NI | NI | NI | NI | NI | NI |
| Availability management | NI | NI | NI | NI | NI | NI |
| Lead inbox | NI | MD | NI | NI | MD | MD |
| Lead pipeline | NI | MD | NI | NI | MD | MD |
| Lead follow-up | NI | NI | NI | NI | NI | NI |
| Inspection management | NI | BO | NI | NI | BO | BO |
| Analytics | NI | MD | NI | NI | MD | MD |
| Marketing-material generation | NI | SU | NI | NI | SU | SU |
| PDF export | NI | PI | NI | NI | PI | PI |
| QR-code generation | NI | SU | NI | NI | SU | SU |

## Developer

| Feature | Renter/buyer | Agent | Developer | Hotel | Agency | Platform admin |
| --- | --- | --- | --- | --- | --- | --- |
| Developer dashboard | NI | NI | BR | NI | NI | IA |
| Development creation | NI | NI | BR | NI | NI | SU |
| Project editing | NI | NI | NI | NI | NI | NI |
| Phase creation | NI | NI | NI | NI | NI | NI |
| Block creation | NI | NI | BO | NI | NI | BO |
| Floor creation | NI | NI | NI | NI | NI | NI |
| Unit-type creation | NI | NI | BO | NI | NI | BO |
| Individual unit creation | NI | NI | BO | NI | NI | BO |
| Unit availability | NI | NI | BO | NI | NI | BO |
| Unit pricing | NI | NI | BO | NI | NI | BO |
| Payment plans | NI | NI | BO | NI | NI | BO |
| Construction updates | NI | NI | BO | NI | NI | BO |
| Developer leads | NI | NI | BO | NI | NI | BO |
| Agent allocation | NI | NI | NI | NI | NI | NI |
| Development brochures | NI | NI | SU | NI | NI | SU |

## Hotel

| Feature | Renter/buyer | Agent | Developer | Hotel | Agency | Platform admin |
| --- | --- | --- | --- | --- | --- | --- |
| Hotel dashboard | NI | NI | NI | SU | NI | IA |
| Hotel profile | NI | NI | NI | BO | NI | BO |
| Room-type creation | NI | NI | NI | BO | NI | BO |
| Individual room or unit creation | NI | NI | NI | BO | NI | BO |
| Availability calendar | NI | NI | NI | NI | NI | NI |
| Reservation inbox | NI | NI | NI | BO | NI | BO |
| Guest messaging | NI | NI | NI | BO | NI | BO |
| Pricing | NI | NI | NI | BO | NI | BO |
| Booking status | NI | NI | NI | BO | NI | BO |
| Check-in tools | NI | NI | NI | NI | NI | NI |
| Hotel analytics | NI | NI | NI | MD | NI | MD |
| Hotel marketing materials | NI | NI | NI | SU | NI | SU |

## Agency

| Feature | Renter/buyer | Agent | Developer | Hotel | Agency | Platform admin |
| --- | --- | --- | --- | --- | --- | --- |
| Agency dashboard | NI | NI | NI | NI | SU | IA |
| Team invitation | NI | NI | NI | NI | BO | BO |
| Team members | NI | NI | NI | NI | BO | BO |
| Roles and permissions | NI | NI | NI | NI | BO | BO |
| Shared inventory | NI | NI | NI | NI | BO | BO |
| Lead assignment | NI | NI | NI | NI | BO | BO |
| Lead routing | NI | NI | NI | NI | NI | NI |
| Branches | NI | NI | NI | NI | NI | NI |
| Team analytics | NI | NI | NI | NI | MD | MD |
| Marketing templates | NI | NI | NI | NI | SU | SU |

## Platform administration

| Feature | Renter/buyer | Agent | Developer | Hotel | Agency | Platform admin |
| --- | --- | --- | --- | --- | --- | --- |
| Admin dashboard | NI | NI | NI | NI | NI | SU |
| Agent review | NI | NI | NI | NI | NI | BO |
| Hotel review | NI | NI | NI | NI | NI | BO |
| Developer review | NI | NI | NI | NI | NI | BO |
| Listing approval | NI | NI | NI | NI | NI | BO |
| Listing rejection | NI | NI | NI | NI | NI | BO |
| Listing suspension | NI | NI | NI | NI | NI | BO |
| User suspension | NI | NI | NI | NI | NI | BO |
| Reinstatement | NI | NI | NI | NI | NI | BO |
| Report queue | NI | NI | NI | NI | NI | BO |
| Document review | NI | NI | NI | NI | NI | NI |
| Verification management | NI | NI | NI | NI | NI | BO |
| Audit logs | NI | NI | NI | NI | NI | BO |
| Subscription assignment | NI | NI | NI | NI | NI | BO |

## Interpretation notes

- `BO` means a table, seed record, or authorization helper exists. It does not mean a deployed endpoint or user workflow exists.
- `SU` means the screen renders but does not complete a durable operation.
- `MD` means constants or client-only state drive the presentation.
- Direct role routes are not evidence of correct role landing. Five non-customer accounts still land on `/my-nestora` after ordinary login.
