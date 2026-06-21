Fix auto-CS escalation: retry counter redirects to human agent after 5 invalid inputs

- Added `retry_count` column to sessions table (increments on each invalid input)
- Added `_increment_retry()`, `_reset_retry()`, `_check_retry_escalation()` helpers
- After 5 consecutive invalid inputs (wrong airport code, empty name, etc.),
  creates a CS ticket and asks: 'Would you like me to connect you to a customer
  service agent? Please say yes or no.'
- If user says yes → routes to CS agent
- Retry counter resets when valid input is received
- Also fixed: session creation now happens before flight search (sid used
  before definition was a pre-existing bug)