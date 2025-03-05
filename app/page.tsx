"use client";

import { useEffect, useState } from "react";

export default function DatePage() {
  const [date, setDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDate() {
      try {
        const response = await fetch("/api/date");
        if (!response.ok) throw new Error("Failed to fetch date");
        
        const data = await response.json();
        setDate(new Date(data.date).toLocaleString("en-US", { timeZone: "UTC" }));
      } catch (err) {
        setError("Error fetching date. Check database connection.");
        console.error(err);
      }
    }

    fetchDate();
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Database Connection Test</h1>
      {date ? (
        <p><strong>Current Date from DB:</strong> {date}</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
