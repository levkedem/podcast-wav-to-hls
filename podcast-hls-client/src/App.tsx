import "./App.css";
import { PrimeReactProvider, PrimeReactContext } from "primereact/api";
import ConvertWavPage from "./pages/ConverWavPage";

function App() {
  return (
    <PrimeReactProvider>
      <PrimeReactContext.Consumer>
        {() => <ConvertWavPage />}
      </PrimeReactContext.Consumer>
    </PrimeReactProvider>
  );
}

export default App;
