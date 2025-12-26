import { useEffect, useState } from "react";
import "./App.css";

type HealthResponse = {
    ok: boolean;
    message: string;
};

export default function App() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/health")
            .then(async (res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return (await res.json()) as HealthResponse;
            })
            .then(setHealth)
            .catch((e) => setError(String(e?.message ?? e)));
    }, []);

    return (
        <div>
            <h1>VacationFavorites</h1>

            {error && <p>❌ {error}</p>}

            {!error && !health && <p>⏳ Checking server...</p>}

            {health && (
                <p>
                    ✅ Server says: <b>{health.message}</b>
                </p>
            )}
        </div>
    );
}
