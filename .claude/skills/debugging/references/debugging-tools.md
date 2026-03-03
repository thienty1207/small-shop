# Debugging Tools

## Browser DevTools

### Console
```javascript
// Styled logging
console.log('%cImportant!', 'color: red; font-size: 20px; font-weight: bold;')

// Table format
console.table([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }])

// Grouping
console.group('User Flow')
console.log('Step 1: Login')
console.log('Step 2: Navigate')
console.groupEnd()

// Timing
console.time('fetch')
await fetch('/api/data')
console.timeEnd('fetch')  // fetch: 234ms

// Count calls
console.count('render')  // render: 1, render: 2, ...

// Stack trace
console.trace('How did I get here?')

// Assert (logs only when false)
console.assert(user !== null, 'User should exist at this point')
```

### Network Tab
```
Key things to check:
1. Status code (200, 401, 404, 500)
2. Request headers (Authorization, Content-Type)
3. Response body (actual data returned)
4. Timing (TTFB, content download)
5. Initiator (what triggered this request)
6. Filter: XHR, Fetch, WS, Doc
```

### Performance Tab
```
1. Record → perform the slow action → Stop
2. Look for:
   - Long tasks (>50ms) — yellow blocks
   - Layout shifts — purple blocks
   - JS execution — detailed flame chart
   - Frames dropped — indicates jank
3. Bottom-Up view: which functions took most time
```

## Node.js Debugging

### Built-in Inspector
```bash
# Start with debugger
node --inspect server.js

# Break on first line
node --inspect-brk server.js

# Then open chrome://inspect in Chrome
```

### VS Code Launch Config
```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["--run", "--reporter", "verbose"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Programmatic Breakpoints
```typescript
// Add in code — stops when debugger is attached
debugger

// Conditional logging
const DEBUG = process.env.DEBUG === 'true'
function debug(...args: unknown[]) {
  if (DEBUG) console.log('[DEBUG]', ...args)
}
```

## React DevTools

```
Components tab:
- Inspect component tree and props
- See which components re-rendered (highlight updates)
- Edit state and props in real-time

Profiler tab:
- Record → interact → Stop
- Flame chart: which components took longest
- "Why did this render?" — shows reason for each re-render
- Ranked chart: most expensive components first

Settings:
- ✅ Highlight updates when components render
- ✅ Record why each component rendered
```

## Structured Logging

```typescript
// Production-ready logging
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined
})

// Structured context
logger.info({ userId: user.id, action: 'login' }, 'User logged in')
logger.error({ err, requestId, path: req.url }, 'Request failed')
logger.warn({ remainingQuota: 5 }, 'Rate limit approaching')

// Request middleware
app.use((req, res, next) => {
  req.log = logger.child({ requestId: crypto.randomUUID() })
  req.log.info({ method: req.method, path: req.url }, 'Request started')
  next()
})
```

## Quick Reference

| Problem | Tool | What to Check |
|---------|------|---------------|
| API returns wrong data | Network tab | Response body, status |
| Component not rendering | React DevTools | Props, state, error boundary |
| Page is slow | Performance tab | Long tasks, re-renders |
| Memory increasing | Memory tab | Heap snapshots, detached DOM |
| Event not firing | Console + breakpoint | `debugger` in handler |
| CSS not applying | Elements tab | Computed styles, specificity |
| State is wrong | React DevTools | Component state, context |
