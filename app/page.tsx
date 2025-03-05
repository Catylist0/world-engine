"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

interface Quote {
  message_id: string;
  content: string; // stored as a single string with ";" separators
  author: string;
  quoted_by: string;
  quoted_at: string;
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

export default function DatePage() {
  const [date, setDate] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // 1) SWR for quotes
  const {
    data: quotesData,
    error: quotesError
  } = useSWR<{ quotes: Quote[] }>("/api/quotes", fetcher, {
    refreshInterval: 5000, // Poll every 5 seconds
  });

  // 2) Manual fetch for date (since that's rarely changed)
  useEffect(() => {
    async function fetchDate() {
      try {
        const response = await fetch("/api/date");
        if (!response.ok) throw new Error("Failed to fetch date");

        const data = await response.json();
        setDate(new Date(data.date).toLocaleString("en-US", { timeZone: "UTC" }));
      } catch (err) {
        setDateError("Error fetching date. Check database connection.");
        console.error(err);
      }
    }
    fetchDate();
  }, []);

  // 3) Render
  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Database Connection Test</h1>

      {/* Show Date or Errors */}
      {date ? (
        <p>
          <strong>Current Date from DB:</strong> {date}
        </p>
      ) : dateError ? (
        <p style={{ color: "red" }}>{dateError}</p>
      ) : (
        <p>Loading date...</p>
      )}

      <hr style={{ margin: "20px 0" }} />

      <h2>Quotes Table (Live Updating):</h2>
      {quotesError ? (
        <p style={{ color: "red" }}>Error: {quotesError.message}</p>
      ) : !quotesData ? (
        <p>Loading quotes...</p>
      ) : quotesData.quotes.length === 0 ? (
        <p>No quotes found.</p>
      ) : (
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
          {quotesData.quotes.map((quote, idx) => {
            const lines = quote.content.split(";");
            return (
              <div
                key={quote.message_id}
                style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}
              >
                <p><strong>Quote {idx + 1}:</strong></p>
                <ul>
                  {lines.map((line, index) => (
                    <li key={index}>&quot;{line}&quot;</li>
                  ))}
                </ul>
                <p>Author: {quote.author}</p>
                <p>Quoted By: {quote.quoted_by}</p>
                <p>Quoted At: {new Date(quote.quoted_at).toLocaleString()}</p>
                <p>Message ID: {quote.message_id}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
