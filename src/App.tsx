import { FullscreenEditor } from "./components/FullscreenEditor";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <FullscreenEditor />
      </div>
    </ErrorBoundary>
  );
}

export default App;
