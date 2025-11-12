import { createApp } from './app.js';
import { ENV } from './config/env.js';
import cors from 'cors';

const app = createApp();

/* --------------------------- ✅ Add CORS before routes --------------------------- */
const allowed = (process.env.FRONTEND_ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsMw = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // for curl/health
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // change to true only if you use cookies
});

app.use(corsMw);
app.options('*', corsMw);

/* --------------------------- ✅ Start server --------------------------- */
app.listen(ENV.PORT, () => {
  console.log(`[backend] listening on http://localhost:${ENV.PORT}`);
});
