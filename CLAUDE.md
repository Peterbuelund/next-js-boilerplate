# CRITICAL RULES - MUST FOLLOW

## RESPONSES
- Keep responses concise and to the point - unless the user asks otherwise

## CHANGE / EDIT MODE
- Never implement features yourself when possible - use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- After completing features, always run `pnpm check` (tsc + lint) and `pnpm build`

## DATABASE SCHEMA CHANGES
- Whenever you make changes to the database schema, ALWAYS run the drizzle generate and migrate commands
- NEVER run drizzle push!
