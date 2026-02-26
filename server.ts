import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./src/db";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Admin credentials hash (SHA-256 of 'ipassword')
const ADMIN_HASH = "061206c14a6e733d987930335803470438e342758e525656565a055745575a65"; // Placeholder, will generate real one in code for correctness
// Correct hash for 'ipassword'
const REAL_ADMIN_HASH = crypto.createHash('sha256').update('ipassword').digest('hex');

// Simple in-memory session store
const sessions = new Set<string>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to check admin auth
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !sessions.has(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // --- Public Routes ---

  // Get slots (Public: Hides user details, only shows status)
  app.get("/api/slots", (req, res) => {
    try {
      const slots = db.prepare('SELECT id, date, time, group_name, CASE WHEN user_name IS NOT NULL THEN 1 ELSE 0 END as is_booked FROM slots ORDER BY date, time, group_name').all();
      res.json(slots);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch slots" });
    }
  });

  // Get specific booking by secret code (for User to manage their booking)
  app.post("/api/my-booking", (req, res) => {
    const { secretCode } = req.body;
    if (!secretCode) return res.status(400).json({ error: "Code required" });

    try {
      const slot = db.prepare('SELECT * FROM slots WHERE secret_code = ?').get(secretCode);
      if (!slot) return res.status(404).json({ error: "Booking not found" });
      res.json(slot);
    } catch (error) {
      res.status(500).json({ error: "Error fetching booking" });
    }
  });

  // Book a slot
  app.post("/api/book", (req, res) => {
    const { slotId, userName, secretCode } = req.body;
    
    if (!slotId || !userName || !userName.trim() || !secretCode || !secretCode.trim()) {
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      const info = db.prepare('UPDATE slots SET user_name = ?, secret_code = ? WHERE id = ? AND user_name IS NULL').run(userName, secretCode, slotId);
      
      if (info.changes === 0) {
        return res.status(409).json({ error: "Slot already booked" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to book slot" });
    }
  });

  // Move booking (User)
  app.post("/api/move", (req, res) => {
    const { oldSlotId, newSlotId, secretCode } = req.body;

    if (!oldSlotId || !newSlotId || !secretCode) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const dbTx = db.transaction(() => {
      // 1. Verify old slot ownership
      const oldSlot = db.prepare('SELECT * FROM slots WHERE id = ? AND secret_code = ?').get(oldSlotId, secretCode) as any;
      if (!oldSlot) throw new Error("Invalid booking or code");

      // 2. Verify new slot is free
      const newSlot = db.prepare('SELECT user_name FROM slots WHERE id = ?').get(newSlotId) as any;
      if (newSlot.user_name) throw new Error("Target slot is occupied");

      // 3. Update new slot
      db.prepare('UPDATE slots SET user_name = ?, secret_code = ? WHERE id = ?').run(oldSlot.user_name, secretCode, newSlotId);

      // 4. Clear old slot
      db.prepare('UPDATE slots SET user_name = NULL, secret_code = NULL WHERE id = ?').run(oldSlotId);
    });

    try {
      dbTx();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Move failed" });
    }
  });

  // --- Admin Routes ---

  app.post("/api/admin/login", (req, res) => {
    const { login, password } = req.body;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    
    // Hardcoded check: admin / ipassword
    if (login === 'admin' && hash === REAL_ADMIN_HASH) {
      const token = crypto.randomUUID();
      sessions.add(token);
      res.json({ token });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/admin/slots", requireAdmin, (req, res) => {
    try {
      const slots = db.prepare('SELECT * FROM slots ORDER BY date, time, group_name').all();
      res.json(slots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch slots" });
    }
  });

  app.post("/api/admin/cancel", requireAdmin, (req, res) => {
    const { slotId } = req.body;
    try {
      db.prepare('UPDATE slots SET user_name = NULL, secret_code = NULL WHERE id = ?').run(slotId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
