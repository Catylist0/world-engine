import { getCurrentDate } from "@/lib/db";

export async function GET(): Promise<Response> {
  try {
    const currentDate = await getCurrentDate();
    return Response.json({ date: currentDate });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
