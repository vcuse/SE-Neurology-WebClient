export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-3xl font-bold">Welcome to the Teleconferencing App</h1>
      <p className="mt-5">Please <a href="/login" className="text-blue-500 underline">Login</a> to continue.</p>
    </main>
  );
}