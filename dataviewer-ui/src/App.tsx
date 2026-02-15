import { Button } from 'primereact/button';

function App() {
  return (
    <div className="min-h-screen grid place-items-center text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Hello world</h1>
        <Button label="Click me" severity="success" />
      </div>
    </div>
  )
}

export default App
