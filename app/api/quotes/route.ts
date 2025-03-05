import { getAllQuotes } from "@/lib/db";

export async function GET(): Promise<Response> {
  try {
    const quotes = await getAllQuotes();
    return Response.json({ quotes });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
