import { useQuery } from "@tanstack/react-query";

export default function TestAPI() {
  const { data, isLoading, error } = useQuery<{ properties?: unknown[] }>({
    queryKey: ["/api/public/properties"],
    staleTime: 0,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="mb-4">
        <strong>Loading:</strong> {isLoading ? "YES" : "NO"}
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">
          <strong>Error:</strong> {String(error)}
        </div>
      )}
      
      <div className="mb-4">
        <strong>Raw Data:</strong>
        <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
      
      <div>
        <strong>Properties Count:</strong> {data?.properties?.length || 0}
      </div>
    </div>
  );
}
