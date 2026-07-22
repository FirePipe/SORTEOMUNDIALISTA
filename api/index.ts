import { appPromise } from "../server";

export default async function handler(req: any, res: any) {
  try {
    const { app } = await appPromise;
    return app(req, res);
  } catch (err: any) {
    console.error("Error in Vercel API handler:", err);
    res.status(500).json({ error: "Internal Server Error", message: err?.message || String(err) });
  }
}
